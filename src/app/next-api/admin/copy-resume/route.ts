import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

interface CopyResumeBody {
  adminPassword: string;
  resumeId: string;
  targetUserId: string;
}

/**
 * POST /next-api/admin/copy-resume
 * Copies a resume from the current authenticated user to a target user.
 * targetUserId accepts: Java tb_user.id (javaUserId), Prisma wxId, or Prisma id.
 * Body: { adminPassword, resumeId, targetUserId }
 */
export async function POST(req: Request): Promise<NextResponse> {
  const cookieStore = await cookies();
  const wxId = cookieStore.get('auth_uid')?.value;

  if (!wxId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: CopyResumeBody = await req.json();
  const { adminPassword, resumeId, targetUserId } = body;

  if (!ADMIN_PASSWORD || adminPassword !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid admin password' }, { status: 403 });
  }

  if (!resumeId || !targetUserId) {
    return NextResponse.json({ error: 'resumeId and targetUserId are required' }, { status: 400 });
  }

  const sourceResume = await prisma.resume.findUnique({
    where: { id: resumeId, user: { wxId } },
  });

  if (!sourceResume) {
    return NextResponse.json({ error: 'Source resume not found or does not belong to you' }, { status: 404 });
  }

  // Match by javaUserId (numeric), wxId, or Prisma id
  const targetUser = await prisma.user.findFirst({
    where: { OR: [{ javaUserId: targetUserId }, { wxId: targetUserId }, { id: targetUserId }] },
  });

  if (!targetUser) {
    return NextResponse.json({ error: 'Target user not found. Make sure the user has logged in to the website at least once.' }, { status: 404 });
  }

  const copied = await prisma.resume.create({
    data: {
      title: sourceResume.title,
      content: sourceResume.content as Prisma.InputJsonValue,
      template: sourceResume.template,
      thumbnail: sourceResume.thumbnail,
      userId: targetUser.id,
    },
  });

  return NextResponse.json({ success: true, resumeId: copied.id, targetUserId: targetUser.id });
}
