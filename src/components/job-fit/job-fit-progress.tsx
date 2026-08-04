"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RefreshCcw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";

interface TaskState {
  readonly id: string;
  readonly companyName: string | null;
  readonly jobTitle: string | null;
  readonly status: string;
  readonly stage: string;
  readonly progress: number;
  readonly errorMessage: string | null;
  readonly retryable: boolean;
  readonly cancelRequestedAt: string | null;
}

const STAGES = [
  {
    key: "PREPARE",
    title: "准备简历优化材料",
    description: "锁定原始简历快照，保护基础简历不被覆盖",
  },
  {
    key: "ANALYZE",
    title: "分析岗位匹配",
    description: "识别岗位关键词、能力要求和可验证证据",
  },
  {
    key: "OPTIMIZE",
    title: "生成岗位定制内容",
    description: "在不编造事实的前提下优化表达与重点",
  },
  {
    key: "EXPLAIN",
    title: "生成优化说明",
    description: "计算前后分数并整理每一处 AI 改动",
  },
] as const;

export default function JobFitProgress({
  initialTask,
}: {
  readonly initialTask: TaskState;
}): ReactElement {
  const router = useRouter();
  const [task, setTask] = useState(initialTask);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (task.status === "COMPLETED") {
      track("job_fit_completed", { taskId: task.id });
      router.replace(`/dashboard/job-fit/${task.id}/result`);
      return;
    }
    if (!["READY", "QUEUED", "RUNNING"].includes(task.status)) return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/next-api/job-fit/tasks/${task.id}`, {
          cache: "no-store",
        });
        const body = (await response.json()) as { task?: TaskState };
        if (response.ok && body.task) setTask(body.task);
      } catch {
        /* a transient polling error must not stop the persisted task */
      }
    }, 1500);
    return () => window.clearInterval(timer);
  }, [router, task.id, task.status]);

  async function cancel(): Promise<void> {
    if (
      !window.confirm(
        "确定取消本次岗位定制吗？已填写的信息会保留，可稍后重试。",
      )
    )
      return;
    setBusy(true);
    const response = await fetch(`/next-api/job-fit/tasks/${task.id}/cancel`, {
      method: "POST",
    });
    const body = (await response.json()) as { status?: string };
    setTask((current) => ({
      ...current,
      status: body.status === "CANCELLING" ? "RUNNING" : "CANCELLED",
      cancelRequestedAt: new Date().toISOString(),
    }));
    track("job_fit_cancelled", { taskId: task.id });
    setBusy(false);
  }

  async function retry(): Promise<void> {
    setBusy(true);
    const response = await fetch(`/next-api/job-fit/tasks/${task.id}/retry`, {
      method: "POST",
      headers: { "X-Idempotency-Key": crypto.randomUUID() },
    });
    const body = (await response.json()) as {
      taskId?: string;
      processingUrl?: string;
      error?: string;
    };
    if (response.ok && body.taskId) {
      track("job_fit_retry", { taskId: task.id, retryTaskId: body.taskId });
      router.replace(
        body.processingUrl ?? `/dashboard/job-fit/${body.taskId}/processing`,
      );
    } else {
      setBusy(false);
    }
  }

  const activeIndex = Math.max(
    0,
    STAGES.findIndex((stage) => stage.key === task.stage),
  );
  const terminal = ["FAILED", "CANCELLED", "EXPIRED"].includes(task.status);
  return (
    <div className="mx-auto max-w-[1080px]">
      <header className="text-center">
        <p className="text-sm font-medium text-violet-600">
          {task.companyName || "目标公司"} · {task.jobTitle || "目标岗位"}
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">
          {terminal ? "本次生成已停止" : "正在生成你的岗位定制版"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          任务已保存，可以安全离开此页面，完成后结果会自动保存。
        </p>
      </header>
      <section className="mt-8 rounded-[18px] border border-slate-200 bg-white p-7">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-800">整体进度</span>
          <span className="font-bold text-violet-600">{task.progress}%</span>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-violet-600 transition-all duration-500 motion-reduce:transition-none"
            style={{ width: `${task.progress}%` }}
          />
        </div>
        <div className="mt-6 space-y-3">
          {STAGES.map((stage, index) => {
            const done = !terminal && index < activeIndex;
            const active = !terminal && index === activeIndex;
            return (
              <div
                key={stage.key}
                className={`flex min-h-[112px] items-start gap-4 rounded-xl border p-5 ${active ? "border-violet-400 bg-violet-50" : "border-slate-200 bg-white"}`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${done ? "bg-emerald-50 text-emerald-600" : active ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-400"}`}
                >
                  {done ? (
                    <Check className="h-5 w-5" />
                  ) : active ? (
                    <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" />
                  ) : (
                    index + 1
                  )}
                </span>
                <div>
                  <h2 className="font-semibold text-slate-900">
                    {stage.title}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {stage.description}
                  </p>
                  {active ? (
                    <p className="mt-3 inline-flex items-center rounded-lg bg-white px-3 py-2 text-xs text-violet-600">
                      <Sparkles className="mr-2 h-3.5 w-3.5" />
                      AI 正在处理，本阶段进度会自动更新
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        {task.status === "FAILED" ? (
          <div className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
            <strong>生成失败：</strong>
            {task.errorMessage || "服务暂时不可用，请重试。"}
          </div>
        ) : null}
        {task.status === "CANCELLED" ? (
          <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            本次生成已取消，额度已退回。
          </div>
        ) : null}
        <div className="mt-6 flex justify-center gap-3">
          {terminal ? (
            <>
              <Button
                onClick={retry}
                disabled={busy}
                className="rounded-xl bg-violet-600 hover:bg-violet-700"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                重新尝试
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  router.push(`/dashboard/job-fit?taskId=${task.id}`)
                }
                className="rounded-xl"
              >
                返回修改输入
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              disabled={busy || Boolean(task.cancelRequestedAt)}
              onClick={cancel}
              className="text-slate-500"
            >
              <X className="mr-2 h-4 w-4" />
              {task.cancelRequestedAt ? "正在取消" : "取消生成"}
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
