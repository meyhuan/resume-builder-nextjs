import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

/**
 * DELETE /next-api/auth/delete-account
 * Permanently deletes the current user's account and all associated resumes.
 */
export async function DELETE(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const wxId = cookieStore.get('auth_uid')?.value;

  if (!wxId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ wxId }, { id: wxId }] },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  await prisma.resume.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });

  cookieStore.delete('auth_uid');

  return NextResponse.json({ success: true });
}
