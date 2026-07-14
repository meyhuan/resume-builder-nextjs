"use client";

import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ResumeFact } from "@/lib/jobs/fact-extractor";

interface FactConfirmationProps {
  readonly jobId: string;
  readonly facts: readonly ResumeFact[];
  readonly confirmedFactIds: readonly string[];
  readonly contentHash: string;
  readonly revision: number;
  readonly stale: boolean;
  readonly baseResumeId: string | null;
}

interface ApiResponse {
  readonly error?: string;
}

export function FactConfirmation(props: FactConfirmationProps): ReactElement {
  const router = useRouter();
  const initialIds = props.confirmedFactIds;
  const [selected, setSelected] = useState(() => new Set(initialIds));
  const [busy, setBusy] = useState(false);
  const grouped = useMemo(() => {
    const groups = new Map<string, ResumeFact[]>();
    props.facts.forEach((fact) =>
      groups.set(fact.sectionTitle, [
        ...(groups.get(fact.sectionTitle) ?? []),
        fact,
      ]),
    );
    return [...groups.entries()];
  }, [props.facts]);

  function displayFactText(fact: ResumeFact): string {
    const labelParts = fact.label
      .split(" · ")
      .map((item) => item.trim())
      .filter(Boolean);
    return fact.text
      .split("\n")
      .filter((line, index) => index > 1 || !labelParts.includes(line.trim()))
      .join("\n")
      .trim();
  }

  function toggleFact(id: string): void {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSection(facts: readonly ResumeFact[]): void {
    const allSelected = facts.every((fact) => selected.has(fact.id));
    setSelected((current) => {
      const next = new Set(current);
      facts.forEach((fact) =>
        allSelected ? next.delete(fact.id) : next.add(fact.id),
      );
      return next;
    });
  }

  async function syncFacts(): Promise<void> {
    setBusy(true);
    try {
      const response = await fetch(`/next-api/jobs/${props.jobId}/facts/sync`, {
        method: "POST",
      });
      const data = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(data.error || "同步事实失败");
      toast.success("事实已从母版同步，请重新确认");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "同步事实失败");
    } finally {
      setBusy(false);
    }
  }

  async function confirmAndAnalyze(): Promise<void> {
    if (selected.size === 0) {
      toast.warning("至少选择一条真实事实");
      return;
    }
    setBusy(true);
    try {
      const confirmResponse = await fetch(
        `/next-api/jobs/${props.jobId}/facts`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            confirmedFactIds: [...selected],
            expectedContentHash: props.contentHash,
          }),
        },
      );
      const confirmData = (await confirmResponse.json()) as ApiResponse;
      if (!confirmResponse.ok)
        throw new Error(confirmData.error || "确认事实失败");

      const analyzeResponse = await fetch(
        `/next-api/jobs/${props.jobId}/analyze`,
        { method: "POST" },
      );
      const analyzeData = (await analyzeResponse.json()) as ApiResponse;
      if (!analyzeResponse.ok)
        throw new Error(analyzeData.error || "岗位分析失败");

      toast.success(`已确认 ${selected.size} 条事实并完成岗位分析`);
      router.push(`/dashboard/jobs/${props.jobId}/analysis`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "操作失败，请稍后重试",
      );
      setBusy(false);
    }
  }

  if (props.stale) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
        <h2 className="mt-4 text-lg font-semibold text-slate-800">
          母版内容已经变化
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
          当前事实快照与母版不一致。请先同步，再重新确认哪些事实可以用于岗位分析和
          AI 优化。
        </p>
        <Button
          onClick={syncFacts}
          disabled={busy}
          className="mt-5 rounded-lg bg-amber-600 text-white hover:bg-amber-700"
        >
          {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          同步母版事实
        </Button>
      </div>
    );
  }

  if (props.facts.length === 0) {
    return (
      <div className="rounded-2xl border border-white bg-white/85 p-10 text-center shadow-sm">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
        <h2 className="mt-4 text-lg font-semibold text-slate-800">
          母版中没有可确认的经历
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          请先在母版中补充教育、工作、项目或技能内容。
        </p>
        {props.baseResumeId && (
          <Button
            asChild
            className="mt-5 bg-violet-600 text-white hover:bg-violet-700"
          >
            <Link href={`/editor/${props.baseResumeId}`}>编辑母版</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 overflow-hidden rounded-xl border border-slate-200 bg-white text-center text-sm">
        <div className="px-3 py-3 text-slate-400">1 岗位信息</div>
        <div className="border-l border-slate-100 bg-gradient-to-r from-violet-600 to-fuchsia-500 px-3 py-3 font-medium text-white">
          2 选择可用经历
        </div>
        <div className="border-l border-slate-100 px-3 py-3 text-slate-400">
          3 匹配与补充
        </div>
        <div className="border-l border-slate-100 px-3 py-3 text-slate-400">
          4 审核岗位简历
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {grouped.map(([sectionTitle, facts]) => {
            const allSelected = facts.every((fact) => selected.has(fact.id));
            return (
              <section
                key={sectionTitle}
                className="rounded-2xl border border-white bg-white/85 p-5 shadow-sm backdrop-blur-md"
              >
                <div className="mb-3 flex items-center justify-between gap-4">
                  <h2 className="font-semibold text-slate-800">
                    {sectionTitle}
                  </h2>
                  <button
                    type="button"
                    onClick={() => toggleSection(facts)}
                    className="text-xs font-medium text-violet-600 hover:text-violet-700"
                  >
                    {allSelected ? "取消本模块" : "选择本模块"}
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {facts.map((fact) => (
                    <label
                      key={fact.id}
                      className={`flex cursor-pointer gap-3 py-4 ${selected.has(fact.id) ? "" : "opacity-75"}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(fact.id)}
                        onChange={() => toggleFact(fact.id)}
                        className="mt-1 h-4 w-4 accent-violet-600"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-700">
                          {fact.label}
                        </p>
                        <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-500">
                          {displayFactText(fact)}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          勾选表示：这段经历真实，并可用于当前岗位
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-2xl border border-white bg-white/90 p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-violet-600" />
              <h2 className="font-semibold text-slate-800">
                已选择 {selected.size} 段经历
              </h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              下一步会先告诉你已经能证明什么，再询问少量简历没有写清楚的要求。
            </p>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              版本 R{props.revision}
              。姓名、电话、邮箱、头像和详细地址不会用于岗位分析。
            </p>
          </section>
          <section className="rounded-2xl border border-violet-100 bg-violet-50/70 p-5">
            <h3 className="font-medium text-slate-800">内容不准确或有遗漏？</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              明显错误请回母版修改。与岗位有关但简历没写清楚的细节，可以在下一步直接补充，不需要来回编辑。
            </p>
            {props.baseResumeId && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="mt-3 border-violet-200 bg-white text-violet-700"
              >
                <Link href={`/editor/${props.baseResumeId}`}>编辑母版</Link>
              </Button>
            )}
          </section>
        </aside>
      </div>
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost">
          <Link href={`/dashboard/jobs/${props.jobId}`}>
            <ArrowLeft />
            返回岗位
          </Link>
        </Button>
        <Button
          onClick={confirmAndAnalyze}
          disabled={busy || selected.size === 0}
          className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 px-6 text-white hover:from-violet-700 hover:to-fuchsia-600"
        >
          {busy ? <Loader2 className="animate-spin" /> : <ArrowRight />}
          {busy
            ? "正在寻找可用证据…"
            : `确认 ${selected.size} 段经历并查看匹配`}
        </Button>
      </div>
    </div>
  );
}
