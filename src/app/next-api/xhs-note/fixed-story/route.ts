import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { generateText } from 'ai'
import { prisma } from '@/lib/prisma'
import { getJsonProviderOptions, getModel, AIConfigError } from '@/lib/ai/provider'
import { getDefaultModel } from '@/lib/ai/ai-runtime-config'
import { STORY_PACKS, featureForPack } from '@/lib/xhs-note/fixed-story'
import { STORY_REASONS } from '@/lib/xhs-note/story-template'
import { FIXED_STORY_SYSTEM_PROMPT, buildFixedStoryUserPrompt, validateFixedStoryOutput, redactContactInfo } from '@/lib/xhs-note/fixed-story-prompt'

export const runtime = 'nodejs'
export const maxDuration = 180
const config = { provider: 'dashscope', model: '', apiKey: '', baseURL: '' }
const inFlightRequests = new Set<string>()
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

export async function POST(req: Request) {
  const url = new URL(req.url)
  const origin = `${req.headers.get('x-forwarded-proto') || url.protocol.slice(0, -1)}://${req.headers.get('host') || url.host}`
  if (req.headers.get('origin') && req.headers.get('origin') !== origin) return json({ error: '请从当前网站发起请求。' }, 403)
  let body: Record<string, unknown>
  try {
    if (Number(req.headers.get('content-length')) > 8000) return json({ error: '请求内容过长。' }, 413)
    const text = await req.text()
    if (new TextEncoder().encode(text).length > 8000) return json({ error: '请求内容过长。' }, 413)
    const parsed: unknown = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return json({ error: '请求数据格式不正确。' }, 400)
    body = parsed as Record<string, unknown>
  } catch { return json({ error: '请求数据格式不正确。' }, 400) }

  const platform = body.platform === 'desktop' ? 'desktop' : 'mobile'
  const pack = STORY_PACKS.find(item => item.id === body.packId && item.platform === platform)
  if (!pack) return json({ error: '素材包不存在。' }, 400)
  const reason = typeof body.reason === 'string' ? body.reason : ''
  const feeling = typeof body.feeling === 'string' ? body.feeling : ''
  if (!STORY_REASONS.some(item => item.id === reason)) return json({ error: '请选择这次分享的心情。' }, 400)
  if (!featureForPack(pack).feelings.some(item => item.id === feeling)) return json({ error: '请选择使用感受。' }, 400)
  if (body.confirmed !== true) return json({ error: '请确认以上为真实使用感受。' }, 400)
  const localTest = body.localTest === true && process.env.NODE_ENV === 'development' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
  const authUid = (await cookies()).get('auth_uid')?.value
  if (!authUid && !localTest) return json({ error: '请先登录，再生成分享笔记。' }, 401)
  const lockKey = authUid || 'local-fixed-story-test'
  if (inFlightRequests.has(lockKey)) return json({ error: '上一篇文案还在生成中，请稍候。' }, 429)
  inFlightRequests.add(lockKey)
  try {
    const user = authUid ? await prisma.user.findUnique({ where: { wxId: authUid }, select: { id: true } }) : null
    if (!user && !localTest) return json({ error: '登录已失效，请重新登录。' }, 401)
    // Reserve attempts before paid calls, including failed generations. Serializable
    // isolation prevents concurrent workers from exceeding the daily quota.
    let attemptId: string | undefined
    if (user) {
      const day = new Date(Date.now() + 8 * 3600000)
      day.setUTCHours(0, 0, 0, 0)
      attemptId = await prisma.$transaction(async tx => {
        const used = await tx.xhsNoteDraft.count({ where: { userId: user.id, createdAt: { gte: new Date(day.getTime() - 8 * 3600000) } } })
        if (used >= 15) return undefined
        const attempt = await tx.xhsNoteDraft.create({ data: { userId: user.id, resumeId: '', topic: `fixed-story:${pack.id}`, output: { status: 'generating', platform, packId: pack.id } } })
        return attempt.id
      }, { isolationLevel: 'Serializable' })
      if (!attemptId) return json({ error: '今天的 15 次生成额度已用完，明天可以继续。' }, 429)
    }
    let userRole = typeof body.role === 'string' ? body.role : typeof body.userRole === 'string' ? body.userRole : ''
    if (!('role' in body) && !('userRole' in body) && user) {
      try {
        const resume = await prisma.resume.findFirst({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' }, select: { content: true } })
        const content = resume?.content as Record<string, unknown> | null
        const intention = content?.jobIntention as Record<string, unknown> | null
        if (typeof intention?.position === 'string') userRole = intention.position
      } catch { /* Role lookup is optional. */ }
    }
    try {
      const result = await generateText({
        model: getModel(config, undefined, 'disabled'), system: FIXED_STORY_SYSTEM_PROMPT,
        prompt: buildFixedStoryUserPrompt({ packId: pack.id, platform, reason, feeling, confirmed: true, extra: redactContactInfo(typeof body.extra === 'string' ? body.extra.slice(0, 150) : ''), userRole: redactContactInfo(userRole.trim().slice(0, 50)) }),
        providerOptions: getJsonProviderOptions(config), maxOutputTokens: 1800, maxRetries: 0,
        abortSignal: AbortSignal.any([req.signal, AbortSignal.timeout(60000)]),
      })
      const validated = validateFixedStoryOutput(JSON.parse(result.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '')))
      const generation = { provider: 'dashscope-ai', model: result.response?.modelId || getDefaultModel().name, generatedAt: new Date().toISOString() }
      if (attemptId) await prisma.xhsNoteDraft.update({ where: { id: attemptId }, data: { output: { ...validated, generation, platform, packId: pack.id, status: 'complete' } } })
      return json({ ...validated, isAiGenerated: true, generation })
    } catch (error) {
      console.warn('[fixed-story] generation failed:', error instanceof Error ? error.name : 'UnknownError')
      if (error instanceof AIConfigError) return json({ error: 'AI 服务暂不可用，请稍后重试。填写内容已保留。' }, 503)
      return json({ error: 'AI 生成失败，请稍后重试。填写内容和已有正文已保留。' }, 502)
    }
  } catch (error) {
    console.error('[fixed-story] request failed:', error instanceof Error ? error.name : 'UnknownError')
    return json({ error: '服务暂时繁忙，请稍后重试。填写内容已保留。' }, 503)
  } finally { inFlightRequests.delete(lockKey) }
}
