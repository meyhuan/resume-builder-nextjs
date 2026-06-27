import { NextResponse } from 'next/server';
import { Prisma, type Resume, type User } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { getServerJavaApiBaseUrl } from '@/lib/java-api-base';
import type { ResumeData } from '@/entities/resume/resume-data';
import { normalizeResumeContent } from '@/entities/resume/normalize-resume-content';
import {
  assertCanCreateResumeForUserId,
  isResumeLimitExceededError,
  MAX_RESUME_COUNT,
  RESUME_LIMIT_EXCEEDED_CODE,
  RESUME_LIMIT_EXCEEDED_MESSAGE,
} from '@/lib/resume-limits';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

interface CopyResumeBody {
  adminPassword: string;
  resumeId: string;
  targetUserId?: string;
  sourceUserId?: string;
  sourceWxId?: string;
  direction?: 'to-user' | 'to-current';
}

function getAdminPassword(req: Request): string {
  return req.headers.get('X-Admin-Password') || '';
}

async function verifyAdminPassword(password: string): Promise<boolean> {
  if (!password) return false;
  if (ADMIN_PASSWORD && password === ADMIN_PASSWORD) return true;

  try {
    const res = await fetch(`${getServerJavaApiBaseUrl()}/admin/verify-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) return false;
    const json = await res.json() as { status?: number };
    return json.status === 100;
  } catch {
    return false;
  }
}

async function resolveUserByIdentifiers(identifiers: readonly (string | null | undefined)[]): Promise<User | null> {
  const ids = [...new Set(identifiers.map((id) => id?.trim()).filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return null;
  return prisma.user.findFirst({
    where: {
      OR: ids.flatMap((id) => [{ javaUserId: id }, { wxId: id }, { id }]),
    },
  });
}

async function resolveUser(identifier: string): Promise<User | null> {
  return resolveUserByIdentifiers([identifier]);
}

async function resolveCurrentUser(wxId: string): Promise<User> {
  return prisma.user.upsert({
    where: { wxId },
    update: {},
    create: { wxId },
  });
}

/**
 * GET /next-api/admin/copy-resume?userId=...
 * Lists resumes owned by any user for admin copy workflows.
 * userId accepts: Java tb_user.id (javaUserId), Prisma wxId, or Prisma id.
 */
export async function GET(req: Request): Promise<NextResponse> {
  const cookieStore = await cookies();
  const wxId = cookieStore.get('auth_uid')?.value;

  if (!wxId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminPassword = getAdminPassword(req);
  if (!await verifyAdminPassword(adminPassword)) {
    return NextResponse.json({ error: 'Invalid admin password' }, { status: 403 });
  }

  const url = new URL(req.url);
  const userId = url.searchParams.get('userId')?.trim();
  const wxIdParam = url.searchParams.get('wxId')?.trim();
  if (!userId && !wxIdParam) {
    return NextResponse.json({ error: 'userId or wxId is required' }, { status: 400 });
  }

  const user = await resolveUserByIdentifiers([userId, wxIdParam]);
  if (!user) {
    return NextResponse.json({ error: 'User not found. Make sure the user has logged in to the website at least once.' }, { status: 404 });
  }

  const resumes = await prisma.resume.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      template: true,
      thumbnail: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    userId: user.id,
    user: {
      id: user.id,
      wxId: user.wxId,
      javaUserId: user.javaUserId,
      name: user.name,
    },
    resumes,
  });
}

/**
 * POST /next-api/admin/copy-resume
 * Copies a resume between accounts.
 * Default direction copies from the current authenticated user to a target user.
 * direction='to-current' copies from sourceUserId to the current authenticated user.
 * sourceUserId/targetUserId accept: Java tb_user.id (javaUserId), Prisma wxId, or Prisma id.
 * Body: { adminPassword, resumeId, targetUserId?, sourceUserId?, direction? }
 */
export async function POST(req: Request): Promise<NextResponse> {
  const cookieStore = await cookies();
  const wxId = cookieStore.get('auth_uid')?.value;

  if (!wxId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: CopyResumeBody = await req.json();
  const { adminPassword, resumeId, targetUserId, sourceUserId, sourceWxId, direction = 'to-user' } = body;

  if (!await verifyAdminPassword(adminPassword)) {
    return NextResponse.json({ error: 'Invalid admin password' }, { status: 403 });
  }

  if (!resumeId) {
    return NextResponse.json({ error: 'resumeId is required' }, { status: 400 });
  }
  if (direction !== 'to-user' && direction !== 'to-current') {
    return NextResponse.json({ error: 'Invalid copy direction' }, { status: 400 });
  }

  const currentUser = await resolveCurrentUser(wxId);
  let sourceResume: Resume | null = null;
  let targetUser: User | null = null;

  if (direction === 'to-current') {
    if (!sourceUserId && !sourceWxId) {
      return NextResponse.json({ error: 'sourceUserId or sourceWxId is required when copying to current user' }, { status: 400 });
    }
    const sourceUser = await resolveUserByIdentifiers([sourceUserId, sourceWxId]);
    if (!sourceUser) {
      return NextResponse.json({ error: 'Source user not found. Make sure the user has logged in to the website at least once.' }, { status: 404 });
    }
    sourceResume = await prisma.resume.findFirst({
      where: { id: resumeId, userId: sourceUser.id },
    });
    targetUser = currentUser;
  } else {
    if (!targetUserId) {
      return NextResponse.json({ error: 'targetUserId is required when copying to another user' }, { status: 400 });
    }
    sourceResume = await prisma.resume.findFirst({
      where: { id: resumeId, userId: currentUser.id },
    });
    targetUser = await resolveUser(targetUserId);
    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found. Make sure the user has logged in to the website at least once.' }, { status: 404 });
    }
  }

  if (!sourceResume) {
    return NextResponse.json({ error: 'Source resume not found or does not belong to the selected source user' }, { status: 404 });
  }

  try {
    await assertCanCreateResumeForUserId(targetUser.id);
  } catch (error) {
    if (isResumeLimitExceededError(error)) {
      return NextResponse.json(
        {
          error: RESUME_LIMIT_EXCEEDED_MESSAGE,
          code: RESUME_LIMIT_EXCEEDED_CODE,
          limit: MAX_RESUME_COUNT,
          count: error.count,
        },
        { status: 409 },
      );
    }
    throw error;
  }

  const copied = await prisma.resume.create({
    data: {
      title: sourceResume.title,
      content: normalizeResumeContent(
        sourceResume.content as unknown as Partial<ResumeData> & Record<string, unknown>,
        { fallbackId: `${sourceResume.id}-copy` },
      ) as unknown as Prisma.InputJsonValue,
      template: sourceResume.template,
      thumbnail: sourceResume.thumbnail,
      userId: targetUser.id,
    },
  });

  return NextResponse.json({ success: true, resumeId: copied.id, targetUserId: targetUser.id, direction });
}
