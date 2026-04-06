import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const JAVA_API_BASE = process.env.JAVA_API_BASE_URL || 'https://aijianli.cn/api';

/**
 * GET /next-api/vip/poll
 * Lightweight server-to-server poll: reads auth_uid cookie → calls Java backend
 * /cvstore/user/{cvUserId}/vip-status → returns only VIP status fields.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const cookieStore = await cookies();
    const cvUserId = cookieStore.get('auth_uid')?.value;
    if (!cvUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const response = await fetch(`${JAVA_API_BASE}/cvstore/user/${cvUserId}/vip-status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      console.error('[vip/poll] Java API error:', response.status);
      return NextResponse.json({ error: 'Backend error' }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('[vip/poll] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
