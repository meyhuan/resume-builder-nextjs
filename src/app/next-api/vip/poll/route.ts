import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { fetchVipFromJava } from '@/lib/api/vip-api'

/**
 * GET /next-api/vip/poll
 * Reads auth_uid cookie (unionid), calls Java /user/vip-info, and returns VIP status.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const cookieStore = await cookies()
    const unionid = cookieStore.get('auth_uid')?.value
    if (!unionid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vipResult = await fetchVipFromJava(unionid, '[vip/poll]')
    if (!vipResult.ok) {
      if (vipResult.reLogin) {
        cookieStore.delete('auth_uid')
        return NextResponse.json(
          { error: 'RE_LOGIN', message: '登录信息已过期，请重新扫码登录' },
          { status: 401 },
        )
      }
      return NextResponse.json({ error: 'Backend error' }, { status: vipResult.httpStatus })
    }

    return NextResponse.json(vipResult.data)
  } catch (error: unknown) {
    console.error('[vip/poll] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
