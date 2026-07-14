"use client";

import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  FileText,
  HelpCircle,
  Lightbulb,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ResumeFact } from "@/lib/jobs/fact-extractor";
import type {
  JobEvidenceAnswer,
  JobEvidenceAnswerValue,
} from "@/lib/jobs/job-evidence";
import type { JdRequirementMatch } from "@/lib/seo/jd-match";

interface AnalysisData {
  readonly score: number;
  readonly requirements: readonly JdRequirementMatch[];
  readonly evidenceAnswers: readonly JobEvidenceAnswer[];
}

interface JobAnalysisWorkspaceProps {
  readonly jobId: string;
  readonly resumeId: string | null;
  readonly company: string | null;
  readonly role: string;
  readonly analysis: AnalysisData;
  readonly facts: readonly ResumeFact[];
}

const STATUS_META = {
  direct: {
    label: "已有直接证据",
    icon: CheckCircle2,
    className: "border-emerald-100 bg-emerald-50 text-emerald-700",
  },
  transferable: {
    label: "有可迁移经验",
    icon: Lightbulb,
    className: "border-blue-100 bg-blue-50 text-blue-700",
  },
  needs_confirmation: {
    label: "值得确认",
    icon: HelpCircle,
    className: "border-amber-100 bg-amber-50 text-amber-700",
  },
  blocked: {
    label: "暂不写入",
    icon: ShieldCheck,
    className: "border-slate-200 bg-slate-100 text-slate-500",
  },
} as const;

