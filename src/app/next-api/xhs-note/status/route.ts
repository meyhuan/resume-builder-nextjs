import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { checkVipStatus } from '@/lib/api/vip-api'
import { fetchJavaWithLog, parseJsonWithLog } from '@/lib/api/fetch-with-log'
import { prisma } from '@/lib/prisma'

export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies()
  const unionid = cookieStore.get('auth_uid')?.value
  if (!unionid) {
    return NextResponse.json({ status: 401, error: '请先登录' }, { status: 401 })
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

    const response = await fetchJavaWithLog(`/xhs-note/status?userId=${encodeURIComponent(javaUserId)}`, {
      logPrefix: '[xhs-note/status]',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    })

    const data = await parseJsonWithLog<{ status?: number; result?: string; data?: unknown }>(
      response,
      '[xhs-note/status]',
    )

    if (!response.ok || !data || data.status !== 100) {
      return NextResponse.json(
        { status: data?.status && data.status !== 100 ? data.status : 500, error: data?.result || '获取状态失败' },
        { status: 200 },
      )
    }

    return NextResponse.json({ status: 100, data: data.data })
  } catch (error) {
    console.error('[xhs-note/status] request failed:', error)
    return NextResponse.json({ status: 500, error: '获取审核状态失败，请稍后重试' }, { status: 500 })
  }
}
