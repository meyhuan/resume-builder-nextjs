import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { fetchJavaWithLog, parseJsonWithLog } from '@/lib/api/fetch-with-log';

/**
 * GET /next-api/vip/info
 * Server-to-server: reads auth_uid cookie (now = unionid) → calls Java backend
 * /user/vip-info?unionid= → returns userId, VIP status, and plans.
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
        logPrefix: '[vip/info]',
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      }
    );
    if (!response.ok) {
      console.error('[vip/info] Java API error:', response.status);
      return NextResponse.json({ error: 'Backend error' }, { status: response.status });
    }
    const data = await parseJsonWithLog<{
      status?: number;
      result?: string;
      data?: { userId?: number; isVip?: boolean; vipStatus?: number; vipType?: string; vipExpireTime?: string; plans?: unknown[] };
    }>(response, '[vip/info]');
    // Java returns 200 OK with body.status=404 when user not found (legacy cvUserId case)
    if (data?.status === 404 || data?.result === '用户不存在') {
      return NextResponse.json({ error: 'RE_LOGIN', message: '登录信息已过期，请重新扫码登录' }, { status: 401 });
    }

    // Backfill javaUserId into Prisma User (fire-and-forget)
    const javaUserId: number | undefined = data?.data?.userId;
    if (javaUserId) {
      prisma.user.updateMany({
        where: { wxId: unionid },
        data: { javaUserId: String(javaUserId) },
      }).catch(() => undefined);
    }

    // Fetch web-specific pricing plans
    try {
      const configResponse = await fetchJavaWithLog('/api/vip/configs?source=web', {
        logPrefix: '[vip/info/configs]',
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      if (configResponse.ok) {
        const configData = await parseJsonWithLog<{ status?: number; data?: unknown[] }>(
          configResponse,
          '[vip/info/configs]'
        );
        if (configData.status === 100 && Array.isArray(configData.data) && data.data) {
          // Replace the default plans with web-specific plans
          data.data.plans = configData.data;
        }
      }
    } catch (configError) {
      console.error('[vip/info] Failed to fetch web configs:', configError);
      // Continue with default plans if fetching web configs fails
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('[vip/info] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