export function JobAnalysisWorkspace(
  props: JobAnalysisWorkspaceProps,
): ReactElement {
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<
      string,
      {
        answer: JobEvidenceAnswerValue | null;
        detail: string;
        sourceFactId: string;
      }
    >
  >({});
  const requirements = props.analysis.requirements;
  const visibleRequirements = showAll ? requirements : requirements.slice(0, 8);
  const counts = useMemo(
    () => ({
      direct: requirements.filter((item) => item.status === "direct").length,
      transferable: requirements.filter(
        (item) => item.status === "transferable",
      ).length,
      needs: requirements.filter((item) => item.status === "needs_confirmation")
        .length,
      blocked: requirements.filter((item) => item.status === "blocked").length,
    }),
    [requirements],
  );
  const answerMap = useMemo(
    () =>
      new Map(
        props.analysis.evidenceAnswers.map((item) => [
          item.requirementId,
          item,
        ]),
      ),
    [props.analysis.evidenceAnswers],
  );

  function getDraft(requirement: JdRequirementMatch) {
    const existing = answerMap.get(requirement.id);
    return (
      drafts[requirement.id] ?? {
        answer: existing?.answer ?? null,
        detail: existing?.detail ?? "",
        sourceFactId:
          existing?.sourceFactId ??
          requirement.matchedFactIds[0] ??
          props.facts[0]?.id ??
          "",
      }
    );
  }

  function updateDraft(
    requirement: JdRequirementMatch,
    patch: Partial<ReturnType<typeof getDraft>>,
  ): void {
    setDrafts((current) => ({
      ...current,
      [requirement.id]: { ...getDraft(requirement), ...patch },
    }));
  }

  async function saveEvidence(requirement: JdRequirementMatch): Promise<void> {
    const draft = getDraft(requirement);
    if (!draft.answer) {
      toast.warning("请先选择是否做过这项工作");
      return;
    }
    if (
      draft.answer !== "no" &&
      (!draft.sourceFactId || draft.detail.trim().length < 12)
    ) {
      toast.warning("请选择关联经历，并至少填写 12 个字的真实细节");
      return;
    }
    setBusyId(requirement.id);
    try {
      const response = await fetch(`/next-api/jobs/${props.jobId}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requirementId: requirement.id,
          answer: draft.answer,
          detail: draft.answer === "no" ? undefined : draft.detail,
          sourceFactId: draft.answer === "no" ? undefined : draft.sourceFactId,
        }),
      });
      const data = (await response.json()) as { readonly error?: string };
      if (!response.ok) throw new Error(data.error || "补充经历保存失败");
      toast.success(
        draft.answer === "no"
          ? "已标记为暂不写入"
          : "真实细节已加入当前岗位证据",
      );
      setExpandedId(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "补充经历保存失败");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 overflow-hidden rounded-xl border border-slate-200 bg-white text-center text-sm">
        <div className="px-3 py-3 text-slate-400">1 岗位信息</div>
        <div className="border-l border-slate-100 px-3 py-3 text-slate-400">
          2 选择可用经历
        </div>
        <div className="border-l border-slate-100 bg-gradient-to-r from-violet-600 to-fuchsia-500 px-3 py-3 font-medium text-white">
          3 匹配与补充
        </div>
        <div className="border-l border-slate-100 px-3 py-3 text-slate-400">
          4 审核岗位简历
        </div>
      </div>

      <section className="rounded-2xl border border-white bg-white/90 p-6 shadow-sm">
        <p className="text-xs font-semibold text-violet-600">第一份有用结果</p>
        <div className="mt-1 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              我们找到了这些可以用于岗位的经历
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {props.company ? `${props.company} · ` : ""}
              {props.role}。先确认能证明什么，再处理简历没有写清楚的要求。
            </p>
          </div>
          <p className="text-xs text-slate-400">
            内容覆盖 {props.analysis.score} · 只用于辅助检查，不代表录用概率
          </p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-2xl font-bold text-emerald-700">
              {counts.direct}
            </p>
            <p className="mt-1 text-xs text-emerald-700">已有直接证据</p>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-2xl font-bold text-blue-700">
              {counts.transferable}
            </p>
            <p className="mt-1 text-xs text-blue-700">可迁移经验</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-2xl font-bold text-amber-700">{counts.needs}</p>
            <p className="mt-1 text-xs text-amber-700">值得确认</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-2xl font-bold text-slate-600">
              {counts.blocked}
            </p>
            <p className="mt-1 text-xs text-slate-500">已确认不写</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white bg-white/90 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-800">岗位要求与证据</h2>
            <p className="mt-1 text-sm text-slate-500">
              可迁移经验会保留原场景；只有你确认的真实补充才会进入岗位简历。
            </p>
          </div>
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="mt-5 space-y-3">
          {visibleRequirements.map((requirement) => {
            const meta = STATUS_META[requirement.status];
            const Icon = meta.icon;
            const sourceLabels = requirement.matchedFactIds
              .map((id) => props.facts.find((fact) => fact.id === id)?.label)
              .filter(Boolean);
            const canAnswer =
              requirement.status === "needs_confirmation" ||
              requirement.status === "transferable" ||
              Boolean(answerMap.get(requirement.id));
            const expanded = expandedId === requirement.id;
            const draft = getDraft(requirement);
            return (
              <article
                key={requirement.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-800">
                        {requirement.label}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${meta.className}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {meta.label}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {requirement.reason}
                    </p>
                    {sourceLabels.length > 0 && (
                      <p className="mt-2 text-xs text-slate-400">
                        证据来源：{[...new Set(sourceLabels)].join("、")}
                      </p>
                    )}
                  </div>
                  {canAnswer && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setExpandedId(expanded ? null : requirement.id)
                      }
                      className="shrink-0 border-violet-200 text-violet-700"
                    >
                      {expanded
                        ? "收起"
                        : answerMap.has(requirement.id)
                          ? "修改确认"
                          : requirement.status === "transferable"
                            ? "补充直接证据"
                            : "我来确认"}
                    </Button>
                  )}
                </div>
                {expanded && (
                  <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/60 p-4">
                    <p className="font-medium leading-6 text-slate-800">
                      {requirement.question}
                    </p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      {(
                        [
                          ["yes", "确实做过"],
                          ["similar", "做过相似的"],
                          ["no", "没有做过"],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            updateDraft(requirement, { answer: value })
                          }
                          className={`rounded-lg border px-3 py-2 text-sm font-medium ${draft.answer === value ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-600"}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {(draft.answer === "yes" || draft.answer === "similar") && (
                      <div className="mt-4 space-y-3">
                        <label className="block text-sm font-medium text-slate-700">
                          这项细节属于哪段经历？
                          <select
                            value={draft.sourceFactId}
                            onChange={(event) =>
                              updateDraft(requirement, {
                                sourceFactId: event.target.value,
                              })
                            }
                            className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal"
                          >
                            <option value="">请选择经历</option>
                            {props.facts.map((fact) => (
                              <option key={fact.id} value={fact.id}>
                                {fact.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block text-sm font-medium text-slate-700">
                          补充真实细节
                          <textarea
                            value={draft.detail}
                            onChange={(event) =>
                              updateDraft(requirement, {
                                detail: event.target.value,
                              })
                            }
                            placeholder="建议包含：当时的背景、你具体做了什么、用了什么方法、结果如何。没有准确数据可以不填。"
                            rows={4}
                            className="mt-2 w-full resize-none rounded-lg border border-slate-300 bg-white p-3 font-normal leading-6 outline-none focus:border-violet-500"
                          />
                        </label>
                      </div>
                    )}{" "}
                    {draft.answer === "no" && (
                      <div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-100 p-3 text-sm leading-6 text-slate-500">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                        确认后，这项要求不会写入简历，也不会继续要求你补充。
                      </div>
                    )}
                    <div className="mt-4 flex justify-end">
                      <Button
                        onClick={() => saveEvidence(requirement)}
                        disabled={!draft.answer || busyId === requirement.id}
                        className="bg-violet-600 text-white hover:bg-violet-700"
                      >
                        {busyId === requirement.id && (
                          <Loader2 className="animate-spin" />
                        )}
                        {!draft.answer
                          ? "请先选择"
                          : draft.answer === "no"
                            ? "确认暂不写入"
                            : "确认并重新匹配"}
                      </Button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
        {requirements.length > 8 && (
          <Button
            variant="ghost"
            onClick={() => setShowAll((value) => !value)}
            className="mt-4 w-full text-slate-500"
          >
            {showAll
              ? "收起次要要求"
              : `查看另外 ${requirements.length - 8} 项要求`}
            <ChevronDown
              className={`transition ${showAll ? "rotate-180" : ""}`}
            />
          </Button>
        )}
      </section>

      {counts.direct + counts.transferable === 0 && (
        <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <h2 className="font-semibold text-slate-800">
              暂时没有足够证据生成岗位改写
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              这不代表你不能投递。可以回答上面的具体问题，或者保留现有简历并把缺口作为面试准备项。
            </p>
          </div>
        </section>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost">
          <Link href={`/dashboard/jobs/${props.jobId}/facts`}>
            <ArrowLeft />
            重新选择经历
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          {props.resumeId && (
            <Button asChild variant="outline">
              <Link href={`/editor/${props.resumeId}?jobId=${props.jobId}`}>
                <FileText />
                直接编辑岗位简历
              </Link>
            </Button>
          )}
          <Button
            asChild
            disabled={counts.direct + counts.transferable === 0}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white"
          >
            <Link href={`/dashboard/jobs/${props.jobId}/tailor`}>
              <Sparkles />
              生成有证据支持的岗位改写
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
