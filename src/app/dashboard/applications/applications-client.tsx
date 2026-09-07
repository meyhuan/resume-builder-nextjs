"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from "react";
import { ExternalLink, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
} from "@/features/applications/status";

interface ApplicationEvent {
  id: string;
  note: string | null;
  createdAt: string;
  toStatus: ApplicationStatus | null;
}
interface ApplicationItem {
  id: string;
  companyName: string;
  jobTitle: string;
  location: string | null;
  applicationUrl: string | null;
  jobUrl: string | null;
  status: ApplicationStatus;
  note: string | null;
  appliedAt: string | null;
  updatedAt: string;
  resume: { id: string; title: string } | null;
  events: ApplicationEvent[];
}

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  DRAFT: "待投递",
  APPLIED: "已投递",
  ASSESSMENT: "笔试",
  INTERVIEW: "面试",
  OFFER: "Offer",
  REJECTED: "未通过",
  WITHDRAWN: "已放弃",
};
const STATUS_STYLES: Record<ApplicationStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  APPLIED: "bg-blue-100 text-blue-700",
  ASSESSMENT: "bg-amber-100 text-amber-700",
  INTERVIEW: "bg-violet-100 text-violet-700",
  OFFER: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-rose-100 text-rose-700",
  WITHDRAWN: "bg-slate-200 text-slate-500",
};

export default function ApplicationsClient(): ReactElement {
  const [items, setItems] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | ApplicationStatus>("ALL");
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const response = await fetch("/next-api/applications", {
      credentials: "include",
    });
    if (response.ok) setItems(await response.json());
    else toast.error("读取投递记录失败");
    setLoading(false);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const visible = useMemo(
    () =>
      items.filter((item) => {
        if (filter !== "ALL" && item.status !== filter) return false;
        const keyword = query.trim().toLowerCase();
        return (
          !keyword ||
          `${item.companyName} ${item.jobTitle}`.toLowerCase().includes(keyword)
        );
      }),
    [items, filter, query],
  );

  async function update(
    id: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    const response = await fetch(`/next-api/applications/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) {
      toast.error(result.error || "更新失败");
      return;
    }
    setItems((current) =>
      current.map((item) => (item.id === id ? result : item)),
    );
    toast.success("投递记录已更新");
  }

  async function remove(id: string): Promise<void> {
    if (!window.confirm("确定删除这条投递记录吗？")) return;
    const response = await fetch(`/next-api/applications/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      toast.error("删除失败");
      return;
    }
    setItems((current) => current.filter((item) => item.id !== id));
  }

  return (
    <div className="min-h-screen bg-slate-50 px-8 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">投递管理</h1>
            <p className="mt-1 text-sm text-slate-500">
              从待投递到 Offer，集中记录每一次申请的进展。
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" />
            手动添加
          </button>
        </div>
        <div className="mb-5 flex flex-wrap gap-2">
          {(["ALL", ...APPLICATION_STATUSES] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${filter === status ? "bg-violet-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
            >
              {status === "ALL" ? "全部" : STATUS_LABELS[status]}{" "}
              <span className="ml-1 opacity-70">
                {status === "ALL"
                  ? items.length
                  : items.filter((item) => item.status === status).length}
              </span>
            </button>
          ))}
        </div>
        <div className="relative mb-5 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索公司或职位"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-violet-400"
          />
        </div>
        {loading ? (
          <p className="py-16 text-center text-sm text-slate-400">
            正在读取投递记录…
          </p>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center text-sm text-slate-400">
            暂无投递记录。使用插件填表后会自动创建待投递记录。
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-slate-900">
                        {item.jobTitle}
                      </h2>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[item.status]}`}
                      >
                        {STATUS_LABELS[item.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.companyName}
                      {item.location ? ` · ${item.location}` : ""}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      最近更新{" "}
                      {new Date(item.updatedAt).toLocaleString("zh-CN")}
                      {item.resume ? ` · 使用简历：${item.resume.title}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={item.status}
                      onChange={(event) =>
                        void update(item.id, { status: event.target.value })
                      }
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      {APPLICATION_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                    {(item.applicationUrl || item.jobUrl) && (
                      <a
                        href={item.applicationUrl || item.jobUrl || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:text-violet-600"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      onClick={() => void remove(item.id)}
                      className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="text-xs text-slate-500">
                    备注
                    <textarea
                      defaultValue={item.note || ""}
                      onBlur={(event) => {
                        if (event.target.value !== (item.note || ""))
                          void update(item.id, { note: event.target.value });
                      }}
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-violet-400"
                    />
                  </label>
                  <div>
                    <p className="text-xs text-slate-500">最近动态</p>
                    <div className="mt-1 space-y-1.5">
                      {item.events.slice(0, 3).map((event) => (
                        <p key={event.id} className="text-xs text-slate-500">
                          <span className="mr-2 text-slate-300">
                            {new Date(event.createdAt).toLocaleDateString(
                              "zh-CN",
                            )}
                          </span>
                          {event.note ||
                            (event.toStatus
                              ? STATUS_LABELS[event.toStatus]
                              : "更新记录")}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        {showCreate && (
          <CreateDialog
            onClose={() => setShowCreate(false)}
            onCreated={(item) => {
              setItems((current) => [item, ...current]);
              setShowCreate(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

function CreateDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (item: ApplicationItem) => void;
}): ReactElement {
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [applicationUrl, setApplicationUrl] = useState("");
  async function submit(): Promise<void> {
    const response = await fetch("/next-api/applications", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName, jobTitle, applicationUrl }),
    });
    const result = await response.json();
    if (!response.ok) {
      toast.error(result.error || "创建失败");
      return;
    }
    onCreated(result.application);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-slate-900">手动添加投递</h2>
        <div className="mt-5 space-y-4">
          <label className="block text-sm text-slate-600">
            公司
            <input
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm text-slate-600">
            职位
            <input
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm text-slate-600">
            申请链接
            <input
              value={applicationUrl}
              onChange={(event) => setApplicationUrl(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-slate-600"
          >
            取消
          </button>
          <button
            onClick={() => void submit()}
            disabled={!companyName.trim() || !jobTitle.trim()}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            创建
          </button>
        </div>
      </div>
    </div>
  );
}
