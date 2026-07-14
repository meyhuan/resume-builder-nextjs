import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { JobPageShell } from "@/components/jobs/job-page-shell";
import { TailorReview } from "@/components/jobs/tailor-review";
import { getCurrentUser } from "@/lib/auth/current-user";
import { parseResumeFacts } from "@/lib/jobs/fact-extractor";
import { mergeJobEvidence } from "@/lib/jobs/job-evidence";
import { parseSuggestionSet } from "@/lib/jobs/job-tailor";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "岗位 AI 优化建议",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

interface TailorPageProps {
  readonly params: Promise<{ id: string }>;
}

export default async function TailorPage({ params }: TailorPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirect=/dashboard/jobs/${id}/tailor`);
  const job = await prisma.job.findFirst({
    where: { id, userId: user.id },
    include: {
      factSet: true,
      tailoredResume: { select: { id: true } },
      _count: { select: { applications: true } },
    },
  });
  if (!job || !job.tailoredResume) notFound();
  if (!job.factSet.confirmedAt) redirect(`/dashboard/jobs/${job.id}/facts`);
  if (!job.matchSnapshot) redirect(`/dashboard/jobs/${job.id}/analysis`);

  return (
    <JobPageShell>
      <Link
        href={`/dashboard/jobs/${job.id}/analysis`}
        className="mb-5 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-violet-600"
      >
        <ArrowLeft className="h-4 w-4" />
        返回匹配分析
      </Link>
      <header className="mb-7">
        <h1 className="text-2xl font-bold text-slate-800">审核岗位优化建议</h1>
        <p className="mt-1 text-sm text-slate-500">
          {job.company ? `${job.company} · ` : ""}
          {job.role} · 所有建议均需确认后才会写入岗位简历
        </p>
      </header>
      <TailorReview
        jobId={job.id}
        resumeId={job.tailoredResume.id}
        suggestionSet={parseSuggestionSet(job.suggestionSet)}
        facts={mergeJobEvidence(
          parseResumeFacts(job.factSet.facts),
          job.matchSnapshot,
        )}
        hasApplications={job._count.applications > 0}
      />
    </JobPageShell>
  );
}
