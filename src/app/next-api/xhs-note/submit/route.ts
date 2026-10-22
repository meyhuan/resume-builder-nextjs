import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { checkVipStatus } from '@/lib/api/vip-api'
import { fetchJavaWithLog, parseJsonWithLog } from '@/lib/api/fetch-with-log'
import { prisma } from '@/lib/prisma'
import { normalizeXhsRawText } from '@/lib/xhs-note/link-normalize'

export async function POST(req: Request): Promise<NextResponse> {
  const cookieStore = await cookies()
  const unionid = cookieStore.get('auth_uid')?.value
  if (!unionid) {
    return NextResponse.json({ status: 401, error: '请先登录后再提交审核' }, { status: 401 })
  }

  try {
    const vip = await checkVipStatus()
    let javaUserId = vip.javaUserId
    if (!javaUserId) {
      const user = await prisma.user.findFirst({
        where: { wxId: unionid },
        select: { javaUserId: true },
      })
      javaUserId = user?.javaUserId || undefined
    }

    if (!javaUserId) {
      return NextResponse.json({ status: 401, error: '无法识别用户账号，请重新登录' }, { status: 401 })
    }

    const input: unknown = await req.json().catch(() => null)
    const body = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {}
    const rawText = typeof body.rawText === 'string' ? body.rawText.trim() : ''
    const topicKey = typeof body.topicKey === 'string' ? body.topicKey.trim() : ''

    if (!rawText || rawText.length > 4000 || topicKey.length > 64) {
      return NextResponse.json({ status: 400, error: '请提供小红书笔记链接或分享文案' }, { status: 400 })
    }

    const normalizedText = normalizeXhsRawText(rawText)

    const response = await fetchJavaWithLog('/xhs-note/submit', {
      logPrefix: '[xhs-note/submit]',
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        userId: javaUserId,
        rawText: normalizedText,
        topicKey,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    })

    const data = await parseJsonWithLog<{ status?: number; result?: string; data?: unknown }>(
      response,
      '[xhs-note/submit]',
    )

    if (!response.ok || !data || data.status !== 100) {
      return NextResponse.json(
        { status: data?.status && data.status !== 100 ? data.status : 500, error: data?.result || '提交失败，请重试' },
        { status: 200 },
      )
    }

    return NextResponse.json({ status: 100, data: data.data })
  } catch (error) {
    console.error('[xhs-note/submit] request failed:', error)
    return NextResponse.json({ status: 500, error: '提交失败，请稍后重试' }, { status: 500 })
  }
}
