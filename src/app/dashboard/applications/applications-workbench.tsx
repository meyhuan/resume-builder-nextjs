"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Popover from "@radix-ui/react-popover";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock3,
  ExternalLink,
  FileText,
  Inbox,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { toast } from "sonner";
import { applicationRequest } from "@/features/applications/client-request";
import {
  APPLICATION_ACTION_TYPES,
  APPLICATION_STATUSES,
  type ApplicationActionType,
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
  sourceDomain: string | null;
  status: ApplicationStatus;
  note: string | null;
  appliedAt: string | null;
  deadlineAt: string | null;
  nextActionAt: string | null;
  nextActionType: ApplicationActionType | null;
  createdAt: string;
  updatedAt: string;
  resume: { id: string; title: string } | null;
  events: ApplicationEvent[];
}

type ViewFilter = "TODO" | "ACTIVE" | "CLOSED" | "ALL";
type AttentionFilter = "DRAFT" | "DUE" | "INTERVIEW" | "STALE" | null;

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
  DRAFT: "bg-slate-100 text-slate-700",
  APPLIED: "bg-blue-50 text-blue-700",
  ASSESSMENT: "bg-amber-50 text-amber-800",
  INTERVIEW: "bg-violet-50 text-violet-700",
  OFFER: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-rose-50 text-rose-700",
  WITHDRAWN: "bg-slate-100 text-slate-500",
};

const ACTION_LABELS: Record<ApplicationActionType, string> = {
  COMPLETE_APPLICATION: "完成投递",
  FOLLOW_UP: "跟进状态",
  ASSESSMENT: "完成笔试",
  INTERVIEW: "参加面试",
  DECISION: "确认 Offer",
};

const VIEW_LABELS: Record<ViewFilter, string> = {
  TODO: "待处理",
  ACTIVE: "进行中",
  CLOSED: "已结束",
  ALL: "全部",
};

const CLOSED_STATUSES = new Set<ApplicationStatus>([
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
]);
const ACTIVE_STATUSES = new Set<ApplicationStatus>([
  "APPLIED",
  "ASSESSMENT",
  "INTERVIEW",
]);

