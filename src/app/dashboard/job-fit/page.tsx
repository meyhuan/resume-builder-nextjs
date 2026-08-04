import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ResumeData } from "@/entities/resume/resume-data";
import { normalizeResumeContent } from "@/entities/resume/normalize-resume-content";
import JobFitForm, {
  type JobFitResumeOption,
} from "@/components/job-fit/job-fit-form";
import { prisma } from "@/lib/prisma";
import { isJobFitEnabledForUser } from "@/lib/job-fit/flags";
import { buildJobFitFormInitialValues } from "@/lib/job-fit/form-state";

export const metadata: Metadata = {
  title: "岗位定制 - 智简简历",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function JobFitPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ resumeId?: string; taskId?: string }>;
}) {
  const wxId = (await cookies()).get("auth_uid")?.value;
  if (!wxId) redirect("/login?redirect=/dashboard/job-fit");
  if (!isJobFitEnabledForUser(wxId)) redirect("/dashboard");
  const user = await prisma.user.findUnique({
    where: { wxId },
    select: { id: true },
  });
  if (!user) redirect("/dashboard");
  const params = await searchParams;
  const [rows, tasks, restoreTask] = await Promise.all([
    prisma.resume.findMany({
      where: { userId: user.id, kind: "BASE" },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.jobFitTask.findMany({
      where: { userId: user.id, status: { not: "DRAFT" } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        companyName: true,
        jobTitle: true,
        status: true,
        progress: true,
        scoring: true,
        createdAt: true,
      },
    }),
    params.taskId
      ? prisma.jobFitTask.findFirst({
          where: {
            id: params.taskId,
            userId: user.id,
            status: { in: ["FAILED", "CANCELLED", "EXPIRED"] },
          },
          select: {
            id: true,
            sourceType: true,
            sourceResumeId: true,
            companyName: true,
            jobTitle: true,
            jobDescription: true,
            jobUrl: true,
            focusAreas: true,
            optimizationMode: true,
          },
        })
      : Promise.resolve(null),
  ]);
  const resumes: JobFitResumeOption[] = rows.map((row) => {
    const resume = normalizeResumeContent(
      row.content as unknown as Partial<ResumeData>,
      { fallbackId: row.id },
    );
    return {
      id: row.id,
      title: row.title,
      template: row.template,
      updatedAt: row.updatedAt.toISOString(),
      name: resume.name || row.title,
      overview: summarize(resume),
    };
  });
  const initialValues = restoreTask
    ? buildJobFitFormInitialValues(
        restoreTask,
        new Set(resumes.map((resume) => resume.id)),
      )
    : undefined;
  const requested = params.resumeId;
  const initialResumeId =
    initialValues?.resumeId ||
    (requested && resumes.some((resume) => resume.id === requested)
      ? requested
      : undefined);
  return (
    <div className="min-h-screen bg-slate-50 px-5 pb-14 pt-20 md:px-12 md:pt-8">
      <header className="mb-7">
        <h1 className="text-[28px] font-bold text-slate-900">
          为目标岗位优化简历
        </h1>
        <p className="mt-2 text-[13px] text-slate-500">
          选择简历和职位描述，一键生成更匹配的投递版本，并清楚展示 AI 改了什么。
        </p>
      </header>
      <JobFitForm
        resumes={resumes}
        initialResumeId={initialResumeId}
        initialValues={initialValues}
        recentTasks={tasks.map((task) => ({
          ...task,
          createdAt: task.createdAt.toISOString(),
          optimizedScore: scoreOf(task.scoring),
        }))}
      />
    </div>
  );
}

function summarize(resume: ResumeData): JobFitResumeOption["overview"] {
  const count = (type: string): number =>
    resume.sections
      .flatMap((section) => section.blocks)
      .filter((block) => block.type === type).length;
  return [
    {
      label: "个人信息",
      value:
        resume.baseInfo?.phone || resume.baseInfo?.email ? "已填写" : "待完善",
    },
    { label: "求职意向", value: resume.jobIntention?.position || "待填写" },
    { label: "工作经历", value: `${count("experience")} 段` },
    { label: "项目经历", value: `${count("project")} 段` },
    {
      label: "其他模块",
      value: `${Math.max(0, resume.sections.length - 2)} 个`,
    },
  ];
}

function scoreOf(value: unknown): number | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const score = (value as Record<string, unknown>).optimized;
  return typeof score === "number" ? score : undefined;
}
