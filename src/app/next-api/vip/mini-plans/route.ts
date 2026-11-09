import { NextResponse } from 'next/server'
import { fetchJavaWithLog, parseJsonWithLog } from '@/lib/api/fetch-with-log'

/** Public catalogue, using the same mini-program pricing as native checkout. */
export async function GET(): Promise<NextResponse> {
  try {
    const response = await fetchJavaWithLog('/api/vip/configs', {
      logPrefix: '[vip/mini-plans]', method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new Error('Membership catalogue unavailable')
    const body = await parseJsonWithLog<{ status?: number; data?: unknown[] }>(response, '[vip/mini-plans]')
    if (body.status !== 100 || !Array.isArray(body.data)) throw new Error('Invalid membership catalogue')
    return NextResponse.json({ data: { plans: body.data } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: '套餐加载失败，请重试' }, { status: 502 })
  }
}
