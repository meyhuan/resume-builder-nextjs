"use client";

import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  HelpCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ResumeFact } from "@/lib/jobs/fact-extractor";
import type {
  JobSuggestionSet,
  JobTailorSuggestion,
} from "@/lib/jobs/job-tailor";

interface TailorReviewProps {
  readonly jobId: string;
  readonly resumeId: string;
  readonly suggestionSet: JobSuggestionSet | null;
  readonly facts: readonly ResumeFact[];
  readonly hasApplications: boolean;
}

interface ApiResponse {
  readonly code?: string;
  readonly error?: string;
  readonly suggestionSet?: JobSuggestionSet;
  readonly resumeId?: string;
}

function SuggestionCard({
  suggestion,
  selected,
  factLabels,
  formatText,
  onToggle,
}: {
  readonly suggestion: JobTailorSuggestion;
  readonly selected: boolean;
  readonly factLabels: ReadonlyMap<string, string>;
  readonly formatText: (value: string) => string;
  readonly onToggle: () => void;
}): ReactElement {
  return (
    <article
      className={`rounded-2xl border p-5 shadow-sm transition ${selected ? "border-violet-200 bg-violet-50/40" : "border-slate-200 bg-white/70 opacity-70"}`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label={selected ? "取消此建议" : "选择此建议"}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-violet-500 bg-violet-500 text-white" : "border-slate-300 bg-white text-transparent"}`}
        >
          <Check className="h-3 w-3" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-800">{suggestion.label}</h2>
            <span className="text-xs text-slate-400">建议审核</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {formatText(suggestion.reason)}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            原文
          </p>
          <div
            className="min-h-24 rounded-xl bg-slate-100 p-3 text-sm leading-6 text-slate-500 line-through"
            dangerouslySetInnerHTML={{ __html: suggestion.originalHtml }}
          />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-500">
            建议文本
          </p>
          <div
            className="min-h-24 rounded-xl bg-emerald-50 p-3 text-sm leading-6 text-emerald-800"
            dangerouslySetInnerHTML={{ __html: suggestion.proposedHtml }}
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {suggestion.matchedKeywords.map((keyword) => (
          <span
            key={keyword}
            className="rounded-full border border-violet-100 bg-white px-2.5 py-1 text-xs text-violet-700"
          >
            {keyword}
          </span>
        ))}
        <span className="text-xs text-slate-400">
          事实来源：
          {suggestion.sourceFactIds
            .map((id) => factLabels.get(id) ?? id)
            .join("、")}
        </span>
      </div>
    </article>
  );
}

export function TailorReview({
  jobId,
  resumeId,
  suggestionSet,
  facts,
  hasApplications,
}: TailorReviewProps): ReactElement {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [generationIssue, setGenerationIssue] = useState<string | null>(null);
  const [selected, setSelected] = useState(
    () => new Set(suggestionSet?.suggestions.map((item) => item.id) ?? []),
  );
  const factLabels = useMemo(
    () => new Map(facts.map((fact) => [fact.id, fact.label])),
    [facts],
  );
  const factReferenceLabels = useMemo(
    () =>
      new Map(
        facts.flatMap(
          (fact) =>
            [
              [fact.id, fact.label],
              [fact.blockId, fact.label],
            ] as const,
        ),
      ),
    [facts],
  );
  const formatUserFacingText = (value: string): string =>
    [...factReferenceLabels].reduce(
      (text, [id, label]) => text.replaceAll(id, label),
      value,
    );
  const applied = Boolean(suggestionSet?.appliedAt);

  useEffect(() => {
    setSelected(
      new Set(suggestionSet?.suggestions.map((item) => item.id) ?? []),
    );
  }, [suggestionSet?.id, suggestionSet?.suggestions]);

  async function generate(regenerate: boolean): Promise<void> {
    setBusy(true);
    try {
      const response = await fetch(`/next-api/jobs/${jobId}/tailor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate }),
      });
      const data = (await response.json()) as ApiResponse;
      if (data.code === "NO_VALID_SUGGESTIONS") {
        setGenerationIssue(data.error || "暂时没有找到可直接改写的内容");
        return;
      }
      if (!response.ok) throw new Error(data.error || "生成建议失败");
      setGenerationIssue(null);
      toast.success(
        data.suggestionSet
          ? `已生成 ${data.suggestionSet.suggestions.length} 条可靠建议`
          : "建议已生成",
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "生成建议失败");
    } finally {
      setBusy(false);
    }
  }

  async function apply(): Promise<void> {
    if (!suggestionSet || selected.size === 0) return;
    setBusy(true);
    try {
      const response = await fetch(
        `/next-api/jobs/${jobId}/suggestions/apply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            suggestionSetId: suggestionSet.id,
            acceptedSuggestionIds: [...selected],
          }),
        },
      );
      const data = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(data.error || "应用建议失败");
      toast.success(`已应用 ${selected.size} 条建议`);
      router.push(`/editor/${data.resumeId || resumeId}?jobId=${jobId}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "应用建议失败");
      setBusy(false);
    }
  }

  if (!suggestionSet) {
    return (
      <section className="rounded-2xl border border-violet-100 bg-gradient-to-br from-white via-violet-50/60 to-fuchsia-50/60 p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm">
          <Sparkles className="h-8 w-8" />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-slate-800">
          生成有证据支持的岗位改写
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-500">
          AI
          会重组已确认内容，让招聘方更快看到背景、你的动作、方法和结果；每条建议都显示证据来源，不会自动写入简历。
        </p>
        <div className="mx-auto mt-5 flex max-w-xl items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-left">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm leading-6 text-emerald-800">
            真实经历保护已开启：新增数字、工具、平台和职责升级会被拦截；没有证据的岗位要求不会写入。
          </p>
        </div>
        {generationIssue && (
          <div className="mx-auto mt-5 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <h3 className="font-semibold text-slate-800">
                  暂时没有找到可直接优化的内容
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {generationIssue}
                  。这不代表你不符合岗位，可以先补充真实细节，或保留现有岗位简历。
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <Button
                asChild
                variant="outline"
                className="border-amber-200 bg-white text-amber-800"
              >
                <Link href={`/dashboard/jobs/${jobId}/analysis`}>
                  <FileText />
                  补充真实细节
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-amber-200 bg-white text-amber-800"
              >
                <Link href={`/dashboard/jobs/${jobId}/facts`}>
                  重新选择经历
                </Link>
              </Button>
              <Button asChild variant="ghost" className="text-slate-600">
                <Link href={`/dashboard/jobs/${jobId}/materials`}>
                  跳过，准备材料
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        )}
        <Button
          onClick={() => generate(Boolean(generationIssue))}
          disabled={busy}
          className="mt-6 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 px-7 text-white hover:from-violet-700 hover:to-fuchsia-600"
        >
          {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {busy
            ? "正在整理真实经历…"
            : generationIssue
              ? "补充后重新生成"
              : "生成岗位改写"}
        </Button>
      </section>
    );
  }

  if (applied) {
    return (
      <section className="rounded-2xl border border-emerald-100 bg-white/90 p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Check className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-800">
          岗位简历已经准备好
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          已应用 {suggestionSet.appliedSuggestionIds?.length ?? 0}{" "}
          条有证据支持的改写，母版简历保持不变。
        </p>
        <div className="mx-auto mt-5 max-w-xl rounded-xl border border-violet-100 bg-violet-50 p-4 text-left">
          <p className="text-xs font-semibold text-violet-600">建议下一步</p>
          <p className="mt-1 font-medium text-slate-800">
            {hasApplications
              ? "更新投递状态和下一次跟进时间"
              : "检查完整简历，再准备一段招聘平台沟通话术"}
          </p>
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button
            asChild
            className="bg-violet-600 text-white hover:bg-violet-700"
          >
            <Link href={`/editor/${resumeId}?jobId=${jobId}`}>
              <FileText />
              打开岗位简历
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link
              href={
                hasApplications
                  ? `/dashboard/jobs/${jobId}#applications`
                  : `/dashboard/jobs/${jobId}/materials/outreach`
              }
            >
              {hasApplications ? "管理投递" : "准备沟通话术"}
              <ArrowRight />
            </Link>
          </Button>
          <Button
            onClick={() => generate(true)}
            disabled={busy}
            variant="ghost"
          >
            <RefreshCw />
            重新生成
          </Button>
        </div>
      </section>
    );
  }

  const followUps = suggestionSet.followUps ?? [];
  const allSelected =
    suggestionSet.suggestions.length > 0 &&
    selected.size === suggestionSet.suggestions.length;
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-slate-800">
            找到 {suggestionSet.suggestions.length} 条有证据支持的改写
            {followUps.length > 0
              ? `，以及 ${followUps.length} 个值得确认的问题`
              : ""}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            逐条检查原文、建议表达和证据来源，只有选中的内容会写入岗位简历。
          </p>
        </div>
        <div className="flex gap-2">
          {suggestionSet.suggestions.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setSelected(
                  allSelected
                    ? new Set()
                    : new Set(suggestionSet.suggestions.map((item) => item.id)),
                )
              }
            >
              {allSelected ? "全部取消" : "全部选择"}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => generate(true)}
            disabled={busy}
          >
            <RefreshCw />
            重新生成
          </Button>
        </div>
      </div>
      {suggestionSet.suggestions.map((suggestion) => (
        <SuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          selected={selected.has(suggestion.id)}
          factLabels={factLabels}
          formatText={formatUserFacingText}
          onToggle={() =>
            setSelected((current) => {
              const next = new Set(current);
              if (next.has(suggestion.id)) next.delete(suggestion.id);
              else next.add(suggestion.id);
              return next;
            })
          }
        />
      ))}
      {followUps.length > 0 && (
        <section className="rounded-2xl border border-amber-100 bg-amber-50/70 p-5">
          <div className="flex items-start gap-3">
            <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <h2 className="font-semibold text-slate-800">
                还有一些要求值得你确认
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                不要直接把关键词写进简历。回到匹配页面后，可以关联到具体经历并补充真实细节。
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {followUps.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-amber-100 bg-white p-4"
              >
                <p className="text-sm font-medium leading-6 text-slate-700">
                  {formatUserFacingText(item.question)}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {formatUserFacingText(item.reason)}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.relatedKeywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="mt-4 border-amber-200 bg-white text-amber-800"
          >
            <Link href={`/dashboard/jobs/${jobId}/analysis`}>
              <FileText />
              回到匹配页面补充
            </Link>
          </Button>
        </section>
      )}
      <div className="sticky bottom-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur-xl">
        <Button asChild variant="ghost">
          <Link href={`/dashboard/jobs/${jobId}/analysis`}>
            <ArrowLeft />
            返回分析
          </Link>
        </Button>
        {suggestionSet.suggestions.length > 0 ? (
          <Button
            onClick={apply}
            disabled={busy || selected.size === 0}
            className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 px-6 text-white hover:from-violet-700 hover:to-fuchsia-600"
          >
            {busy ? <Loader2 className="animate-spin" /> : <ArrowRight />}
            {busy ? "正在应用…" : `应用选中的 ${selected.size} 条`}
          </Button>
        ) : (
          <Button
            asChild
            className="bg-violet-600 text-white hover:bg-violet-700"
          >
            <Link href={`/editor/${resumeId}?jobId=${jobId}`}>
              <FileText />
              去补充真实细节
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
