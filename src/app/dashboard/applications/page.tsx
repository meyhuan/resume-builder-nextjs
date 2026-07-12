import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarClock, CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ApplicationWorkspace,
  type ApplicationWorkspaceItem,
} from "@/components/applications/application-workspace";
import { JobPageShell } from "@/components/jobs/job-page-shell";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "投递管理",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/dashboard/applications");
  const applications = await prisma.application.findMany({
    where: { job: { userId: user.id, status: { not: "ARCHIVED" } } },
    orderBy: [{ nextActionAt: "asc" }, { updatedAt: "desc" }],
    include: { job: { select: { id: true, company: true, role: true } } },
  });
  const items: ApplicationWorkspaceItem[] = applications.map((item) => ({
    id: item.id,
    status: item.status,
    channel: item.channel,
    appliedAt: item.appliedAt.toISOString(),
    nextActionAt: item.nextActionAt?.toISOString() ?? null,
    contactName: item.contactName,
    note: item.note,
    job: item.job,
  }));
  const dueCount = applications.filter(
    (item) =>
      item.nextActionAt &&
      item.nextActionAt <= new Date() &&
      !["OFFER", "REJECTED", "WITHDRAWN"].includes(item.status),
  ).length;

  return (
    <JobPageShell>
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">投递管理</h1>
          <p className="mt-1 text-sm text-slate-500">
            按阶段管理投递，所有状态变化都会保留在岗位时间线。
          </p>
        </div>
        <Button
          asChild
          className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white hover:from-violet-700 hover:to-fuchsia-600"
        >
          <Link href="/dashboard/jobs">
            <Plus />
            从目标岗位添加投递
          </Link>
        </Button>
      </header>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white bg-white/80 p-4 shadow-sm">
          <p className="text-xs text-slate-400">全部投递</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">
            {applications.length}
          </p>
        </div>
        <div className="rounded-xl border border-white bg-white/80 p-4 shadow-sm">
          <p className="text-xs text-slate-400">面试中</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {
              applications.filter((item) => item.status === "INTERVIEWING")
                .length
            }
          </p>
        </div>
        <div className="rounded-xl border border-white bg-white/80 p-4 shadow-sm">
          <p className="text-xs text-slate-400">待跟进</p>
          <p className="mt-1 text-2xl font-bold text-rose-600">{dueCount}</p>
        </div>
      </div>
      {applications.length === 0 ? (
        <section className="grid gap-5 rounded-2xl border border-white bg-white/85 p-6 shadow-sm lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
          <div>
            <p className="text-xs font-semibold text-violet-600">第一次使用</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-800">
              投递后，把三个信息记下来就够了
            </h2>
            <div className="mt-5 space-y-3">
              {[
                ["投递渠道与时间", "知道简历发到了哪里"],
                ["当前状态", "投递、沟通、面试或结果"],
                ["下一次跟进时间", "到期后会显示为待跟进"],
              ].map(([title, description], index) => (
                <div key={title} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {title}
                    </p>
                    <p className="text-xs text-slate-500">{description}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button
              asChild
              className="mt-6 bg-violet-600 text-white hover:bg-violet-700"
            >
              <Link href="/dashboard/jobs">
                选择一个目标岗位
                <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/50 p-5">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-violet-700">
                示例
              </span>
              <span className="text-xs text-slate-400">已投递</span>
            </div>
            <h3 className="mt-4 font-semibold text-slate-800">
              云帆智能 · AI 产品经理
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              BOSS 直聘 · 今天 10:30
            </p>
            <p className="mt-4 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-amber-700">
              <CalendarClock className="h-4 w-4" />3 天后主动跟进
            </p>
            <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              状态变化会自动保留到时间线
            </p>
          </div>
        </section>
      ) : (
        <ApplicationWorkspace initialItems={items} />
      )}
    </JobPageShell>
  );
}
