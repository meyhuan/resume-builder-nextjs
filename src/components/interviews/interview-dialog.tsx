"use client";

import type { FormEvent, ReactElement } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  INTERVIEW_RESULTS,
  INTERVIEW_RESULT_LABEL,
} from "@/lib/interviews/interview-contracts";

interface InterviewDraft {
  readonly id: string;
  readonly round: string;
  readonly scheduledAt: string | null;
  readonly interviewer: string | null;
  readonly questions: readonly string[];
  readonly answers: readonly string[];
  readonly review: string | null;
  readonly nextActions: readonly string[];
  readonly result: string;
}

function localDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function lines(value: FormDataEntryValue | null): string[] {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function InterviewDialog({
  applicationId,
  interview,
}: {
  readonly applicationId: string;
  readonly interview?: InterviewDraft;
}): ReactElement {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const scheduledAt = String(form.get("scheduledAt") || "");
    const payload = {
      round: String(form.get("round")),
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : "",
      interviewer: String(form.get("interviewer") || ""),
      questions: lines(form.get("questions")),
      answers: lines(form.get("answers")),
      review: String(form.get("review") || ""),
      nextActions: lines(form.get("nextActions")),
      result: String(form.get("result")),
    };
    try {
      const response = await fetch(
        interview
          ? `/next-api/interviews/${interview.id}`
          : `/next-api/applications/${applicationId}/interviews`,
        {
          method: interview ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "保存面试记录失败");
      toast.success(interview ? "面试记录已更新" : "面试记录已创建");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="border-violet-200 bg-white text-violet-700"
        >
          {interview ? <Pencil /> : <CalendarPlus />}
          {interview ? "编辑面试" : "记录面试"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>
            {interview ? "编辑面试记录" : "面试后 3 分钟复盘"}
          </DialogTitle>
          <DialogDescription>
            先记录真实问题和没有答完整的部分，系统会把下一步准备带回岗位工作台。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              面试轮次 *
              <input
                name="round"
                defaultValue={interview?.round ?? "一面"}
                required
                maxLength={80}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              面试时间
              <input
                name="scheduledAt"
                type="datetime-local"
                defaultValue={localDateTime(interview?.scheduledAt ?? null)}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal"
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              面试官
              <input
                name="interviewer"
                defaultValue={interview?.interviewer ?? ""}
                maxLength={120}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              结果
              <select
                name="result"
                defaultValue={interview?.result ?? "PENDING"}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal"
              >
                {INTERVIEW_RESULTS.map((result) => (
                  <option key={result} value={result}>
                    {INTERVIEW_RESULT_LABEL[result]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              面试官重点问了什么？
              <textarea
                name="questions"
                defaultValue={interview?.questions.join("\n") ?? ""}
                rows={6}
                placeholder="每行一题，例如：如何判断重点商品？"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal leading-6"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              我的回答要点
              <textarea
                name="answers"
                defaultValue={interview?.answers.join("\n") ?? ""}
                rows={6}
                placeholder="每行对应一题，记录当时实际回答"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal leading-6"
              />
            </label>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            哪部分回答得不够完整？
            <textarea
              name="review"
              defaultValue={interview?.review ?? ""}
              rows={4}
              maxLength={10000}
              placeholder="例如：竞品分析只说了会看竞品，没有讲观察维度和结论如何影响动作。"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal leading-6"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            下一轮优先准备什么？（每行一条）
            <textarea
              name="nextActions"
              defaultValue={interview?.nextActions.join("\n") ?? ""}
              rows={3}
              placeholder="例如：补充竞品分析的完整项目故事"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal leading-6"
            />
          </label>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={busy}
              className="bg-violet-600 text-white hover:bg-violet-700"
            >
              {busy && <Loader2 className="animate-spin" />}保存并更新下一步
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
