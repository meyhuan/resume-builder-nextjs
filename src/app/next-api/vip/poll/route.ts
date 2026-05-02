import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { fetchJavaWithLog, parseJsonWithLog } from '@/lib/api/fetch-with-log';

/**
 * GET /next-api/vip/poll
 * Lightweight server-to-server poll: reads auth_uid cookie (now = unionid) → calls Java backend
 * /user/vip-info?unionid= → returns only VIP status fields.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const cookieStore = await cookies();
    const unionid = cookieStore.get('auth_uid')?.value;
    if (!unionid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const response = await fetchJavaWithLog(
      `/user/vip-info?unionid=${encodeURIComponent(unionid)}`,
      {
        logPrefix: '[vip/poll]',
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      }
    );
    if (!response.ok) {
      console.error('[vip/poll] Java API error:', response.status);
      return NextResponse.json({ error: 'Backend error' }, { status: response.status });
    }
    const data = await parseJsonWithLog<{
      status?: number;
      result?: string;
      data?: { userId?: number; isVip?: boolean; vipStatus?: number; vipType?: string; vipExpireTime?: string };
    }>(response, '[vip/poll]');
    // Java returns 200 OK with body.status=404 when user not found (legacy cvUserId case)
    if (data?.status === 404 || data?.result === '用户不存在') {
      return NextResponse.json({ error: 'RE_LOGIN', message: '登录信息已过期，请重新扫码登录' }, { status: 401 });
    }
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('[vip/poll] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
