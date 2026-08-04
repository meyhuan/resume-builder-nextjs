"use client";

import { useMemo, useState, type FormEvent, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BriefcaseBusiness,
  Check,
  ChevronDown,
  FileText,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import type { JobFitFormInitialValues } from "@/lib/job-fit/form-state";
import type { JobFitOptimizationMode } from "@/lib/job-fit/types";

export interface JobFitResumeOption {
  readonly id: string;
  readonly title: string;
  readonly template: string;
  readonly updatedAt: string;
  readonly name: string;
  readonly overview: readonly { label: string; value: string }[];
}

interface RecentTask {
  readonly id: string;
  readonly companyName: string | null;
  readonly jobTitle: string | null;
  readonly status: string;
  readonly progress: number;
  readonly createdAt: string;
  readonly optimizedScore?: number;
}

interface Props {
  readonly resumes: readonly JobFitResumeOption[];
  readonly initialResumeId?: string;
  readonly initialValues?: JobFitFormInitialValues;
  readonly recentTasks: readonly RecentTask[];
}

const FOCUS_OPTIONS = [
  ["keywords", "岗位关键词"],
  ["achievements", "成果表达"],
  ["concise", "内容精简"],
  ["structure", "结构优化"],
] as const;

export default function JobFitForm({
  resumes,
  initialResumeId,
  initialValues,
  recentTasks,
}: Props): ReactElement {
  const router = useRouter();
  const [sourceType, setSourceType] = useState<"EXISTING" | "FILE" | "TEXT">(
    initialValues?.sourceType ?? "EXISTING",
  );
  const [resumeId, setResumeId] = useState(
    initialValues?.resumeId ?? initialResumeId ?? "",
  );
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState("");
  const [companyName, setCompanyName] = useState(
    initialValues?.companyName ?? "",
  );
  const [jobTitle, setJobTitle] = useState(initialValues?.jobTitle ?? "");
  const [jobDescription, setJobDescription] = useState(
    initialValues?.jobDescription ?? "",
  );
  const [jobUrl, setJobUrl] = useState(initialValues?.jobUrl ?? "");
  const [showMore, setShowMore] = useState(Boolean(initialValues?.jobUrl));
  const [focusAreas, setFocusAreas] = useState<string[]>(
    initialValues
      ? [...initialValues.focusAreas]
      : ["keywords", "achievements", "concise"],
  );
  const [optimizationMode, setOptimizationMode] = useState<JobFitOptimizationMode>(
    initialValues?.optimizationMode ?? "PROFESSIONAL",
  );
  const [submitting, setSubmitting] = useState(false);
  const [parseProgress, setParseProgress] = useState<{
    progress: number;
    message: string;
  } | null>(null);
  const [shortConfirmed, setShortConfirmed] = useState(false);
  const selected = useMemo(
    () => resumes.find((resume) => resume.id === resumeId),
    [resumeId, resumes],
  );

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (sourceType === "EXISTING" && !resumeId) {
      toast.error("请选择一份基础简历");
      return;
    }
    if (sourceType === "FILE" && !file) {
      toast.error("请选择 PDF 或 Word 简历");
      return;
    }
    if (sourceType === "TEXT" && rawText.trim().length < 10) {
      toast.error("请粘贴至少 10 个字符的简历内容");
      return;
    }
    if (!jobTitle.trim()) {
      toast.error("请填写目标岗位");
      return;
    }
    if (jobDescription.trim().length < 20) {
      toast.error("岗位描述至少需要 20 个字符");
      return;
    }
    if (jobDescription.trim().length < 100 && !shortConfirmed) {
      setShortConfirmed(true);
      toast.warning("岗位描述较短，可能影响优化效果；再次点击即可继续");
      return;
    }
    setSubmitting(true);
    try {
      track("job_fit_started", {
        sourceType,
        jdLength: jobDescription.length,
        focusCount: focusAreas.length,
        optimizationMode,
      });
      const createResponse = await fetch("/next-api/job-fit/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          sourceType,
          sourceResumeId: sourceType === "EXISTING" ? resumeId : undefined,
          companyName,
          jobTitle,
          jobDescription,
          jobUrl,
          focusAreas,
          optimizationMode,
        }),
      });
      const created = (await createResponse.json()) as {
        taskId?: string;
        processingUrl?: string;
        error?: string;
      };
      if (!createResponse.ok || !created.taskId)
        throw new Error(created.error || "任务创建失败");
      if (sourceType === "EXISTING") {
        router.push(
          created.processingUrl ??
            `/dashboard/job-fit/${created.taskId}/processing`,
        );
        return;
      }
      const sourceBody: BodyInit =
        sourceType === "FILE"
          ? (() => {
              const form = new FormData();
              form.set("file", file!);
              return form;
            })()
          : JSON.stringify({ rawText, title: "粘贴导入的基础简历" });
      const sourceResponse = await fetch(
        `/next-api/job-fit/tasks/${created.taskId}/source`,
        {
          method: "POST",
          headers:
            sourceType === "TEXT"
              ? { "Content-Type": "application/json" }
              : undefined,
          body: sourceBody,
        },
      );
      if (!sourceResponse.ok || !sourceResponse.body)
        throw new Error("简历解析启动失败");
      await consumeSourceStream(sourceResponse.body, (progress, message) =>
        setParseProgress({ progress, message }),
      );
      router.push(`/dashboard/job-fit/${created.taskId}/processing`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "岗位定制启动失败");
      setSubmitting(false);
    }
  }

  function toggleFocus(value: string): void {
    setFocusAreas((current) =>
      current.includes(value)
        ? current.length === 1
          ? current
          : current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  return (
    <>
      {initialValues ? (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <Check className="h-4 w-4 shrink-0" />
          已恢复上次填写的简历和岗位信息，可直接修改后重新生成。
        </div>
      ) : null}
      <form
        onSubmit={submit}
        className="grid gap-6 xl:grid-cols-[minmax(0,540px)_minmax(0,580px)]"
      >
        <section className="rounded-[18px] border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-semibold text-slate-900">
            第一步：准备简历
          </h2>
          <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-xs sm:text-sm">
            {(
              [
                ["EXISTING", "已有简历"],
                ["FILE", "文件导入"],
                ["TEXT", "文本粘贴"],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                key={value}
                onClick={() => {
                  setSourceType(value);
                  track("job_fit_source_selected", { sourceType: value });
                }}
                className={`h-10 rounded-[10px] font-medium ${sourceType === value ? "bg-white text-violet-600 shadow-sm" : "text-slate-500"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {sourceType === "EXISTING" ? (
            <div className="mt-6">
              {resumes.length ? (
                <select
                  value={resumeId}
                  onChange={(event) => setResumeId(event.target.value)}
                  className="h-11 w-full rounded-[10px] border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400"
                >
                  <option value="">选择一份基础简历</option>
                  {resumes.map((resume) => (
                    <option key={resume.id} value={resume.id}>
                      {resume.title}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                  还没有基础简历，切换到文件导入或文本粘贴，也可以
                  <Link href="/dashboard" className="ml-1 underline">
                    先创建简历
                  </Link>
                  。
                </div>
              )}
              {selected ? <ResumeOverview resume={selected} /> : null}
            </div>
          ) : sourceType === "FILE" ? (
            <label className="mt-6 flex min-h-[190px] cursor-pointer flex-col items-center justify-center rounded-[14px] border border-dashed border-violet-300 bg-violet-50/50 px-5 text-center hover:bg-violet-50">
              <Upload className="h-8 w-8 text-violet-600" />
              <span className="mt-3 text-sm font-semibold text-slate-800">
                {file?.name || "选择 PDF 或 Word 简历"}
              </span>
              <span className="mt-1 text-xs text-slate-500">
                PDF / DOC / DOCX，最大 8MB
              </span>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="sr-only"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
          ) : (
            <textarea
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              className="mt-6 min-h-[220px] w-full rounded-[14px] border border-slate-200 p-4 text-sm leading-7 outline-none focus:border-violet-400"
              placeholder="粘贴你的完整简历内容，AI 会先保存为可编辑的基础简历。"
            />
          )}
          <div className="mt-6 rounded-[10px] bg-slate-50 p-4 text-xs leading-5 text-slate-500">
            原简历会保留不变。AI 将生成独立岗位版本，并自动保存到你的账户。
          </div>
        </section>

        <section className="rounded-[18px] border border-slate-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <BriefcaseBusiness className="h-5 w-5" />
            第二步：目标岗位信息
          </h2>
          <Field label="公司名称（可选）">
            <input
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              maxLength={100}
              placeholder="例如：阿里巴巴、腾讯、字节跳动"
              className="h-[52px] w-full rounded-[10px] border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-violet-400"
            />
          </Field>
          <Field label="岗位名称 *">
            <input
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
              maxLength={100}
              placeholder="例如：产品经理"
              className="h-[52px] w-full rounded-[10px] border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-violet-400"
            />
          </Field>
          <Field label="岗位描述 / JD *">
            <textarea
              value={jobDescription}
              onChange={(event) => {
                setJobDescription(event.target.value.slice(0, 10000));
                setShortConfirmed(false);
              }}
              placeholder="粘贴岗位职责和任职要求"
              className="min-h-[190px] w-full rounded-[10px] border border-slate-200 bg-slate-50 p-3 text-[13px] leading-6 outline-none focus:border-violet-400"
            />
            <div className="mt-1 flex justify-between text-[11px]">
              <span
                className={
                  jobDescription.length > 0 && jobDescription.length < 100
                    ? "text-amber-600"
                    : "text-emerald-600"
                }
              >
                {jobDescription.length >= 100
                  ? `✓ 已识别约 ${Math.max(1, Math.round(jobDescription.length / 55))} 项岗位要求`
                  : jobDescription.length
                    ? "岗位描述较短，建议补充完整要求"
                    : ""}
              </span>
              <span className="text-slate-400">
                {jobDescription.length}/10000
              </span>
            </div>
          </Field>
          <button
            type="button"
            onClick={() => setShowMore((value) => !value)}
            className="mt-4 flex items-center gap-1 text-xs font-medium text-slate-500"
          >
            更多信息（可选）
            <ChevronDown
              className={`h-3.5 w-3.5 transition ${showMore ? "rotate-180" : ""}`}
            />
          </button>
          {showMore ? (
            <Field label="岗位链接">
              <input
                value={jobUrl}
                onChange={(event) => setJobUrl(event.target.value)}
                type="url"
                placeholder="https://..."
                className="h-[52px] w-full rounded-[10px] border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-violet-400"
              />
            </Field>
          ) : null}
          <div className="mt-5">
            <p className="text-xs font-semibold text-slate-700">优化方式</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setOptimizationMode("PROFESSIONAL");
                  track("job_fit_mode_selected", { optimizationMode: "PROFESSIONAL" });
                }}
                className={`rounded-xl border p-3 text-left transition ${optimizationMode === "PROFESSIONAL" ? "border-violet-400 bg-violet-50" : "border-slate-200 bg-white hover:border-violet-200"}`}
              >
                <span className="flex items-center justify-between text-sm font-semibold text-slate-900">
                  专业优化
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-600">推荐</span>
                </span>
                <span className="mt-1 block text-[11px] leading-5 text-slate-500">基于已有事实，积极突出可迁移能力</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOptimizationMode("SPRINT");
                  track("job_fit_mode_selected", { optimizationMode: "SPRINT" });
                }}
                className={`rounded-xl border p-3 text-left transition ${optimizationMode === "SPRINT" ? "border-fuchsia-400 bg-fuchsia-50" : "border-slate-200 bg-white hover:border-fuchsia-200"}`}
              >
                <span className="text-sm font-semibold text-slate-900">冲刺增强</span>
                <span className="mt-1 block text-[11px] leading-5 text-slate-500">补强相邻技能与合理估算，内容仍可直接投递</span>
              </button>
            </div>
          </div>
          <div className="mt-5">
            <p className="text-xs font-semibold text-slate-700">优化重点</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {FOCUS_OPTIONS.map(([value, label]) => {
                const active = focusAreas.includes(value);
                return (
                  <button
                    type="button"
                    key={value}
                    onClick={() => toggleFocus(value)}
                    className={`flex h-9 items-center gap-1 rounded-[9px] border px-3 text-xs font-medium ${active ? "border-violet-400 bg-violet-50 text-violet-600" : "border-slate-200 text-slate-500"}`}
                  >
                    {active ? <Check className="h-3.5 w-3.5" /> : null}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className={`mt-6 rounded-[10px] p-3 text-xs leading-5 text-slate-500 ${optimizationMode === "SPRINT" ? "bg-amber-50" : "bg-emerald-50"}`}>
            <strong className={`block ${optimizationMode === "SPRINT" ? "text-amber-700" : "text-emerald-700"}`}>
              {optimizationMode === "SPRINT" ? "AI 会补强可能具备的能力和合理约数" : "✓ 关键履历事实保持不变"}
            </strong>
            {optimizationMode === "SPRINT"
              ? "结果页会标出 AI 推断内容，你可以直接编辑或删除；公司、学校、职位、日期和资质不会被修改。"
              : "AI 只使用已有事实和相近经历，不修改联系方式、公司、学校、职位和日期。"}
          </div>
        </section>
        <div className="xl:col-span-2 flex flex-col items-center">
          <button
            disabled={submitting}
            className="flex h-12 w-full max-w-[388px] items-center justify-center rounded-xl bg-violet-600 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {parseProgress?.message || "正在创建任务"}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                生成岗位定制版
              </>
            )}
          </button>
          {parseProgress ? (
            <div className="mt-2 h-1.5 w-full max-w-[388px] overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-violet-600 transition-all"
                style={{ width: `${parseProgress.progress}%` }}
              />
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-slate-400">
              预计需要 20–30 秒，可在生成开始后离开页面
            </p>
          )}
        </div>
      </form>
      <RecentTasks tasks={recentTasks} />
    </>
  );
}

function Field({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}): ReactElement {
  return (
    <label className="mt-5 block">
      <span className="mb-2 block text-xs font-semibold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function ResumeOverview({
  resume,
}: {
  readonly resume: JobFitResumeOption;
}): ReactElement {
  return (
    <div className="mt-4 rounded-[14px] border border-violet-400 bg-violet-50 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-slate-900">{resume.title}</p>
          <p className="mt-1 text-xs text-slate-500">
            {resume.name} · {resume.template} · 更新于{" "}
            {new Date(resume.updatedAt).toLocaleDateString("zh-CN")}
          </p>
        </div>
        <FileText className="h-5 w-5 text-violet-600" />
      </div>
      <div className="mt-4 divide-y divide-violet-100">
        {resume.overview.map((item) => (
          <div key={item.label} className="flex justify-between py-2.5 text-xs">
            <span className="text-slate-500">{item.label}</span>
            <span className="font-medium text-slate-800">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentTasks({
  tasks,
}: {
  readonly tasks: readonly RecentTask[];
}): ReactElement | null {
  if (!tasks.length) return null;
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-slate-900">最近岗位定制</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {tasks.map((task) => {
          const href =
            task.status === "COMPLETED"
              ? `/dashboard/job-fit/${task.id}/result`
              : `/dashboard/job-fit/${task.id}/processing`;
          return (
            <Link
              key={task.id}
              href={href}
              className="rounded-xl border border-slate-200 bg-white p-4 hover:border-violet-300"
            >
              <p className="truncate text-sm font-semibold text-slate-900">
                {task.jobTitle || "未命名岗位"}
              </p>
              <p className="mt-1 truncate text-xs text-slate-500">
                {task.companyName || "未填写公司"}
              </p>
              <div className="mt-4 flex items-center justify-between text-[11px]">
                <span className="text-violet-600">
                  {statusLabel(task.status, task.progress)}
                </span>
                {typeof task.optimizedScore === "number" ? (
                  <span className="font-semibold text-emerald-600">
                    {task.optimizedScore} 分
                  </span>
                ) : (
                  <span className="text-slate-400">
                    {new Date(task.createdAt).toLocaleDateString("zh-CN")}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function statusLabel(status: string, progress: number): string {
  if (status === "COMPLETED") return "已生成";
  if (status === "FAILED") return "生成失败 · 可重试";
  if (status === "CANCELLED") return "已取消";
  if (status === "EXPIRED") return "已过期 · 可重试";
  return `生成中 ${progress}%`;
}

async function consumeSourceStream(
  stream: ReadableStream<Uint8Array>,
  onStage: (progress: number, message: string) => void,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const event of events) {
      const line = event.split("\n").find((item) => item.startsWith("data: "));
      if (!line) continue;
      const data = JSON.parse(line.slice(6)) as {
        type: string;
        progress?: number;
        message?: string;
        error?: string;
      };
      if (data.type === "stage")
        onStage(data.progress ?? 0, data.message ?? "正在解析");
      if (data.type === "error") throw new Error(data.error || "简历解析失败");
    }
  }
}
