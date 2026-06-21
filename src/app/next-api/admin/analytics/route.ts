import { NextRequest, NextResponse } from 'next/server';
import { getServerJavaApiBaseUrl } from '@/lib/java-api-base';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ANALYTICS_ADMIN_TOKEN = process.env.ANALYTICS_ADMIN_TOKEN || ADMIN_PASSWORD;

const ENDPOINTS: Record<string, string> = {
  overview: '/analytics/admin/overview',
  pay: '/analytics/admin/funnel/pay',
  export: '/analytics/admin/funnel/export',
  create: '/analytics/admin/funnel/create',
  errors: '/analytics/admin/errors',
  revenue: '/analytics/admin/revenue',
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => ({}));
  const adminPassword = typeof body.adminPassword === 'string' ? body.adminPassword : '';
  const type = typeof body.type === 'string' ? body.type : 'overview';
  const days = typeof body.days === 'number' || typeof body.days === 'string' ? String(body.days) : '7';
  const platform = typeof body.platform === 'string' ? body.platform : 'all';

  if (!ADMIN_PASSWORD || adminPassword !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid admin password' }, { status: 403 });
  }

  const endpoint = ENDPOINTS[type];
  if (!endpoint) {
    return NextResponse.json({ error: 'Invalid analytics type' }, { status: 400 });
  }

  const javaBase = getServerJavaApiBaseUrl();
  const url = new URL(`${javaBase}${endpoint}`);
  url.searchParams.set('days', days);
  if (platform && platform !== 'all') {
    url.searchParams.set('platform', platform);
  }

  const response = await fetch(url.toString(), {
    headers: ANALYTICS_ADMIN_TOKEN
      ? { 'X-Analytics-Admin-Token': ANALYTICS_ADMIN_TOKEN }
      : undefined,
    cache: 'no-store',
  });

  const data = await response.json().catch(() => null);
  return NextResponse.json(data ?? { error: 'Invalid analytics response' }, { status: response.status });
}
