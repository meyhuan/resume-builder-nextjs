import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { fetchJavaWithLog, parseJsonWithLog } from '@/lib/api/fetch-with-log';

interface JavaResult<T> {
  readonly status?: number;
  readonly result?: string;
  readonly data?: T;
}

interface MiniCodeData {
  readonly ticket: string;
  readonly status: string;
  readonly expiresAt: string;
  readonly invitationCode: string;
  readonly qrCodeBase64: string;
  readonly scene: string;
  readonly invitationStats?: unknown;
}

export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const unionid = cookieStore.get('auth_uid')?.value || '';
  if (!unionid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const response = await fetchJavaWithLog('/invitation/pc-entry/create', {
    logPrefix: '[invitation/mini-code]',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unionid }),
    cache: 'no-store',
  });

  if (!response.ok) {
    return NextResponse.json({ error: '创建邀请入口失败' }, { status: response.status });
  }

  const json = await parseJsonWithLog<JavaResult<MiniCodeData>>(response, '[invitation/mini-code]');
  if (json.status !== 100 || !json.data) {
    return NextResponse.json({ error: json.result || '创建邀请入口失败' }, { status: 400 });
  }

  return NextResponse.json({
    ...json.data,
    qrCodeDataUrl: `data:image/png;base64,${json.data.qrCodeBase64}`,
  });
}
