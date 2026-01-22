import ResumeEditor from "@/components/ResumeEditor";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

interface PageParams {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditorPage({ params }: PageParams) {
  const { id } = await params;
  
  const resume = await prisma.resume.findUnique({
    where: { id },
  });

  if (!resume) {
    notFound();
  }

  // Parse content JSON if needed, or pass as is if ResumeEditor expects raw object
  // Prisma returns JsonValue, we might need to cast or validate
  
  return <ResumeEditor resumeId={id} initialData={resume} />;
}
