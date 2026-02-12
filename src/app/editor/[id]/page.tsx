import type { Metadata } from "next";
import ResumeEditor from "@/components/ResumeEditor";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: '编辑简历',
  description: '使用智简简历可视化编辑器编辑你的简历，支持拖拽排版、AI 智能填写、实时预览。',
  robots: { index: false, follow: false },
};

interface PageParams {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditorPage({ params }: PageParams) {
  const { id } = await params;
  const cookieStore = await cookies();
  const userId = cookieStore.get("auth_uid")?.value;

  if (!userId) {
    redirect(`/login?redirect=/editor/${id}`);
  }
  
  const resume = await prisma.resume.findUnique({
    where: { 
      id,
      user: { wxId: userId }
    },
  });

  if (!resume) {
    notFound();
  }

  // Parse content JSON if needed, or pass as is if ResumeEditor expects raw object
  // Prisma returns JsonValue, we might need to cast or validate
  
  return <ResumeEditor resumeId={id} initialData={resume} />;
}
