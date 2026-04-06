import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const JAVA_API_BASE = process.env.JAVA_API_BASE_URL || 'https://aijianli.cn/api';

/**
 * GET /next-api/vip/info
 * Server-to-server: reads auth_uid cookie → calls Java backend
 * /cvstore/user/{cvUserId}/vip-info → returns userId, VIP status, and plans.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const cookieStore = await cookies();
    const cvUserId = cookieStore.get('auth_uid')?.value;
    if (!cvUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const response = await fetch(`${JAVA_API_BASE}/cvstore/user/${cvUserId}/vip-info`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      console.error('[vip/info] Java API error:', response.status);
      return NextResponse.json({ error: 'Backend error' }, { status: response.status });
    }
    const data = await response.json();

    // Fetch web-specific pricing plans
    try {
      const configResponse = await fetch(`${JAVA_API_BASE}/api/vip/configs?source=web`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      if (configResponse.ok) {
        const configData = await configResponse.json();
        if (configData.status === 100 && Array.isArray(configData.data)) {
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
