import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { fetchJavaWithLog, parseJsonWithLog } from '@/lib/api/fetch-with-log';
import { peekQuota } from '@/lib/quota/quota-checker';

interface JavaResult<T> {
  readonly status?: number;
  readonly result?: string;
  readonly data?: T;
}

interface EntryStatusData {
  readonly ticket: string;
  readonly status: string;
  readonly expiresAt: string;
  readonly claimedAt?: string | null;
  readonly invitationCode: string;
  readonly freeExportCount?: number;
  readonly isVip?: boolean;
  readonly vipStatus?: number;
  readonly vipType?: number;
  readonly vipExpireTime?: string | null;
  readonly invitationStats?: unknown;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cookieStore = await cookies();
  const unionid = cookieStore.get('auth_uid')?.value || '';
  if (!unionid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ticket = req.nextUrl.searchParams.get('ticket') || '';
  if (!ticket) {
    return NextResponse.json({ error: 'Missing ticket' }, { status: 400 });
  }

  const response = await fetchJavaWithLog(
    `/invitation/pc-entry/status?ticket=${encodeURIComponent(ticket)}&unionid=${encodeURIComponent(unionid)}`,
    {
      logPrefix: '[invitation/status]',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    return NextResponse.json({ error: '查询邀请状态失败' }, { status: response.status });
  }

  const json = await parseJsonWithLog<JavaResult<EntryStatusData>>(response, '[invitation/status]');
  if (json.status !== 100 || !json.data) {
    return NextResponse.json({ error: json.result || '查询邀请状态失败' }, { status: 400 });
  }

  const pdfQuota = await peekQuota('pdf:export');
  return NextResponse.json({
    entry: json.data,
    pdfExport: {
      allowed: pdfQuota.allowed,
      isVip: pdfQuota.isVip,
      used: pdfQuota.used,
      limit: pdfQuota.isVip ? null : pdfQuota.limit,
      remaining: pdfQuota.isVip ? 'unlimited' : pdfQuota.remaining,
      message: pdfQuota.message,
    },
  });
}
