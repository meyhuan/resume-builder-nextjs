import { NextRequest, NextResponse } from 'next/server';
import { getServerJavaApiBaseUrl } from '@/lib/java-api-base';
import { prisma } from '@/lib/prisma';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ANALYTICS_ADMIN_TOKEN = process.env.ANALYTICS_ADMIN_TOKEN || ADMIN_PASSWORD;

const ENDPOINTS: Record<string, string> = {
  overview: '/analytics/admin/overview',
  pay: '/analytics/admin/funnel/pay',
  export: '/analytics/admin/funnel/export',
  create: '/analytics/admin/funnel/create',
  lifecycle: '/analytics/admin/funnel/lifecycle',
  errors: '/analytics/admin/errors',
  revenue: '/analytics/admin/revenue',
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => ({}));
  const adminPassword = typeof body.adminPassword === 'string' ? body.adminPassword : '';
  const type = typeof body.type === 'string' ? body.type : 'overview';
  const days = typeof body.days === 'number' || typeof body.days === 'string' ? String(body.days) : '7';
  const platform = typeof body.platform === 'string' ? body.platform : 'all';
  const clientType = typeof body.clientType === 'string' ? body.clientType : 'all';

  if (!ADMIN_PASSWORD || adminPassword !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid admin password' }, { status: 403 });
  }

  if (type === 'jobFit') {
    return NextResponse.json({ status: 100, data: await getJobFitAnalytics() });
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
  if (type === 'lifecycle' && clientType && clientType !== 'all') {
    url.searchParams.set('clientType', clientType);
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

async function getJobFitAnalytics(): Promise<Record<string, unknown>> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const tasks = await prisma.jobFitTask.findMany({
    where: { createdAt: { gte: since } },
    select: {
      status: true,
      stage: true,
      errorCode: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
      factGuardRejectCount: true,
    },
  });

  const buildWindow = (hours: number) => {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const rows = tasks.filter((task) => task.createdAt.getTime() >= cutoff);
    const completed = rows.filter((task) => task.status === 'COMPLETED');
    const failed = rows.filter((task) => task.status === 'FAILED');
    const cancelled = rows.filter((task) => task.status === 'CANCELLED');
    const terminal = completed.length + failed.length + cancelled.length;
    const durations = completed.flatMap((task) => task.startedAt && task.completedAt
      ? [task.completedAt.getTime() - task.startedAt.getTime()]
      : []).sort((a, b) => a - b);
    return {
      total: rows.length,
      completed: completed.length,
      failed: failed.length,
      cancelled: cancelled.length,
      successRate: terminal ? completed.length / terminal : 0,
      cancelRate: terminal ? cancelled.length / terminal : 0,
      p50Ms: percentile(durations, 0.5),
      p90Ms: percentile(durations, 0.9),
      factGuardRejectCount: rows.reduce((sum, task) => sum + task.factGuardRejectCount, 0),
    };
  };

  return {
    generatedAt: new Date().toISOString(),
    windows: { h24: buildWindow(24), d7: buildWindow(24 * 7) },
    failureStages: groupCounts(tasks.filter((task) => task.status === 'FAILED').map((task) => task.stage)),
    errorCodes: groupCounts(tasks.filter((task) => task.status === 'FAILED').map((task) => task.errorCode || 'UNKNOWN')),
  };
}

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) return 0;
  return values[Math.min(values.length - 1, Math.ceil(values.length * ratio) - 1)] ?? 0;
}

function groupCounts(values: string[]): Array<{ key: string; count: number }> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}
