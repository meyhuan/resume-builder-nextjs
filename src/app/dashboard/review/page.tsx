import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  MessageSquareReply,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { parseResumeFacts } from "@/lib/jobs/fact-extractor";
import { mergeJobEvidence } from "@/lib/jobs/job-evidence";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "求职复盘",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

interface CountItem {
  readonly label: string;
  readonly count: number;
}

function ranked(values: string[], limit = 6): CountItem[] {
  const counts = new Map<string, number>();
  values
    .filter(Boolean)
    .forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function missingKeywords(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const keywords = (value as Record<string, unknown>).missingKeywords;
  return Array.isArray(keywords)
    ? keywords.filter((item): item is string => typeof item === "string")
    : [];
}

export default async function ReviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/dashboard/review");

  const [jobs, applications] = await Promise.all([
    prisma.job.findMany({
      where: { userId: user.id, status: { not: "ARCHIVED" } },
      select: {
        id: true,
        role: true,
        company: true,
        matchSnapshot: true,
        factSet: { select: { facts: true, confirmedFactIds: true } },
      },
    }),
    prisma.application.findMany({
      where: { job: { userId: user.id } },
      orderBy: { appliedAt: "desc" },
      include: {
        outcome: true,
        interviews: { select: { nextActions: true } },
        job: { select: { id: true, role: true, company: true } },
      },
    }),
  ]);

  const replied = applications.filter(
    (application) =>
      application.outcome?.replyReceived ||
      ["CONTACTING", "INTERVIEWING", "OFFER"].includes(application.status),
  ).length;
  const interviewed = applications.filter(
    (application) =>
      application.interviews.length > 0 ||
      (application.outcome?.interviewReached ?? 0) > 0 ||
      ["INTERVIEWING", "OFFER"].includes(application.status),
  ).length;
  const offered = applications.filter(
    (application) =>
      application.outcome?.offerReceived || application.status === "OFFER",
  ).length;
  const channels = ranked(applications.map((item) => item.channel));
  const gaps = ranked(
    jobs.flatMap((job) => missingKeywords(job.matchSnapshot)),
  );
  const facts = ranked(
    jobs.flatMap((job) => {
      const confirmed = new Set(
        Array.isArray(job.factSet.confirmedFactIds)
          ? job.factSet.confirmedFactIds.filter(
              (item): item is string => typeof item === "string",
            )
          : [],
      );
      const baseFacts = parseResumeFacts(job.factSet.facts).filter((fact) =>
        confirmed.has(fact.id),
      );
      return mergeJobEvidence(baseFacts, job.matchSnapshot).map(
        (fact) => fact.label,
      );
    }),
  );
  const interviewActions = ranked(
    applications.flatMap((application) =>
      application.interviews.flatMap((interview) =>
        Array.isArray(interview.nextActions)
          ? interview.nextActions.filter(
              (item): item is string => typeof item === "string",
            )
          : [],
      ),
    ),
  );
  const overdue = applications.filter(
    (item) =>
      item.nextActionAt &&
      item.nextActionAt < new Date() &&
      !["OFFER", "REJECTED", "WITHDRAWN"].includes(item.status),
  );

  const cards = [
    {
      label: "已投递",
      value: applications.length,
      icon: BriefcaseBusiness,
      tone: "text-violet-600 bg-violet-50",
    },
    {
      label: "收到回复",
      value: replied,
      icon: MessageSquareReply,
      tone: "text-blue-600 bg-blue-50",
    },
    {
      label: "进入面试",
      value: interviewed,
      icon: CheckCircle2,
      tone: "text-amber-600 bg-amber-50",
    },
    {
      label: "获得 Offer",
      value: offered,
      icon: Trophy,
      tone: "text-emerald-600 bg-emerald-50",
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/40 px-5 py-8 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7">
          <p className="text-sm font-medium text-violet-600">
            基于你记录的真实投递结果
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-800">求职复盘</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            看清哪些经历被反复使用、哪些要求持续缺失，并及时处理待跟进事项。
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ label, value, icon: Icon, tone }) => (
            <div
              key={label}
              className="rounded-2xl border border-white bg-white/85 p-5 shadow-sm"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-2xl font-bold text-slate-800">{value}</p>
              <p className="mt-1 text-sm text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <ReviewList
            title="常用投递渠道"
            empty="记录投递后，这里会显示渠道分布。"
            items={channels}
          />
          <ReviewList
            title="反复出现的岗位缺口"
            empty="完成两个以上岗位分析后，更容易看出共同缺口。"
            items={gaps}
          />
          <ReviewList
            title="被反复使用的真实经历"
            empty="确认岗位事实后，这里会汇总高频经历。"
            items={facts}
          />
          <ReviewList
            title="面试后需要补强"
            empty="记录面试问题和下一步准备后，这里会汇总需要反复练习的内容。"
            items={interviewActions}
          />
          <section className="rounded-2xl border border-white bg-white/85 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">待跟进</h2>
              <span
                className={`rounded-full px-2.5 py-1 text-xs ${overdue.length ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}
              >
                {overdue.length} 项逾期
              </span>
            </div>
            {overdue.length === 0 ? (
              <p className="mt-5 text-sm text-slate-400">当前没有逾期事项。</p>
            ) : (
              <div className="mt-4 space-y-3">
                {overdue.slice(0, 6).map((item) => (
                  <Link
                    key={item.id}
                    href={`/dashboard/jobs/${item.job.id}`}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 transition hover:bg-violet-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {item.job.company ? `${item.job.company} · ` : ""}
                        {item.job.role}
                      </p>
                      <p className="mt-1 text-xs text-amber-700">
                        原定{" "}
                        {new Intl.DateTimeFormat("zh-CN", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(item.nextActionAt!)}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {applications.length === 0 && (
          <section className="mt-6 rounded-2xl border border-dashed border-violet-200 bg-violet-50/50 p-6">
            <div className="text-center">
              <h2 className="font-semibold text-slate-800">
                这里不会一直是空白
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                复盘只使用你主动记录的数据，不会猜测招聘结果。
              </p>
            </div>
            <div className="mx-auto mt-6 grid max-w-4xl gap-3 md:grid-cols-3">
              {[
                ["记录 1 次投递", "看到完整状态时间线与待跟进事项"],
                ["持续记录多个岗位", "看到常用渠道、共同岗位缺口和高频经历"],
                ["补充面试与结果", "汇总回复、面试和 Offer 的真实记录"],
              ].map(([title, description], index) => (
                <div
                  key={title}
                  className="rounded-xl border border-white bg-white/80 p-4"
                >
                  <span className="text-xs font-semibold text-violet-600">
                    阶段 {index + 1}
                  </span>
                  <h3 className="mt-2 text-sm font-semibold text-slate-700">
                    {title}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {description}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-5 text-center">
              <Button
                asChild
                className="bg-violet-600 text-white hover:bg-violet-700"
              >
                <Link href="/dashboard/jobs">进入目标岗位</Link>
              </Button>
            </div>
          </section>
        )}
        <p className="mt-6 flex items-start gap-2 rounded-xl bg-slate-100/70 px-4 py-3 text-xs leading-5 text-slate-500">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          以上是历史记录的描述性汇总，只反映相关性，不代表某项经历或渠道必然导致回复、面试或
          Offer。
        </p>
      </div>
    </main>
  );
}

function ReviewList({
  title,
  empty,
  items,
}: {
  readonly title: string;
  readonly empty: string;
  readonly items: CountItem[];
}) {
  return (
    <section className="rounded-2xl border border-white bg-white/85 p-6 shadow-sm">
      <h2 className="font-semibold text-slate-800">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-5 text-sm text-slate-400">{empty}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item, index) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-xs font-semibold text-violet-600">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-slate-600">
                {item.label}
              </span>
              <span className="text-xs text-slate-400">{item.count} 次</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
