"use client";

import type { FormEvent, ReactElement } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
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

interface MaterialOption {
  readonly id: string;
  readonly title: string;
}
interface ApplicationCreateDialogProps {
  readonly jobId: string;
  readonly resumeId: string | null;
  readonly materials: readonly MaterialOption[];
}

function toLocalInputValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function ApplicationCreateDialog({
  jobId,
  resumeId,
  materials,
}: ApplicationCreateDialogProps): ReactElement {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const defaultAppliedAt = useMemo(() => toLocalInputValue(new Date()), []);
  const defaultNextActionAt = useMemo(() => {
    const value = new Date();
    value.setDate(value.getDate() + 3);
    value.setHours(10, 0, 0, 0);
    return toLocalInputValue(value);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const nextActionRaw = String(form.get("nextActionAt") || "");
    const payload = {
      channel: String(form.get("channel") || ""),
      appliedAt: new Date(String(form.get("appliedAt"))).toISOString(),
      resumeId,
      materialIds: form.getAll("materialIds").map(String),
      contactName: String(form.get("contactName") || ""),
      contactInfo: String(form.get("contactInfo") || ""),
      nextActionAt: nextActionRaw ? new Date(nextActionRaw).toISOString() : "",
      note: String(form.get("note") || ""),
    };
    try {
      const response = await fetch(`/next-api/jobs/${jobId}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "创建投递记录失败");
      toast.success("投递记录已创建");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white hover:from-violet-700 hover:to-fuchsia-600">
          <Send />
          记录一次投递
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-slate-200 sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>记录一次投递</DialogTitle>
          <DialogDescription>
            保存投递渠道、使用材料和下一步跟进时间。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              投递渠道 *
              <select
                name="channel"
                required
                defaultValue="BOSS 直聘"
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal"
              >
                <option>BOSS 直聘</option>
                <option>猎聘</option>
                <option>招聘官网</option>
                <option>内推</option>
                <option>邮件</option>
                <option>其他</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              投递时间 *
              <input
                name="appliedAt"
                type="datetime-local"
                required
                defaultValue={defaultAppliedAt}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal"
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              联系人
              <input
                name="contactName"
                maxLength={80}
                placeholder="例如：王 HR"
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              联系方式
              <input
                name="contactInfo"
                maxLength={160}
                placeholder="微信、邮箱或电话"
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal"
              />
            </label>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            下次跟进时间
            <input
              name="nextActionAt"
              type="datetime-local"
              defaultValue={defaultNextActionAt}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal"
            />
            <span className="mt-1.5 block text-xs font-normal text-slate-400">
              默认 3 天后提醒，你可以按招聘方约定调整。
            </span>
          </label>
          <fieldset>
            <legend className="text-sm font-medium text-slate-700">
              随投递使用的材料
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600">
                <input type="checkbox" checked readOnly />
                岗位简历
              </label>
              {materials.map((material) => (
                <label
                  key={material.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600"
                >
                  <input
                    type="checkbox"
                    name="materialIds"
                    value={material.id}
                  />
                  {material.title}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm font-medium text-slate-700">
            备注
            <textarea
              name="note"
              maxLength={4000}
              rows={4}
              placeholder="记录投递要求、联系人信息或下一步计划……"
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
              {busy ? <Loader2 className="animate-spin" /> : <Send />}
              {busy ? "正在保存…" : "保存投递记录"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
