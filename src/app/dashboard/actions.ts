'use server';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function createResume() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("auth_uid")?.value;
  if (!userId) throw new Error("Unauthorized");
  
  const resume = await prisma.resume.create({
    data: {
      title: "Untitled Resume",
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
  
  await prisma.resume.update({
    where: {
      id,
      user: { wxId: userId }
    },
    data: {
      title
    }
  });
  
  revalidatePath("/dashboard");
}

export async function duplicateResume(id: string) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("auth_uid")?.value;
  if (!userId) throw new Error("Unauthorized");
  
  const existingResume = await prisma.resume.findUnique({
    where: { id, user: { wxId: userId } }
  });
  
  if (!existingResume) throw new Error("Resume not found");
  
  const newResume = await prisma.resume.create({
    data: {
      title: `${existingResume.title} - Copy`,
      content: existingResume.content as Prisma.InputJsonValue,
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
  
  await prisma.resume.delete({
    where: {
      id,
      user: { wxId: userId }
    }
  });
  
  revalidatePath("/dashboard");
}
