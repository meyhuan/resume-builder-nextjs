import { NextResponse } from 'next/server'
import { fetchJavaWithLog, parseJsonWithLog } from '@/lib/api/fetch-with-log'

/** Read the existing native single-export catalogue; no orders are created here. */
export async function GET(): Promise<NextResponse> {
  try {
    const response = await fetchJavaWithLog('/pay/virtual/products?scene=export', {
      logPrefix: '[vip/mini-export-product]', method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new Error('Export catalogue unavailable')
    const body = await parseJsonWithLog<{ status?: number; data?: unknown[] }>(response, '[vip/mini-export-product]')
    if (body.status !== 100 || !Array.isArray(body.data)) throw new Error('Invalid export catalogue')
    return NextResponse.json({ data: { products: body.data } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: '单次导出方案加载失败，请重试' }, { status: 502 })
  }
}
