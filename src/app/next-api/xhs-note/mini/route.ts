import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { prisma } from '@/lib/prisma'
import { verifyMiniSign } from '@/lib/verify-mini-sign'
import { getJsonProviderOptions, getModel, AIConfigError } from '@/lib/ai/provider'
import { resolveThinkingMode } from '@/lib/ai/thinking-policy'
import type { ResumeData } from '@/entities/resume/resume-data'
import { normalizeResumeContent } from '@/entities/resume/normalize-resume-content'
import { getServerJavaApiBaseUrl } from '@/lib/java-api-base'
import { XHS_TOPICS, findTopic } from '@/lib/xhs-note/topics'
import { redactResume } from '@/lib/xhs-note/redact'
import { buildXhsSystemPrompt, buildXhsUserPrompt } from '@/lib/xhs-note/prompt'
import { ensurePassphrase, validateXhsPackage } from '@/lib/xhs-note/validate'

const DAILY_LIMIT = 5

function startOfShanghaiDay(now = new Date()): Date {
  const shifted = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  shifted.setUTCHours(0, 0, 0, 0)
  return new Date(shifted.getTime() - 8 * 60 * 60 * 1000)
}

function readJsonObject(text: string): unknown {
  const trimmed = text.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim()
  return JSON.parse(trimmed)
}

async function inviteCodeFor(javaUserId: string): Promise<string> {
  const response = await fetch(`${getServerJavaApiBaseUrl()}/invitation/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: Number(javaUserId) }),
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => null) as { data?: { code?: string } } | null
  const code = payload?.data?.code
  if (!response.ok || !code) {
    throw new Error('暂时取不到口令，请稍后再试')
  }
  return code
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const wxId = String(body.wxId ?? '')
  const timestamp = Number(body.timestamp)
  const sign = String(body.sign ?? '')
  const signError = verifyMiniSign({ wxId, timestamp, sign })
  if (signError) {
    const status = signError === 'Timestamp expired' ? 403 : 403
    return NextResponse.json({ error: signError }, { status })
  }

  const user = await prisma.user.upsert({
    where: { wxId },
    update: {},
    create: { wxId, name: `用户_${wxId}` },
  })

  const action = String(body.action ?? '')
  if (action === 'topics') {
    const used = await prisma.xhsNoteDraft.count({
      where: { userId: user.id, createdAt: { gte: startOfShanghaiDay() } },
    })
    return NextResponse.json({ topics: XHS_TOPICS, remaining: Math.max(0, DAILY_LIMIT - used) })
  }

  if (action !== 'generate') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  const resumeId = String(body.resumeId ?? '')
  const topicKey = String(body.topic ?? '')
  const userNote = typeof body.userNote === 'string' ? body.userNote.slice(0, 200) : ''
  const javaUserId = String(body.javaUserId ?? '')
  if (!findTopic(topicKey)) return NextResponse.json({ error: '请选择笔记角度' }, { status: 400 })
  if (!resumeId) return NextResponse.json({ error: '请选择简历' }, { status: 400 })
  if (!javaUserId) return NextResponse.json({ error: '缺少用户身份' }, { status: 400 })

  const used = await prisma.xhsNoteDraft.count({
    where: { userId: user.id, createdAt: { gte: startOfShanghaiDay() } },
  })
  if (used >= DAILY_LIMIT) {
    return NextResponse.json({ error: '今天的生成次数已用完', remaining: 0 }, { status: 429 })
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

  let code: string
  try {
    code = await inviteCodeFor(javaUserId)
  } catch (error) {
    const message = error instanceof Error ? error.message : '暂时取不到口令'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  try {
    const model = getModel(
      { provider: 'dashscope', model: '', apiKey: '', baseURL: '' },
      undefined,
      resolveThinkingMode('default'),
    )
    let lastError = '生成失败'
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const result = await generateText({
        model,
        system: buildXhsSystemPrompt(topicKey, code),
        prompt: attempt === 0
          ? buildXhsUserPrompt(redacted.text, userNote)
          : `${buildXhsUserPrompt(redacted.text, userNote)}\n上次结果不合格：${lastError}。请重写并严格输出 JSON。`,
        providerOptions: getJsonProviderOptions({ provider: 'dashscope', model: '', apiKey: '', baseURL: '' }),
      })
      let parsed: unknown
      try {
        parsed = ensurePassphrase(readJsonObject(result.text), code)
      } catch {
        lastError = '生成结果不是 JSON'
        continue
      }
      const problem = validateXhsPackage(parsed, code)
      if (!problem) {
        const output = parsed as Record<string, unknown>
        await prisma.xhsNoteDraft.create({
          data: { userId: user.id, resumeId, topic: topicKey, output: output as object },
        })
        return NextResponse.json({ ...output, inviteCode: code, remaining: DAILY_LIMIT - used - 1 })
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
