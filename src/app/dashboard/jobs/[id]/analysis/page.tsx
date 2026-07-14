import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { JobAnalysisWorkspace } from "@/components/jobs/job-analysis-workspace";
import { JobPageShell } from "@/components/jobs/job-page-shell";
import { getCurrentUser } from "@/lib/auth/current-user";
import { parseResumeFacts } from "@/lib/jobs/fact-extractor";
import {
  getJobEvidenceAnswers,
  parseJobMatchSnapshot,
} from "@/lib/jobs/job-evidence";
import type { JdRequirementMatch } from "@/lib/seo/jd-match";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "岗位匹配与证据补充",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

interface AnalysisPageProps {
  readonly params: Promise<{ id: string }>;
}

export default async function AnalysisPage({ params }: AnalysisPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirect=/dashboard/jobs/${id}/analysis`);
  const job = await prisma.job.findFirst({
    where: { id, userId: user.id },
    include: { tailoredResume: { select: { id: true } }, factSet: true },
  });
  if (!job) notFound();
  if (!job.factSet.confirmedAt) redirect(`/dashboard/jobs/${job.id}/facts`);
  const snapshot = parseJobMatchSnapshot(job.matchSnapshot);
  const score =
    snapshot && typeof snapshot.score === "number" ? snapshot.score : null;
  const requirements = Array.isArray(snapshot?.requirements)
    ? (snapshot.requirements as readonly JdRequirementMatch[])
    : [];
  if (score === null || requirements.length === 0)
    redirect(`/dashboard/jobs/${job.id}/facts`);

  const confirmedIds = new Set(
    Array.isArray(job.factSet.confirmedFactIds)
      ? job.factSet.confirmedFactIds.filter(
          (value): value is string => typeof value === "string",
        )
      : [],
  );
  const facts = parseResumeFacts(job.factSet.facts).filter((fact) =>
    confirmedIds.has(fact.id),
  );

  return (
    <JobPageShell>
      <Link
        href={`/dashboard/jobs/${job.id}`}
        className="mb-5 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-violet-600"
      >
        <ArrowLeft className="h-4 w-4" />
        返回岗位详情
      </Link>
      <JobAnalysisWorkspace
        jobId={job.id}
        resumeId={job.tailoredResume?.id ?? null}
        company={job.company}
        role={job.role}
        analysis={{
          score,
          requirements,
          evidenceAnswers: getJobEvidenceAnswers(job.matchSnapshot),
        }}
        facts={facts}
      />
    </JobPageShell>
  );
}
