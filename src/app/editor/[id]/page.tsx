import type { Metadata } from "next";
import ResumeEditor from "@/components/ResumeEditor";
import { prisma } from "@/lib/prisma";
import { getCurrentUserRecord } from "@/lib/auth/get-current-user-record";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = {
  title: 'Edit Resume',
  description: 'Edit your resume with AI Resume Pass visual editor — drag-and-drop layout, AI-powered content, and live preview.',
  robots: { index: false, follow: false },
};

interface PageParams {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditorPage({ params }: PageParams) {
  const { id } = await params;
  const currentUser = await getCurrentUserRecord();
  if (!currentUser.dbUser) {
    redirect(`/login?redirect=/editor/${id}`);
  }
  
  const resume = await prisma.resume.findUnique({
    where: { id },
  });

  if (!resume || resume.userId !== currentUser.dbUser.id) {
    notFound();
  }

  // Parse content JSON if needed, or pass as is if ResumeEditor expects raw object
  // Prisma returns JsonValue, we might need to cast or validate
  
  return <ResumeEditor resumeId={id} initialData={resume} />;
}
