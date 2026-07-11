'use server';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { ResumeData } from '@/entities/resume/resume-data';
import { normalizeResumeContent } from '@/entities/resume/normalize-resume-content';
import { assertCanCreateResumeForWxId } from '@/lib/resume-limits';

export async function createResume() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("auth_uid")?.value;
  if (!userId) throw new Error("Unauthorized");

  await assertCanCreateResumeForWxId(userId);
  
  const resume = await prisma.resume.create({
    data: {
      title: "未命名简历",
      content: {} as Prisma.InputJsonValue,
      user: { connect: { wxId: userId } },
    }
  });
  
  revalidatePath("/dashboard");
  return resume.id;
}

export async function renameResume(id: string, title: string) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("auth_uid")?.value;
  if (!userId) throw new Error("Unauthorized");
  
  const renamed = await prisma.resume.updateMany({
    where: {
      id,
      user: { wxId: userId },
      jobId: null,
    },
    data: {
      title
    }
  });
  if (renamed.count === 0) throw new Error("Resume not found");
  
  revalidatePath("/dashboard");
}

export async function duplicateResume(id: string) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("auth_uid")?.value;
  if (!userId) throw new Error("Unauthorized");
  
  const existingResume = await prisma.resume.findFirst({
    where: { id, user: { wxId: userId }, jobId: null }
  });
  
  if (!existingResume) throw new Error("Resume not found");

  await assertCanCreateResumeForWxId(userId);
  
  const newResume = await prisma.resume.create({
    data: {
      title: `${existingResume.title} - 副本`,
      content: normalizeResumeContent(
        existingResume.content as unknown as Partial<ResumeData> & Record<string, unknown>,
        { fallbackId: `${existingResume.id}-copy` },
      ) as unknown as Prisma.InputJsonValue,
      template: existingResume.template,
      thumbnail: existingResume.thumbnail,
      user: { connect: { wxId: userId } },
    }
  });
  
  revalidatePath("/dashboard");
  return newResume.id;
}

export async function deleteResume(id: string) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("auth_uid")?.value;
  if (!userId) throw new Error("Unauthorized");
  
  const deleted = await prisma.resume.deleteMany({
    where: {
      id,
      user: { wxId: userId },
      jobId: null,
    }
  });
  if (deleted.count === 0) throw new Error("Resume not found");
  
  revalidatePath("/dashboard");
}
