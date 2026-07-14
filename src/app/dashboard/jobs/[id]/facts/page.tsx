import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FactConfirmation } from "@/components/jobs/fact-confirmation";
import { JobPageShell } from "@/components/jobs/job-page-shell";
import { getCurrentUser } from "@/lib/auth/current-user";
import { parseResumeFacts } from "@/lib/jobs/fact-extractor";
import { hashResumeContent } from "@/lib/jobs/job-service";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "确认可用于岗位的经历",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

interface FactsPageProps {
  readonly params: Promise<{ id: string }>;
}

export default async function FactsPage({ params }: FactsPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirect=/dashboard/jobs/${id}/facts`);
  const job = await prisma.job.findFirst({
    where: { id, userId: user.id },
    include: {
      factSet: true,
      baseResume: { select: { id: true, title: true, content: true } },
    },
  });
  if (!job) notFound();

  const confirmedFactIds = Array.isArray(job.factSet.confirmedFactIds)
    ? job.factSet.confirmedFactIds.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  const stale = job.baseResume
    ? hashResumeContent(job.baseResume.content) !==
      job.factSet.sourceContentHash
    : false;

  return (
    <JobPageShell>
      <Link
        href={`/dashboard/jobs/${job.id}`}
        className="mb-5 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-violet-600"
      >
        <ArrowLeft className="h-4 w-4" />
        返回岗位详情
      </Link>
      <header className="mb-7">
        <p className="text-xs font-semibold text-violet-600">大约 1 分钟</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-800">
          确认哪些经历可以用于这个岗位
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          只选择你确实做过、并愿意用于本次求职的内容。
          {job.company ? `${job.company} · ` : ""}
          {job.role} · 来源：{job.baseResume?.title ?? "原母版已删除"}
        </p>
      </header>
      <FactConfirmation
        jobId={job.id}
        facts={parseResumeFacts(job.factSet.facts)}
        confirmedFactIds={confirmedFactIds}
        contentHash={job.factSet.sourceContentHash}
        revision={job.factSet.revision}
        stale={stale}
        baseResumeId={job.baseResume?.id ?? null}
      />
    </JobPageShell>
  );
}