export default function ApplicationsWorkbench(): ReactElement {
  const [items, setItems] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewFilter>("TODO");
  const [attention, setAttention] = useState<AttentionFilter>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loadError, setLoadError] = useState("");
  const pending = useRef(new Set<string>());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  function release(id: string): void {
    pending.current.delete(id);
    setPendingIds(new Set(pending.current));
  }

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setLoadError("");
    try {
      setItems(
        await applicationRequest<ApplicationItem[]>("/next-api/applications"),
      );
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "没有读到投递记录，请重试。",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const attentionGroups = useMemo(() => buildAttentionGroups(items), [items]);
  const attentionTotal = useMemo(
    () =>
      new Set(
        Object.values(attentionGroups)
          .flat()
          .map((item) => item.id),
      ).size,
    [attentionGroups],
  );

  const counts = useMemo(
    () => ({
      TODO: items.filter((item) => item.status === "DRAFT").length,
      ACTIVE: items.filter((item) => ACTIVE_STATUSES.has(item.status)).length,
      CLOSED: items.filter((item) => CLOSED_STATUSES.has(item.status)).length,
      ALL: items.length,
    }),
    [items],
  );

  const visible = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return items.filter((item) => {
      if (
        attention &&
        !attentionGroups[attention].some(({ id }) => id === item.id)
      )
        return false;
      if (!attention) {
        if (view === "TODO" && item.status !== "DRAFT") return false;
        if (view === "ACTIVE" && !ACTIVE_STATUSES.has(item.status))
          return false;
        if (view === "CLOSED" && !CLOSED_STATUSES.has(item.status))
          return false;
      }
      return (
        !keyword ||
        `${item.companyName} ${item.jobTitle} ${item.location || ""}`
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [attention, attentionGroups, items, query, view]);

  const selected = items.find((item) => item.id === selectedId) || null;

  async function update(
    id: string,
    body: Record<string, unknown>,
  ): Promise<ApplicationItem | null> {
    if (pending.current.has(id)) return null;
    pending.current.add(id);
    setPendingIds(new Set(pending.current));
    try {
      const result = await applicationRequest<ApplicationItem>(
        `/next-api/applications/${id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      setItems((current) =>
        current.map((item) => (item.id === id ? result : item)),
      );
      return result;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "没有保存这次修改，请重试。",
      );
      return null;
    } finally {
      release(id);
    }
  }

  async function remove(id: string): Promise<boolean> {
    if (pending.current.has(id)) return false;
    pending.current.add(id);
    setPendingIds(new Set(pending.current));
    try {
      await applicationRequest(`/next-api/applications/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setItems((current) => current.filter((item) => item.id !== id));
      setSelectedId(null);
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "没有删除这条记录，请重试。",
      );
      return false;
    } finally {
      release(id);
    }
  }

  function selectAttention(next: Exclude<AttentionFilter, null>): void {
    if (attention === next) {
      setAttention(null);
      return;
    }
    setAttention(next);
    setView("ALL");
  }

  return (
    <div className="applications-workbench min-h-screen overflow-x-clip bg-slate-50/70 px-4 py-6 text-slate-900 sm:px-6 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-[1180px]">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[28px] font-bold tracking-[-0.03em] text-slate-950">
              投递管理
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              先处理今天要做的事，再回看每一次申请的进展。
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white shadow-sm transition-[background-color,transform] duration-150 hover:bg-violet-700 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            添加投递
          </button>
        </header>

        <section className="mt-6 grid overflow-hidden rounded-2xl border border-slate-200 bg-white lg:grid-cols-[1.25fr_1fr]">
          <button
            type="button"
            onClick={() => {
              setAttention(null);
              setView(attentionTotal ? "TODO" : "ACTIVE");
            }}
            className="group flex min-h-40 items-end justify-between gap-6 p-6 text-left transition-colors duration-150 hover:bg-slate-50 active:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-violet-600"
          >
            <div>
              <p className="text-sm font-medium text-slate-500">现在要处理</p>
              <p className="mt-3 text-4xl font-bold tracking-[-0.04em] text-slate-950 tabular-nums">
                {attentionTotal}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {attentionTotal ? "项申请需要你留意" : "今天没有必须处理的事项"}
              </p>
            </div>
            <ArrowRight
              className="mb-1 h-5 w-5 text-slate-400 transition-transform duration-150 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </button>
          <div className="grid grid-cols-2 border-t border-slate-200 lg:border-l lg:border-t-0">
            <AttentionButton
              label="待完成"
              count={attentionGroups.DRAFT.length}
              icon={<Inbox className="h-4 w-4" />}
              active={attention === "DRAFT"}
              onClick={() => selectAttention("DRAFT")}
            />
            <AttentionButton
              label="临近截止"
              count={attentionGroups.DUE.length}
              icon={<AlertCircle className="h-4 w-4" />}
              active={attention === "DUE"}
              onClick={() => selectAttention("DUE")}
            />
            <AttentionButton
              label="即将面试"
              count={attentionGroups.INTERVIEW.length}
              icon={<CalendarClock className="h-4 w-4" />}
              active={attention === "INTERVIEW"}
              onClick={() => selectAttention("INTERVIEW")}
            />
            <AttentionButton
              label="久未更新"
              count={attentionGroups.STALE.length}
              icon={<Clock3 className="h-4 w-4" />}
              active={attention === "STALE"}
              onClick={() => selectAttention("STALE")}
            />
          </div>
        </section>

        <section className="mt-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div
              className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1"
              aria-label="投递记录分类"
            >
              {(Object.keys(VIEW_LABELS) as ViewFilter[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setView((current) => (current === key ? "ALL" : key));
                    setAttention(null);
                  }}
                  className={`min-h-10 shrink-0 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-600 ${
                    view === key && !attention
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  {VIEW_LABELS[key]}
                  <span className="ml-1.5 text-xs text-slate-400 tabular-nums">
                    {counts[key]}
                  </span>
                </button>
              ))}
            </div>
            <label className="relative block w-full lg:w-72">
              <span className="sr-only">搜索公司、职位或地点</span>
              <Search
                className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索公司、职位或地点"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-2 outline-transparent placeholder:text-slate-400 hover:bg-slate-50 focus-visible:outline-violet-600"
              />
            </label>
          </div>

          {attention && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-800">
              <span>正在查看：{attentionLabel(attention)}</span>
              <button
                type="button"
                onClick={() => {
                  setAttention(null);
                  setView("ALL");
                }}
                className="min-h-9 whitespace-nowrap rounded-lg px-2 font-medium hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-violet-600"
              >
                清除筛选
              </button>
            </div>
          )}

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {loading ? (
              <ApplicationSkeleton />
            ) : loadError ? (
              <div role="alert" className="p-6 text-sm text-rose-700">
                <p>{loadError}</p>
                <button
                  onClick={() => void load()}
                  className="mt-3 rounded-lg border px-4 py-2"
                >
                  重新读取投递记录
                </button>
              </div>
            ) : visible.length === 0 ? (
              <EmptyState
                hasItems={items.length > 0}
                onCreate={() => setShowCreate(true)}
                onClear={() => {
                  setQuery("");
                  setAttention(null);
                  setView("ALL");
                }}
              />
            ) : (
              <div aria-live="polite">
                {visible.map((item) => (
                  <ApplicationRow
                    key={item.id}
                    item={item}
                    pending={pendingIds.has(item.id)}
                    onOpen={() => setSelectedId(item.id)}
                    onUpdate={(body) => void update(item.id, body)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <ApplicationDrawer
        key={selected?.id || "closed"}
        item={selected}
        pending={selected ? pendingIds.has(selected.id) : false}
        onClose={() => setSelectedId(null)}
        onUpdate={update}
        onRemove={remove}
      />
      <CreateDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={(item) => {
          setItems((current) => [
            item,
            ...current.filter((existing) => existing.id !== item.id),
          ]);
          setView("ALL");
          setAttention(null);
          setQuery("");
          setShowCreate(false);
          setSelectedId(item.id);
        }}
      />
    </div>
  );
}

function AttentionButton({
  label,
  count,
  icon,
  active,
  onClick,
}: {
  label: string;
  count: number;
  icon: ReactElement;
  active: boolean;
  onClick: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-20 items-center justify-between gap-3 border-b border-r border-slate-100 px-4 text-left transition-colors duration-150 last:border-r-0 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-violet-600 ${
        active ? "bg-violet-50" : "bg-white"
      }`}
    >
      <span className="flex items-center gap-2 text-sm text-slate-600">
        <span className={active ? "text-violet-600" : "text-slate-400"}>
          {icon}
        </span>
        {label}
      </span>
      <strong className="text-lg text-slate-950 tabular-nums">{count}</strong>
    </button>
  );
}

function ApplicationRow({
  item,
  pending,
  onOpen,
  onUpdate,
}: {
  item: ApplicationItem;
  pending: boolean;
  onOpen: () => void;
  onUpdate: (body: Record<string, unknown>) => void;
}): ReactElement {
  const next = nextPrimaryAction(item.status);
  const timing = item.nextActionAt
    ? `${item.nextActionType ? ACTION_LABELS[item.nextActionType] : "下一步"} · ${formatDateTime(item.nextActionAt)}`
    : statusAge(item);

  return (
    <article className="group border-b border-slate-100 last:border-b-0">
      <div className="grid gap-4 px-4 py-5 sm:px-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(220px,.65fr)_180px] lg:items-center">
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-600"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
              {item.companyName.slice(0, 1)}
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className="truncate text-base font-semibold text-slate-950">
                  {item.jobTitle}
                </span>
                <StatusBadge status={item.status} />
              </span>
              <span className="mt-1 block truncate text-sm text-slate-600">
                {item.companyName}
                {item.location ? ` · ${item.location}` : ""}
              </span>
            </span>
          </div>
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-600"
        >
          <span className="block text-xs font-medium text-slate-400">
            下一步
          </span>
          <span className="mt-1 block truncate text-sm text-slate-700">
            {timing}
          </span>
          {item.resume && (
            <span className="mt-1 flex items-center gap-1 truncate text-xs text-slate-400">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              {item.resume.title}
            </span>
          )}
        </button>
        <div className="flex items-center justify-end gap-2">
          {next ? (
            <button
              type="button"
              onClick={() => onUpdate({ status: next.status })}
              disabled={pending}
              className="inline-flex min-h-10 items-center whitespace-nowrap rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition-[background-color,transform] duration-150 hover:bg-slate-50 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
            >
              {next.label}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onOpen}
            aria-label={`查看 ${item.companyName} ${item.jobTitle} 详情`}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}

function ApplicationDrawer({
  item,
  pending,
  onClose,
  onUpdate,
  onRemove,
}: {
  item: ApplicationItem | null;
  pending: boolean;
  onClose: () => void;
  onUpdate: (
    id: string,
    body: Record<string, unknown>,
  ) => Promise<ApplicationItem | null>;
  onRemove: (id: string) => Promise<boolean>;
}): ReactElement {
  const [status, setStatus] = useState<ApplicationStatus>(
    item?.status || "DRAFT",
  );
  const [note, setNote] = useState(item?.note || "");
  const [nextActionType, setNextActionType] = useState<
    ApplicationActionType | ""
  >(item?.nextActionType || "");
  const [nextActionAt, setNextActionAt] = useState(
    toLocalDateTime(item?.nextActionAt),
  );
  const [deadlineAt, setDeadlineAt] = useState(
    toLocalDateTime(item?.deadlineAt),
  );
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const dirty = Boolean(
    item &&
      (status !== item.status ||
        note !== (item.note || "") ||
        nextActionType !== (item.nextActionType || "") ||
        nextActionAt !== toLocalDateTime(item.nextActionAt) ||
        deadlineAt !== toLocalDateTime(item.deadlineAt)),
  );

  async function save(): Promise<void> {
    if (!item || saving || pending) return;
    setSaving(true);
    try {
      const result = await onUpdate(item.id, {
        status,
        note,
        nextActionType: nextActionType || null,
        nextActionAt: toIsoDateTime(nextActionAt),
        deadlineAt: toIsoDateTime(deadlineAt),
      });
      if (result) onClose();
    } catch {
      toast.error("没有保存这次修改，请保留内容后重试。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog.Root
      open={Boolean(item)}
      onOpenChange={(open) => {
        if (
          !open &&
          !saving &&
          !pending &&
          (!dirty || window.confirm("有未保存的投递修改，确定关闭吗？"))
        )
          onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="application-drawer-overlay fixed inset-0 z-[400] bg-slate-950/30" />
        <Dialog.Content className="application-drawer fixed inset-y-0 right-0 z-[401] flex w-full max-w-xl flex-col bg-white shadow-2xl focus:outline-none">
          {item && (
            <>
              <header className="flex items-start justify-between gap-5 border-b border-slate-200 px-5 py-5 sm:px-7">
                <div className="min-w-0">
                  <Dialog.Title className="break-words text-xl font-bold tracking-[-0.02em] text-slate-950">
                    {item.jobTitle}
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-slate-600">
                    {item.companyName}
                    {item.location ? ` · ${item.location}` : ""}
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label="关闭详情"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-violet-600"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </Dialog.Close>
              </header>

              <fieldset
                disabled={saving || pending}
                className="applications-scrollbar min-w-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7"
              >
                <section>
                  <h2 className="text-sm font-semibold text-slate-950">
                    当前进展
                  </h2>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <Field label="投递状态">
                      <select
                        value={status}
                        onChange={(event) =>
                          setStatus(event.target.value as ApplicationStatus)
                        }
                        className="application-input"
                      >
                        {APPLICATION_STATUSES.map((value) => (
                          <option key={value} value={value}>
                            {STATUS_LABELS[value]}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="下一步行动">
                      <select
                        value={nextActionType}
                        onChange={(event) =>
                          setNextActionType(
                            event.target.value as ApplicationActionType | "",
                          )
                        }
                        className="application-input"
                      >
                        <option value="">暂未安排</option>
                        {APPLICATION_ACTION_TYPES.map((value) => (
                          <option key={value} value={value}>
                            {ACTION_LABELS[value]}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="下一步时间">
                      <DateTimePicker
                        value={nextActionAt}
                        onChange={setNextActionAt}
                        placeholder="选择下一步日期和时间"
                      />
                    </Field>
                    <Field label="网申截止时间">
                      <DateTimePicker
                        value={deadlineAt}
                        onChange={setDeadlineAt}
                        placeholder="选择网申截止时间"
                      />
                    </Field>
                  </div>
                </section>

                <section className="mt-8 border-t border-slate-200 pt-6">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold text-slate-950">
                      职位与简历
                    </h2>
                    {(item.applicationUrl || item.jobUrl) && (
                      <a
                        href={item.applicationUrl || item.jobUrl || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-lg px-2 text-sm font-medium text-violet-700 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-600"
                      >
                        打开招聘官网{" "}
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <Meta
                      label="使用简历"
                      value={item.resume?.title || "未关联简历"}
                    />
                    <Meta
                      label="记录来源"
                      value={item.sourceDomain || "手动添加"}
                    />
                    <Meta
                      label="创建时间"
                      value={formatDateTime(item.createdAt)}
                    />
                    <Meta
                      label="最近更新"
                      value={formatDateTime(item.updatedAt)}
                    />
                  </dl>
                </section>

                <section className="mt-8 border-t border-slate-200 pt-6">
                  <Field label="备注">
                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      rows={5}
                      placeholder="记录联系人、面试重点或需要跟进的事项"
                      className="application-input min-h-28 resize-y py-3"
                    />
                  </Field>
                </section>

                <section className="mt-8 border-t border-slate-200 pt-6">
                  <h2 className="text-sm font-semibold text-slate-950">
                    进展记录
                  </h2>
                  <div className="mt-4 space-y-4">
                    {item.events.length ? (
                      item.events.map((event) => (
                        <div
                          key={event.id}
                          className="grid grid-cols-[16px_minmax(0,1fr)] gap-3"
                        >
                          <CircleDot
                            className="mt-0.5 h-4 w-4 text-slate-300"
                            aria-hidden="true"
                          />
                          <div>
                            <p className="text-sm text-slate-700">
                              {event.note ||
                                (event.toStatus
                                  ? STATUS_LABELS[event.toStatus]
                                  : "更新记录")}
                            </p>
                            <p className="mt-1 text-xs text-slate-400 tabular-nums">
                              {formatDateTime(event.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">还没有进展记录。</p>
                    )}
                  </div>
                </section>

                <section className="mt-8 border-t border-rose-100 pt-6">
                  {!confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-medium text-rose-700 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-rose-600"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" /> 删除记录
                    </button>
                  ) : (
                    <div className="rounded-xl bg-rose-50 p-4">
                      <p className="text-sm font-medium text-rose-900">
                        删除后无法恢复。输入“{item.companyName}”确认。
                      </p>
                      <input
                        value={deleteText}
                        onChange={(event) => setDeleteText(event.target.value)}
                        className="application-input mt-3 border-rose-200"
                        aria-label="输入公司名称确认删除"
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={
                            deleteText !== item.companyName || pending || saving
                          }
                          onClick={() => void onRemove(item.id)}
                          className="min-h-10 whitespace-nowrap rounded-lg bg-rose-600 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
                        >
                          确认删除
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDelete(false);
                            setDeleteText("");
                          }}
                          className="min-h-10 whitespace-nowrap rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-white focus-visible:outline-2 focus-visible:outline-slate-600"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              </fieldset>

              <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-7">
                <span className="text-xs text-slate-500">
                  保存后会自动写入进展记录
                </span>
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving || pending}
                  className="inline-flex min-h-11 min-w-24 items-center justify-center whitespace-nowrap rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                >
                  {saving ? "保存中…" : "保存修改"}
                </button>
              </footer>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (item: ApplicationItem) => void;
}): ReactElement {
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [applicationUrl, setApplicationUrl] = useState("");
  const [deadlineAt, setDeadlineAt] = useState("");
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);

  async function submit(): Promise<void> {
    if (submitting.current || !companyName.trim() || !jobTitle.trim()) return;
    submitting.current = true;
    setSaving(true);
    try {
      const result = await applicationRequest<{ application: ApplicationItem }>(
        "/next-api/applications",
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyName,
            jobTitle,
            applicationUrl,
            deadlineAt: toIsoDateTime(deadlineAt),
          }),
        },
      );
      onCreated(result.application);
      setCompanyName("");
      setJobTitle("");
      setApplicationUrl("");
      setDeadlineAt("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "没有创建这条投递，请重试。",
      );
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => !saving && onOpenChange(next)}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="application-drawer-overlay fixed inset-0 z-[400] bg-slate-950/30" />
        <Dialog.Content className="application-modal fixed inset-0 z-[401] m-auto h-fit max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl focus:outline-none sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-xl font-bold text-slate-950">
                添加投递
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-600">
                先记录公司和职位，其他信息可以稍后补充。
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="关闭"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-violet-600"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>
          <fieldset disabled={saving} className="mt-6 min-w-0 space-y-4">
            <Field label="公司">
              <input
                autoFocus
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                className="application-input"
              />
            </Field>
            <Field label="职位">
              <input
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value)}
                className="application-input"
              />
            </Field>
            <Field label="申请链接（选填）">
              <input
                type="url"
                value={applicationUrl}
                onChange={(event) => setApplicationUrl(event.target.value)}
                placeholder="https://"
                className="application-input"
              />
            </Field>
            <Field label="网申截止时间（选填）">
              <DateTimePicker
                value={deadlineAt}
                onChange={setDeadlineAt}
                placeholder="选择网申截止时间"
              />
            </Field>
          </fieldset>
          <div className="mt-7 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                className="min-h-11 whitespace-nowrap rounded-xl px-4 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-slate-600"
              >
                取消
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!companyName.trim() || !jobTitle.trim() || saving}
              className="min-h-11 whitespace-nowrap rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
            >
              {saving ? "创建中…" : "创建记录"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DateTimePicker({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}): ReactElement {
  const selected = parseLocalDateTime(value);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(selected || new Date()),
  );

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const dayCount = new Date(year, month + 1, 0).getDate();
  const calendarCells = Array.from(
    { length: Math.ceil((firstWeekday + dayCount) / 7) * 7 },
    (_, index) => {
      const day = index - firstWeekday + 1;
      return day >= 1 && day <= dayCount ? day : null;
    },
  );

  function chooseDay(day: number): void {
    const base = selected || new Date();
    const next = new Date(
      year,
      month,
      day,
      selected ? base.getHours() : 9,
      selected ? base.getMinutes() : 0,
    );
    onChange(toLocalDateTimeValue(next));
  }

  function changeTime(part: "hour" | "minute", nextValue: number): void {
    const base = selected || new Date();
    const next = new Date(base);
    if (part === "hour") next.setHours(nextValue);
    else next.setMinutes(nextValue);
    next.setSeconds(0, 0);
    onChange(toLocalDateTimeValue(next));
  }

  const minuteOptions = Array.from(
    new Set([
      ...Array.from({ length: 12 }, (_, index) => index * 5),
      ...(selected ? [selected.getMinutes()] : []),
    ]),
  ).sort((a, b) => a - b);

  return (
    <Popover.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setVisibleMonth(startOfMonth(selected || new Date()));
        setOpen(nextOpen);
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          className="application-input flex items-center justify-between gap-3 text-left transition-colors"
          aria-label={
            value
              ? `${placeholder}，当前为${formatPickerValue(value)}`
              : placeholder
          }
        >
          <span className={value ? "text-slate-800" : "text-slate-400"}>
            {value ? formatPickerValue(value) : placeholder}
          </span>
          <CalendarDays
            className="h-4 w-4 shrink-0 text-slate-400"
            aria-hidden="true"
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          side="bottom"
          sideOffset={8}
          collisionPadding={16}
          className="application-date-popover z-[500] max-h-[var(--radix-popover-content-available-height)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl focus:outline-none"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setVisibleMonth(new Date(year, month - 1, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 active:bg-slate-200 focus-visible:outline-2 focus-visible:outline-violet-600"
              aria-label="上个月"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <strong className="text-sm font-semibold text-slate-900">
              {year}年{month + 1}月
            </strong>
            <button
              type="button"
              onClick={() => setVisibleMonth(new Date(year, month + 1, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 active:bg-slate-200 focus-visible:outline-2 focus-visible:outline-violet-600"
              aria-label="下个月"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 text-center text-xs text-slate-400">
            {["一", "二", "三", "四", "五", "六", "日"].map((label) => (
              <span key={label} className="py-1.5">
                {label}
              </span>
            ))}
          </div>
          <div
            className="grid grid-cols-7 gap-1"
            role="grid"
            aria-label={`${year}年${month + 1}月`}
          >
            {calendarCells.map((day, index) => {
              if (!day) return <span key={`empty-${index}`} className="h-9" />;
              const isSelected =
                selected?.getFullYear() === year &&
                selected.getMonth() === month &&
                selected.getDate() === day;
              const today = new Date();
              const isToday =
                today.getFullYear() === year &&
                today.getMonth() === month &&
                today.getDate() === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => chooseDay(day)}
                  className={`h-8 rounded-lg text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-600 ${
                    isSelected
                      ? "bg-violet-600 font-semibold text-white hover:bg-violet-700"
                      : isToday
                        ? "bg-violet-50 font-semibold text-violet-700 hover:bg-violet-100"
                        : "text-slate-700 hover:bg-slate-100 active:bg-slate-200"
                  }`}
                  aria-pressed={isSelected}
                  aria-label={`${year}年${month + 1}月${day}日${isToday ? "，今天" : ""}`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-3 border-t border-slate-100 pt-3">
            <p className="text-xs font-medium text-slate-500">具体时间</p>
            <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <select
                value={selected?.getHours() ?? 9}
                onChange={(event) =>
                  changeTime("hour", Number(event.target.value))
                }
                className="application-input text-center"
                aria-label="小时"
              >
                {Array.from({ length: 24 }, (_, hour) => (
                  <option key={hour} value={hour}>
                    {String(hour).padStart(2, "0")} 时
                  </option>
                ))}
              </select>
              <span className="text-slate-300">:</span>
              <select
                value={selected?.getMinutes() ?? 0}
                onChange={(event) =>
                  changeTime("minute", Number(event.target.value))
                }
                className="application-input text-center"
                aria-label="分钟"
              >
                {minuteOptions.map((minute) => (
                  <option key={minute} value={minute}>
                    {String(minute).padStart(2, "0")} 分
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              disabled={!value}
              className="min-h-10 whitespace-nowrap rounded-lg px-2 text-sm text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-violet-600"
            >
              清除
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  now.setSeconds(0, 0);
                  onChange(toLocalDateTimeValue(now));
                  setVisibleMonth(startOfMonth(now));
                }}
                className="min-h-10 whitespace-nowrap rounded-lg px-3 text-sm font-medium text-violet-700 hover:bg-violet-50 active:bg-violet-100 focus-visible:outline-2 focus-visible:outline-violet-600"
              >
                现在
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-10 whitespace-nowrap rounded-lg bg-violet-600 px-3 text-sm font-semibold text-white hover:bg-violet-700 active:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
              >
                完成
              </button>
            </div>
          </div>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactElement;
}): ReactElement {
  return (
    <label className="block text-sm font-medium text-slate-700">
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function Meta({
  label,
  value,
}: {
  label: string;
  value: string;
}): ReactElement {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-1 break-words text-slate-700">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: ApplicationStatus }): ReactElement {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full bg-current"
        aria-hidden="true"
      />
      {STATUS_LABELS[status]}
    </span>
  );
}

function EmptyState({
  hasItems,
  onCreate,
  onClear,
}: {
  hasItems: boolean;
  onCreate: () => void;
  onClear: () => void;
}): ReactElement {
  return (
    <div className="flex min-h-64 flex-col items-start justify-center px-6 py-12 sm:items-center sm:text-center">
      <Inbox className="h-8 w-8 text-slate-300" aria-hidden="true" />
      <h2 className="mt-4 text-base font-semibold text-slate-900">
        {hasItems ? "这个筛选下没有记录" : "还没有投递记录"}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {hasItems
          ? "清除筛选，或者搜索其他公司和职位。"
          : "使用网申助手填表会自动创建记录，也可以先手动添加。"}
      </p>
      <button
        type="button"
        onClick={hasItems ? onClear : onCreate}
        className="mt-5 min-h-11 whitespace-nowrap rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
      >
        {hasItems ? "查看全部" : "添加第一条投递"}
      </button>
    </div>
  );
}

function ApplicationSkeleton(): ReactElement {
  return (
    <div aria-label="正在读取投递记录" className="divide-y divide-slate-100">
      {[0, 1, 2].map((key) => (
        <div
          key={key}
          className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(220px,.65fr)_180px]"
        >
          <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-10 w-24 animate-pulse rounded-lg bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function buildAttentionGroups(
  items: ApplicationItem[],
): Record<Exclude<AttentionFilter, null>, ApplicationItem[]> {
  const now = Date.now();
  const threeDays = now + 3 * 86_400_000;
  const sevenDays = now + 7 * 86_400_000;
  const staleBefore = now - 7 * 86_400_000;
  return {
    DRAFT: items.filter((item) => item.status === "DRAFT"),
    DUE: items.filter(
      (item) =>
        !CLOSED_STATUSES.has(item.status) &&
        item.deadlineAt &&
        new Date(item.deadlineAt).getTime() <= threeDays,
    ),
    INTERVIEW: items.filter(
      (item) =>
        item.nextActionType === "INTERVIEW" &&
        item.nextActionAt &&
        new Date(item.nextActionAt).getTime() >= now &&
        new Date(item.nextActionAt).getTime() <= sevenDays,
    ),
    STALE: items.filter(
      (item) =>
        item.status === "APPLIED" &&
        new Date(item.updatedAt).getTime() < staleBefore,
    ),
  };
}

function nextPrimaryAction(
  status: ApplicationStatus,
): { label: string; status: ApplicationStatus } | null {
  if (status === "DRAFT") return { label: "确认已投递", status: "APPLIED" };
  if (status === "ASSESSMENT")
    return { label: "进入面试", status: "INTERVIEW" };
  return null;
}

function attentionLabel(value: Exclude<AttentionFilter, null>): string {
  return {
    DRAFT: "待完成投递",
    DUE: "临近截止",
    INTERVIEW: "即将面试",
    STALE: "超过 7 天未更新",
  }[value];
}

function statusAge(item: ApplicationItem): string {
  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(item.updatedAt).getTime()) / 86_400_000),
  );
  if (item.status === "DRAFT")
    return days ? `草稿已保留 ${days} 天` : "等待确认投递";
  if (item.status === "APPLIED")
    return days ? `已投递 ${days} 天` : "今天完成投递";
  return `最近更新于 ${formatDate(item.updatedAt)}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
function toLocalDateTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
function toIsoDateTime(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

function parseLocalDateTime(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function toLocalDateTimeValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hour = String(value.getHours()).padStart(2, "0");
  const minute = String(value.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function formatPickerValue(value: string): string {
  const date = parseLocalDateTime(value);
  if (!date) return "";
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
