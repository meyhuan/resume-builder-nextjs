import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { fetchVipFromJava } from '@/lib/api/vip-api';
import { fetchJavaWithLog, parseJsonWithLog } from '@/lib/api/fetch-with-log';

interface JavaDeleteAccountResponse {
  status?: number;
  result?: string;
  data?: unknown;
}

async function resolveJavaUserId(wxId: string, savedJavaUserId?: string | null): Promise<string | null> {
  if (savedJavaUserId) return savedJavaUserId;
  const vipResult = await fetchVipFromJava(wxId, '[delete-account/vip-info]');
  if (!vipResult.ok) {
    if (vipResult.reLogin) return null;
    throw new Error(`Java vip-info HTTP ${vipResult.httpStatus}`);
  }
  const javaUserId = vipResult.data?.data?.userId;
  return javaUserId ? String(javaUserId) : null;
}

async function deleteJavaAccount(javaUserId: string): Promise<void> {
  const response = await fetchJavaWithLog('/user/deleteAccount', {
    logPrefix: '[delete-account/java]',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      uid: Number(javaUserId),
      confirmText: '确认注销',
    }),
  });

  if (!response.ok) {
    throw new Error(`Java deleteAccount HTTP ${response.status}`);
  }

  const data = await parseJsonWithLog<JavaDeleteAccountResponse>(response, '[delete-account/java]');
  if (data.status !== 100) {
    throw new Error(data.result || 'Java deleteAccount failed');
  }
}

/**
 * DELETE /next-api/auth/delete-account
 * Permanently deletes the current user's account across Java and Next.js.
 */
export async function DELETE(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const wxId = cookieStore.get('auth_uid')?.value;

  if (!wxId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ wxId }, { id: wxId }] },
    select: { id: true, wxId: true, javaUserId: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  try {
    const javaUserId = await resolveJavaUserId(user.wxId || wxId, user.javaUserId);
    if (javaUserId) {
      await deleteJavaAccount(javaUserId);
    }
  } catch (error) {
    console.error('[delete-account] Failed to delete Java account:', error);
    return NextResponse.json({ error: 'Failed to delete Java account' }, { status: 502 });
  }

  await prisma.$transaction([
    prisma.resume.deleteMany({ where: { userId: user.id } }),
    prisma.exportRecord.deleteMany({ where: { userId: user.id } }),
    prisma.userQuota.deleteMany({ where: { userId: user.id } }),
    prisma.resumeMigration.deleteMany({ where: { userId: user.id } }),
    prisma.feedback.updateMany({
      where: { userId: user.id },
      data: { userId: null },
    }),
    prisma.user.delete({ where: { id: user.id } }),
  ]);

  cookieStore.delete('auth_uid');

  return NextResponse.json({ success: true });
}
