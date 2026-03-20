'use server';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUserRecord } from '@/lib/auth/get-current-user-record';
import { revalidatePath } from 'next/cache';

export async function createResume() {
  const currentUser = await getCurrentUserRecord();
  if (!currentUser.dbUser) throw new Error("Unauthorized");
  
  const resume = await prisma.resume.create({
    data: {
      title: "Untitled Resume",
      content: {} as Prisma.InputJsonValue,
      user: { connect: { id: currentUser.dbUser.id } },
    }
  });
  
  revalidatePath("/dashboard");
  return resume.id;
}

export async function renameResume(id: string, title: string) {
  const currentUser = await getCurrentUserRecord();
  if (!currentUser.dbUser) throw new Error("Unauthorized");
  const existingResume = await prisma.resume.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!existingResume || existingResume.userId !== currentUser.dbUser.id) throw new Error("Resume not found");
  
  await prisma.resume.update({
    where: {
      id
    },
    data: {
      title
    }
  });
  
  revalidatePath("/dashboard");
}

export async function duplicateResume(id: string) {
  const currentUser = await getCurrentUserRecord();
  if (!currentUser.dbUser) throw new Error("Unauthorized");
  
  const existingResume = await prisma.resume.findUnique({
    where: { id }
  });
  
  if (!existingResume || existingResume.userId !== currentUser.dbUser.id) throw new Error("Resume not found");
  
  const newResume = await prisma.resume.create({
    data: {
      title: `${existingResume.title} - Copy`,
      content: existingResume.content as Prisma.InputJsonValue,
      template: existingResume.template,
      thumbnail: existingResume.thumbnail,
      user: { connect: { id: currentUser.dbUser.id } },
    }
  });
  
  revalidatePath("/dashboard");
  return newResume.id;
}

export async function deleteResume(id: string) {
  const currentUser = await getCurrentUserRecord();
  if (!currentUser.dbUser) throw new Error("Unauthorized");
  const existingResume = await prisma.resume.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!existingResume || existingResume.userId !== currentUser.dbUser.id) throw new Error("Resume not found");
  
  await prisma.resume.delete({
    where: {
      id
    }
  });
  
  revalidatePath("/dashboard");
}
