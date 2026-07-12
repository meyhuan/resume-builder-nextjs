import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  FileCheck2,
  FileHeart,
  FileQuestion,
  MessageCircleMore,
  Presentation,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobPageShell } from "@/components/jobs/job-page-shell";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  JOB_MATERIAL_META,
  JOB_MATERIAL_TYPES,
  type JobMaterialType,
} from "@/lib/jobs/job-material-contracts";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "岗位求职材料包",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
interface MaterialsPageProps {
  readonly params: Promise<{ id: string }>;
}

const ICONS: Record<JobMaterialType, typeof Presentation> = {
  SELF_INTRO: Presentation,
  COVER_LETTER: FileHeart,
  OUTREACH: MessageCircleMore,
  PROJECT_STORY: FileCheck2,
  INTERVIEW_PREP: FileQuestion,
};
const EXAMPLES: Record<JobMaterialType, string> = {
  SELF_INTRO: "我是谁 → 相关经历 → 可验证结果",
  COVER_LETTER: "为什么申请 → 匹配证据 → 沟通意愿",
  OUTREACH: "一句问候 → 应聘岗位 → 核心匹配点",
  PROJECT_STORY: "项目背景 → 你的行动 → 结果与复盘",
  INTERVIEW_PREP: "高频问题 → 回答提纲 → 可向面试官反问",
};

export default async function MaterialsPage({ params }: MaterialsPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirect=/dashboard/jobs/${id}/materials`);
  const job = await prisma.job.findFirst({
    where: { id, userId: user.id },
    include: { materials: true, factSet: { select: { confirmedAt: true } } },
  });
  if (!job) notFound();
  const materialMap = new Map(
    job.materials.map((material) => [material.type, material]),
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
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">求职材料包</h1>
          <p className="mt-1 text-sm text-slate-500">
            {job.company ? `${job.company} · ` : ""}
            {job.role} · 所有材料共享同一份已确认事实
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="border-violet-200 bg-white text-violet-700"
        >
          <Link href={`/dashboard/jobs/${job.id}/facts`}>管理可用事实</Link>
        </Button>
      </header>
      <section className="mb-6 rounded-2xl border border-violet-100 bg-violet-50/60 p-5">
        <h2 className="font-semibold text-slate-800">这不是五份重复文案</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          每份材料对应一个真实求职场景。建议先创建最紧迫的一份，生成后仍可逐句编辑，不需要一次全部完成。
        </p>
      </section>
      {!job.factSet.confirmedAt ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <Sparkles className="mx-auto h-9 w-9 text-amber-500" />
          <h2 className="mt-4 font-semibold text-slate-800">
            请先确认真实事实
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            材料生成只使用用户明确确认的经历。
          </p>
          <Button
            asChild
            className="mt-5 bg-amber-600 text-white hover:bg-amber-700"
          >
            <Link href={`/dashboard/jobs/${job.id}/facts`}>确认事实</Link>
          </Button>
        </section>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {JOB_MATERIAL_TYPES.map((type) => {
            const meta = JOB_MATERIAL_META[type];
            const material = materialMap.get(type);
            const Icon = ICONS[type];
            return (
              <Link
                key={type}
                href={`/dashboard/jobs/${job.id}/materials/${meta.slug}`}
                className="group rounded-2xl border border-white bg-white/85 p-5 shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:border-violet-100 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600 transition group-hover:bg-violet-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs ${material ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                  >
                    {material ? "已创建" : "未创建"}
                  </span>
                </div>
                <h2 className="mt-5 font-semibold text-slate-800 group-hover:text-violet-700">
                  {meta.label}
                </h2>
                <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
                  {meta.description}
                </p>
                {!material && (
                  <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
                    示例结构：{EXAMPLES[type]}
                  </p>
                )}
                <p className="mt-4 text-sm font-medium text-violet-600">
                  {material ? "继续编辑" : "创建材料"} →
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </JobPageShell>
  );
}
