import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { prisma } from '@/lib/prisma'
import { verifyMiniSign } from '@/lib/verify-mini-sign'
import { getJsonProviderOptions, getModel, AIConfigError } from '@/lib/ai/provider'
import { resolveThinkingMode } from '@/lib/ai/thinking-policy'
import type { ResumeData } from '@/entities/resume/resume-data'
import { normalizeResumeContent } from '@/entities/resume/normalize-resume-content'
import { XHS_CATEGORIES, XHS_TOPICS, XHS_PAIN_POINTS, findTopic } from '@/lib/xhs-note/topics'
import { redactResume } from '@/lib/xhs-note/redact'
import { buildXhsSystemPrompt, buildXhsUserPrompt } from '@/lib/xhs-note/prompt'
import { normalizeXhsPackage, validateXhsPackage } from '@/lib/xhs-note/validate'
import { pickPersona, pickLayoutVariant } from '@/lib/xhs-note/personas'

const DAILY_LIMIT = 10
const IS_UNLIMITED_ENV = process.env.NODE_ENV !== 'production'

function remainingFor(used: number): number | null {
  return IS_UNLIMITED_ENV ? null : Math.max(0, DAILY_LIMIT - used)
}

function startOfShanghaiDay(now = new Date()): Date {
  const shifted = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  shifted.setUTCHours(0, 0, 0, 0)
  return new Date(shifted.getTime() - 8 * 60 * 60 * 1000)
}

function readJsonObject(text: string): unknown {
  const trimmed = text.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim()
  return JSON.parse(trimmed)
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const wxId = String(body.wxId ?? '')
  const javaUserId = String(body.javaUserId ?? '').trim()
  const timestamp = Number(body.timestamp)
  const sign = String(body.sign ?? '')
  const signError = verifyMiniSign({ wxId, timestamp, sign })
  if (signError) {
    const status = signError === 'Timestamp expired' ? 403 : 403
    return NextResponse.json({ error: signError }, { status })
  }

  const user = await prisma.user.upsert({
    where: { wxId },
    update: javaUserId ? { javaUserId } : {},
    create: { wxId, name: `用户_${wxId}`, ...(javaUserId ? { javaUserId } : {}) },
  })

  const action = String(body.action ?? '')
  if (action === 'topics') {
    const used = await prisma.xhsNoteDraft.count({
      where: { userId: user.id, createdAt: { gte: startOfShanghaiDay() } },
    })

    let recommendedTopics: string[] = []
    try {
      const latestResume = await prisma.resume.findFirst({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
      })
      if (latestResume && latestResume.content && typeof latestResume.content === 'object' && !Array.isArray(latestResume.content)) {
        const parsed = normalizeResumeContent(latestResume.content as Partial<ResumeData>)
        recommendedTopics = redactResume(parsed).recommendedTopics || []
      }
    } catch {
      // Ignore recommendation failure
    }

    return NextResponse.json({
      categories: XHS_CATEGORIES,
      topics: XHS_TOPICS,
      painPoints: XHS_PAIN_POINTS,
      remaining: remainingFor(used),
      recommendedTopics,
    })
  }

  if (action === 'latestDraft') {
    const latest = await prisma.xhsNoteDraft.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })
    const used = await prisma.xhsNoteDraft.count({
      where: { userId: user.id, createdAt: { gte: startOfShanghaiDay() } },
    })
    return NextResponse.json({
      draft: latest
        ? { id: latest.id, resumeId: latest.resumeId, topic: latest.topic, output: latest.output, createdAt: latest.createdAt }
        : null,
      remaining: remainingFor(used),
    })
  }

  if (action !== 'generate') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  const resumeId = String(body.resumeId ?? '')
  const topicKey = String(body.topic ?? '')
  const userNote = typeof body.userNote === 'string' ? body.userNote.slice(0, 300) : ''
  if (!findTopic(topicKey)) return NextResponse.json({ error: '请选择笔记角度' }, { status: 400 })
  if (!resumeId) return NextResponse.json({ error: '请选择简历' }, { status: 400 })

  const used = await prisma.xhsNoteDraft.count({
    where: { userId: user.id, createdAt: { gte: startOfShanghaiDay() } },
  })
  if (!IS_UNLIMITED_ENV && used >= DAILY_LIMIT) {
    return NextResponse.json({ error: '今天已经生成较多笔记，明天可以继续生成', remaining: 0 }, { status: 429 })
  }

  const resume = await prisma.resume.findFirst({ where: { id: resumeId, userId: user.id } })
  if (!resume) return NextResponse.json({ error: '简历不存在' }, { status: 404 })

  const rawContent = resume.content
  if (!rawContent || typeof rawContent !== 'object' || Array.isArray(rawContent)) {
    return NextResponse.json({ error: '简历里能写的经历太少，请先补充一段再来' }, { status: 400 })
  }
  const content = normalizeResumeContent(rawContent as Partial<ResumeData>)
  const redacted = redactResume(content)
  if (!redacted.usable) {
    return NextResponse.json({ error: '简历里能写的经历太少，请先补充一段再来' }, { status: 400 })
  }

  const seed = `${user.id}-${resumeId}-${Date.now()}`
  const persona = pickPersona(seed)
  const layoutVariant = pickLayoutVariant(seed)

  try {
    const model = getModel(
      { provider: 'dashscope', model: '', apiKey: '', baseURL: '' },
      undefined,
      resolveThinkingMode('default'),
    )
    let lastError = '生成失败'
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const userPrompt = buildXhsUserPrompt(redacted.text, userNote, redacted.roleHint)
      const result = await generateText({
        model,
        system: buildXhsSystemPrompt(topicKey, persona),
        prompt: attempt === 0
          ? userPrompt
          : `${userPrompt}\n上次结果不合格：${lastError}。请重写并严格输出 JSON。`,
        providerOptions: getJsonProviderOptions({ provider: 'dashscope', model: '', apiKey: '', baseURL: '' }),
      })
      let parsed: unknown
      try {
        parsed = normalizeXhsPackage(readJsonObject(result.text), topicKey)
      } catch {
        lastError = '生成结果不是 JSON'
        continue
      }
      const problem = validateXhsPackage(parsed, topicKey)
      if (!problem) {
        const output = parsed as Record<string, unknown>
        const topic = findTopic(topicKey)
        if (topic?.visuals) {
          output.visuals = topic.visuals
        }
        output.layoutVariant = layoutVariant
        output.personaName = persona.name
        await prisma.xhsNoteDraft.create({
          data: { userId: user.id, resumeId, topic: topicKey, output: output as object },
        })
        return NextResponse.json({
          ...output,
          roleHint: redacted.roleHint || '',
          remaining: IS_UNLIMITED_ENV ? null : DAILY_LIMIT - used - 1,
        })
      }
      lastError = problem
    }
    return NextResponse.json({ error: '这次生成的内容不合格，请再试一次', detail: lastError }, { status: 422 })
  } catch (error) {
    if (error instanceof AIConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    console.error('[xhs-note] generate failed', error)
    return NextResponse.json({ error: '生成失败，请稍后再试' }, { status: 502 })
  }
}
