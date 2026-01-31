import ResumeEditor from "@/components/ResumeEditor";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";

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
