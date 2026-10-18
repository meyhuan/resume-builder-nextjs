'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { get, set } from 'idb-keyval';
import { useConversationScroll } from './use-conversation-scroll';
import { StableAssistantReply } from './stable-assistant-reply';
import {
  Loader2,
  SendHorizonal,
  Square,
  ChevronDown,
  MoreHorizontal,
  ArrowUpRight,
  ArrowRight,
  Undo2,
  Check,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { toResumeContext } from '@/lib/ai/resume-context';
import { UnifiedFollowupForm } from './unified-followup-form';
import { completedRelayBlocks, relayFollowups } from './unified-relay';
import {
  followupFactTopic,
  followupRequest,
  type FactTopic,
} from '@/lib/ai/unified/followups';
import {
  UnifiedQuestions,
  INITIAL_QUESTION_PROGRESS,
  type QuestionProgress,
} from './unified-questions';
import {
  questionReplyRange,
  updateQuestionReply,
} from './unified-question-reply';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { useAppStore } from '@/state/store';
import { useEditorUiStore } from '@/state/editor-ui-store';
import { useVipStore } from '@/store/use-vip-store';
import { refreshEditorAssistQuota } from '@/lib/ai/assist-client';
import {
  trackAssistant,
  proposalId,
  optionId,
  failureForStatus,
  type AssistantAction,
  type AssistantAnalytics,
  type FailureReason,
} from '@/lib/ai/unified/analytics';
import { useAiImpression } from '@/lib/ai/unified/use-impression';
import {
  plainText,
  isResumeOptimization,
  RESUME_OPTIMIZATION_REQUEST,
  MODULE_POLISH_REQUEST,
} from '@/lib/ai/unified/policy';
import { MAX_TASK_TURNS, toHistory } from '@/lib/ai/unified/types';
import {
  ASSISTANT_STAGES,
  AssistantStreamError,
  readAssistantResponse,
  type AssistantStage,
} from '@/lib/ai/unified/stream';
import type {
  AssistantSession,
  AssistantTask,
  AssistantTurn,
  CheckedProposal,
  ReviewStatus,
  MessageSource,
} from '@/lib/ai/unified/types';
import {
  applyChecked,
  undoChecked,
  textDiff,
  type UndoReceipt,
} from './unified-changes';

interface StoredSession extends AssistantSession {
  receipts: Record<string, UndoReceipt>;
}
const button =
  'rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 hover:border-violet-300 hover:text-violet-700 disabled:opacity-40';
function makeSession(resumeId: string, task?: AssistantTask): StoredSession {
  return {
    task: task || {
      id: crypto.randomUUID(),
      resumeId,
      feature: 'chat',
      label: '整份简历',
      entry: 'assistant',
    },
    turns: [],
    reviews: {},
    receipts: {},
    updatedAt: Date.now(),
  };
}
function beforeText(p: CheckedProposal): string {
  if (p.action !== 'updateBlock') return '';
  try {
    const b = JSON.parse(p.before);
    return plainText(
      b.contentHtml ||
        b.html ||
        b.courseHtml ||
        b.items?.map((i: { html: string }) => i.html).join('') ||
        '',
    );
  } catch {
    return '';
  }
}
function afterText(p: CheckedProposal): string {
  return plainText(
    p.action === 'updateBlock'
      ? p.html
      : p.action === 'addSection'
        ? p.contentHtml || ''
        : p.skills.join('、'),
  );
}
function renderPlaceholderHighlights(text: string) {
  const parts = text.split(/(\[X\][%+款个项次倍]?|\[[^\]]{1,20}\])/g);
  return parts.map((part, idx) =>
    /^(\[X\][%+款个项次倍]?|\[[^\]]{1,20}\])$/.test(part) ? (
      <mark
        key={idx}
        title="建议应用后在简历中替换为真实数据"
        className="mx-0.5 rounded bg-amber-100 px-1 py-0.5 font-semibold text-amber-800 no-underline"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}
function scrollToResumeBlock(blockId: string) {
  if (typeof document === 'undefined') return;
  const target = Array.from(
    document.querySelectorAll<HTMLElement>('[data-ai-block-id]'),
  ).find((el) => el.dataset.aiBlockId === blockId);
  if (target) {
    target.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    target.animate?.(
      [
        { backgroundColor: '#ede9fe' },
        { backgroundColor: 'transparent' },
      ],
      { duration: 1400 },
    );
  }
}
function ChangeCard({
  proposal,
  status,
  apply,
  keep,
  undo,
  disabled,
  telemetryId,
  onVisible,
  visible,
  groupedUndo,
}: {
  proposal: CheckedProposal;
  status?: ReviewStatus;
  apply: () => void;
  keep: () => void;
  undo: () => void;
  disabled: boolean;
  telemetryId: string;
  onVisible: () => void;
  visible: boolean;
  groupedUndo?: boolean;
}) {
  const impressionRef = useAiImpression<HTMLElement>(
    telemetryId,
    onVisible,
    visible,
  );
  const [diff, setDiff] = useState(false);
  const pieces = textDiff(beforeText(proposal), afterText(proposal));
  return (
    <section
      ref={impressionRef}
      className="space-y-3 rounded-xl border border-violet-200 bg-white p-3 shadow-xs transition-shadow duration-200"
      aria-label={`修改建议：${proposal.targetLabel}`}
    >
      {proposal.reviewNotes && proposal.reviewNotes.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs leading-5 text-amber-800">
          <p className="font-medium text-amber-900">💡 提示与核对建议</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {proposal.reviewNotes.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <button
          type="button"
          className="group inline-flex items-center gap-1.5 text-left text-xs font-semibold text-slate-800 hover:text-violet-700"
          title="点击定位并高亮左侧简历模块"
          onClick={() => {
            if (proposal.action !== 'updateBlock') return;
            scrollToResumeBlock(proposal.blockId);
          }}
        >
          <span>{proposal.targetLabel}</span>
          {proposal.action === 'updateBlock' && (
            <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-600 transition-colors group-hover:bg-violet-100">
              定位
            </span>
          )}
        </button>
        {proposal.action === 'updateBlock' && (
          <div
            role="tablist"
            aria-label="内容展示模式"
            className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs"
          >
            <button
              type="button"
              role="tab"
              aria-selected={diff}
              aria-pressed={diff}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                diff
                  ? 'bg-white text-violet-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              onClick={() => setDiff(true)}
            >
              查看差异
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!diff}
              aria-pressed={!diff}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                !diff
                  ? 'bg-white text-violet-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              onClick={() => setDiff(false)}
            >
              完整改写
            </button>
          </div>
        )}
      </div>
      <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
        {diff && proposal.action === 'updateBlock'
          ? pieces.map((p, i) =>
              p.kind === 'remove' ? (
                <del
                  key={i}
                  className="bg-rose-50 text-rose-700 line-through decoration-rose-500"
                >
                  {p.text}
                </del>
              ) : p.kind === 'add' ? (
                <ins
                  key={i}
                  className="bg-emerald-50 text-emerald-800 underline decoration-emerald-400"
                >
                  {renderPlaceholderHighlights(p.text)}
                </ins>
              ) : (
                <span key={i}>{p.text}</span>
              ),
            )
          : proposal.action === 'updateBlock' ? (
              <div
                className="space-y-1.5 [&_li]:list-disc [&_li]:ml-4 [&_strong]:font-semibold [&_strong]:text-slate-900"
                dangerouslySetInnerHTML={{ __html: proposal.html }}
              />
            ) : (
              afterText(proposal) || '新增空白模块'
            )}
      </div>
      {status ? (
        <div
          role="status"
          className="flex items-center justify-between border-t border-slate-100/80 pt-2.5 text-xs text-slate-500"
        >
          <span className="inline-flex items-center gap-1.5 font-medium">
            {status === 'applied' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                <Check className="h-3.5 w-3.5" />
                已应用
              </span>
            ) : status === 'kept' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                已保留原文
              </span>
            ) : status === 'undone' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                已撤销
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">
                原文已变化，请重新生成
              </span>
            )}
          </span>
          {status === 'applied' && (
            <button
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 shadow-2xs hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40"
              disabled={disabled}
              onClick={undo}
            >
              <Undo2 className="h-3 w-3" />
              {groupedUndo ? '撤销这组修改' : '撤销这次修改'}
            </button>
          )}
          {status === 'undone' && (
            <button
              className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-xs font-medium text-violet-700 shadow-2xs hover:border-violet-300 hover:bg-violet-50 disabled:opacity-40"
              disabled={disabled}
              onClick={apply}
            >
              重新应用
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 border-t border-slate-100/80 pt-2.5">
          <button
            className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-violet-700 active:bg-violet-800 disabled:opacity-40"
            disabled={disabled}
            onClick={apply}
          >
            <Check className="h-3.5 w-3.5" />
            应用这一处
          </button>
          <button
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40"
            disabled={disabled}
            onClick={keep}
          >
            保留原文
          </button>
        </div>
      )}
    </section>
  );
}
function FollowupOption({
  text,
  telemetryId,
  isNextBlock,
  onVisible,
  onClick,
}: {
  text: string;
  telemetryId: string;
  isNextBlock?: boolean;
  onVisible: () => void;
  onClick: () => void;
}) {
  const ref = useAiImpression<HTMLButtonElement>(telemetryId, onVisible);
  return (
    <button
      ref={ref}
      className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-xs leading-5 transition-colors ${
        isNextBlock
          ? 'border border-violet-200 bg-violet-50/70 font-medium text-violet-800 hover:border-violet-300 hover:bg-violet-100/70'
          : 'bg-slate-50 text-slate-700 hover:bg-violet-50 hover:text-slate-900'
      }`}
      onClick={onClick}
    >
      <span>{text}</span>
      {isNextBlock ? (
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-violet-600" />
      ) : (
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      )}
    </button>
  );
}
type Submission = Pick<
  AssistantAnalytics,
  'submissionSource' | 'sourceRequestId' | 'sourceOptionId' | 'retryOfRequestId'
>;
type MessageIntent = {
  messageSource: MessageSource;
  followupTargetId?: string;
};
const resultType = (turn: AssistantTurn): AssistantAnalytics['resultType'] =>
  turn.questions.length
    ? 'clarification'
    : turn.proposals.length
      ? 'proposals'
      : 'answer';

export function UnifiedAssistant({
  resumeId,
  onLegacy,
}: {
  resumeId: string;
  onLegacy: () => void;
}) {
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const currentResume = useAppStore((s) => s.resume);
  const [active, setActive] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [factExample, setFactExample] = useState<{
    draft: string;
    text: string;
  } | null>(null);
  const visibleFactExample = factExample?.draft === input ? factExample : null;
  const acceptFactExample = () => {
    if (!visibleFactExample) return;
    setInput(`${input}${visibleFactExample.text}`);
    setFactExample(null);
    inputRef.current?.focus();
  };
  const [factEntry, setFactEntry] = useState<{
    requestId: string;
    index: number;
    topic: FactTopic;
  } | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [questionProgress, setQuestionProgress] = useState<
    Record<string, QuestionProgress>
  >({});
  useEffect(() => {
    setQuestionProgress({});
    setFactEntry(null);
    setFactExample(null);
  }, [active]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [stage, setStage] = useState<AssistantStage>('planning');
  const [preview, setPreview] = useState('');
  const [retry, setRetry] = useState<{
    text: string;
    fromFollowup: boolean;
    submission: Submission;
    intent: MessageIntent;
  } | null>(null);
  const actions = useRef<{
    send: (
      text: string,
      fromFollowup?: boolean,
      submission?: Submission,
      followupTargetId?: string,
    ) => void;
    startNew: () => void;
  }>({ send: () => {}, startNew: () => {} });
  const ref = useRef(sessions);
  ref.current = sessions;
  const abort = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const consumed = useRef<string | null>(null);
  const pendingPolish = useRef<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const scroll = useConversationScroll(active);
  const [pendingTurn, setPendingTurn] = useState<{ taskId: string; turn: AssistantTurn } | null>(null);
  const task = useEditorUiStore((s) => s.assistantTask);
  const panelVisible = useEditorUiStore((s) => s.activePanel === 'ai');
  const externalMessage = useEditorUiStore((s) => s.pendingAiMessage);
  const session = sessions.find((s) => s.task.id === active);
  const quota = useVipStore((s) => s.quota);
  const storageKey = `ai-unified-history:${resumeId}`;
  // Reflow when the draft changes (including question choices) or the sidebar is resized.
  useEffect(() => {
    const element = inputRef.current;
    if (!element) return;
    const resize = () => {
      element.style.height = 'auto';
      element.style.height = `${element.value ? Math.min(120, Math.max(56, element.scrollHeight)) : 56}px`;
    };
    resize();
    let width = element.getBoundingClientRect().width;
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            const nextWidth = element.getBoundingClientRect().width;
            if (nextWidth !== width) {
              width = nextWidth;
              resize();
            }
          });
    observer?.observe(element);
    return () => observer?.disconnect();
  }, [input, loaded]);
  const panelRef = useAiImpression<HTMLDivElement>(
    `panel:${active}`,
    () => {
      if (session)
        trackAssistant('panel_view', {
          taskId: session.task.id,
          entry: session.task.entry,
          feature: session.task.feature,
          requestedFeature: session.task.feature,
        });
    },
    loaded && panelVisible && !!session && (!task || task.id === active),
  );
  const persist = useCallback(
    (next: StoredSession[]) => {
      ref.current = next;
      setSessions(next);
      void set(storageKey, next.slice(0, 20)).catch(() =>
        toast.error('对话历史暂时无法保存'),
      );
    },
    [storageKey],
  );
  const update = (id: string, fn: (s: StoredSession) => StoredSession) =>
    persist(ref.current.map((s) => (s.task.id === id ? fn(s) : s)));
  useEffect(() => {
    mounted.current = true;
    void get<StoredSession[]>(storageKey)
      .then((saved) => {
        if (!mounted.current) return;
        const valid = Array.isArray(saved)
          ? saved.filter(
              (s) => s?.task?.resumeId === resumeId && Array.isArray(s.turns),
            )
          : [];
        const next = valid.length ? valid : [makeSession(resumeId)];
        ref.current = next;
        setSessions(next);
        setActive(next[0].task.id);
        setLoaded(true);
      })
      .catch(() => {
        if (mounted.current) {
          const s = makeSession(resumeId);
          ref.current = [s];
          setSessions([s]);
          setActive(s.task.id);
          setLoaded(true);
        }
      });
    return () => {
      mounted.current = false;
      abort.current?.abort();
      useEditorUiStore.setState({ assistantBusy: false });
    };
  }, [storageKey, resumeId]);
  useEffect(() => {
    useEditorUiStore.setState({ assistantBusy: busy });
  }, [busy]);
  useEffect(() => {
    if (
      !loaded ||
      !task ||
      task.resumeId !== resumeId ||
      consumed.current === task.id ||
      busy
    )
      return;
    consumed.current = task.id;
    const existing = ref.current.find((s) => s.task.id === task.id);
    // Only a fresh module action starts work. Restoring history must never replay it.
    pendingPolish.current =
      !existing &&
      ((task.entry === 'module' && task.feature === 'polish' && task.blockId) ||
        task.scope === 'resume')
        ? task.id
        : null;
    if (!existing)
      persist([makeSession(resumeId, task), ...ref.current].slice(0, 20));
    setActive(task.id);
    setInput('');
    setError('');
    setRetry(null);
  }, [task, loaded, busy, resumeId, persist]);
  useEffect(() => {
    if (!session || busy || !panelVisible || externalMessage) return;
    if (
      pendingPolish.current !== session.task.id ||
      task?.id !== session.task.id
    )
      return;
    pendingPolish.current = null;
    actions.current.send(
      session.task.scope === 'resume'
        ? RESUME_OPTIMIZATION_REQUEST
        : MODULE_POLISH_REQUEST,
      true,
      undefined,
      session.task.scope === 'resume' ? undefined : session.task.blockId,
    );
  }, [session, task, busy, panelVisible, externalMessage]);
  useEffect(() => {
    if (externalMessage && !busy && loaded && session) {
      if (session.task.blockId) {
        actions.current.startNew();
        return;
      }
      useEditorUiStore.setState({ pendingAiMessage: null });
      actions.current.send(externalMessage);
    }
  }, [externalMessage, busy, loaded, session]);
  const event = (
    action: AssistantAction,
    feature = session?.task.feature,
    requestId?: string,
    details: AssistantAnalytics = {},
  ) => {
    trackAssistant(action, {
      feature,
      requestedFeature: session?.task.feature,
      requestId,
      taskId: session?.task.id,
      entry: session?.task.entry,
      scope:
        ref.current
          .find((s) => s.task.id === session?.task.id)
          ?.turns.find((t) => t.requestId === requestId)?.scope ||
        session?.task.scope ||
        (session?.task.blockId ? 'module' : 'chat'),
      ...details,
    });
  };
  const startNew = () => {
    if (busy) return;
    const s = makeSession(resumeId);
    persist([s, ...ref.current].slice(0, 20));
    setActive(s.task.id);
    setInput('');
    setError('');
    setRetry(null);
    useEditorUiStore.setState({ assistantTask: null });
  };
  const send = async (
    text: string,
    fromFollowup = false,
    submission: Submission = { submissionSource: 'typed' },
    intent: MessageIntent = {
      messageSource:
        submission.submissionSource === 'typed' ? 'user' : 'suggestion',
    },
  ) => {
    const activeSession =
      ref.current.find((s) => s.task.id === active) || session;
    if (!activeSession || busy || abort.current || !text.trim()) return;
    if (activeSession.turns.length >= MAX_TASK_TURNS) {
      setError('当前任务对话较长，请新建对话后继续');
      setRetry(null);
      return;
    }
    const body = {
      task: activeSession.task,
      turns: toHistory(activeSession.turns),
      reviewedBlockIds: completedRelayBlocks(ref.current, useAppStore.getState().resume),
      requestId: crypto.randomUUID(),
      text: text.trim(),
      fromFollowup,
      ...intent,
      resumeData: structuredClone(useAppStore.getState().resume),
    };
    setPendingTurn({ taskId: body.task.id, turn: { requestId: body.requestId, text: body.text, answer: '', questions: [], proposals: [], followups: [], direct: false, charged: false, feature: body.task.feature } });
    setBusy(true);
    setFactEntry(null);
    setError('');
    setStage('planning');
    setPreview('');
    setInput('');
    setRetry({
      text: body.text,
      fromFollowup,
      intent,
      submission: {
        ...submission,
        submissionSource: 'retry',
        retryOfRequestId: body.requestId,
      },
    });
    scroll.follow();
    const previous = activeSession.turns.at(-1);
    event('start', body.task.feature, body.requestId, {
      ...submission,
      scope:
        !body.task.blockId && isResumeOptimization(text)
          ? 'resume'
          : body.task.scope || (body.task.blockId ? 'module' : 'chat'),
      previousRequestId: previous?.requestId,
      previousResultType: previous ? resultType(previous) : undefined,
    });
    const startedAt = performance.now();
    const elapsed = () =>
      Math.max(0, Math.round(performance.now() - startedAt));
    let failureReason: FailureReason = 'network';
    let statusCode: number | undefined;
    const controller = new AbortController();
    abort.current = controller;
    try {
      const response = await fetch('/next-api/ai/chat/task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/x-ndjson',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      statusCode = response.status;
      failureReason = response.ok
        ? 'invalid_response'
        : failureForStatus(response.status);
      if (!response.ok) {
        const data = await response.json();
        failureReason = failureForStatus(
          response.status,
          data.quotaExceeded === true,
        );
        if (data.errorCode === 'timeout') failureReason = 'timeout';
        if (data.quotaExceeded) {
          useVipStore.getState().setShowUpgrade(true, 'ai');
        }
        throw new Error(data.error || '处理失败，请重试');
      }
      const turn = await readAssistantResponse(
        response,
        body.requestId,
        controller.signal,
        (event) => {
          if (controller.signal.aborted || !mounted.current) return;
          if (event.type === 'progress') setStage(event.stage);
          if (event.type === 'preview') setPreview(event.text);
        },
      );
      if (controller.signal.aborted || !mounted.current) {
        throw new DOMException('已停止', 'AbortError');
      }
      if (turn.requestId !== body.requestId)
        throw new Error('返回结果不匹配，请重试');
      // Retain origin even when talking to an older server without this field.
      turn.messageSource = body.messageSource;
      update(body.task.id, (s) =>
        s.turns.some((t) => t.requestId === turn.requestId)
          ? s
          : { ...s, turns: [...s.turns, turn], updatedAt: Date.now() },
      );
      const current = ref.current.find((s) => s.task.id === body.task.id);
      const shouldAutoApply =
        turn.direct && !body.fromFollowup && body.messageSource === 'user';
      // Live responses only. Restoring history must never execute a proposal.
      if (
        shouldAutoApply &&
        current &&
        turn.proposals.length > 0 &&
        !turn.proposals.some(
          (_, i) => current.reviews[`${turn.requestId}:${i}`],
        )
      ) {
        const receipt = applyChecked(turn.proposals, body.task.resumeId);
        update(body.task.id, (s) => {
          const reviews = { ...s.reviews },
            receipts = { ...s.receipts };
          turn.proposals.forEach((_, i) => {
            const key = `${turn.requestId}:${i}`;
            reviews[key] = receipt ? 'applied' : 'conflict';
            if (receipt) receipts[key] = receipt;
          });
          return { ...s, reviews, receipts };
        });
        if (receipt) {
          const firstUpdate = turn.proposals.find(
            (p) => p.action === 'updateBlock',
          );
          if (firstUpdate && firstUpdate.action === 'updateBlock') {
            scrollToResumeBlock(firstUpdate.blockId);
          }
        }
        turn.proposals.forEach((_, i) =>
          event(
            receipt ? 'direct_apply' : 'conflict',
            turn.feature,
            turn.requestId,
            {
              proposalId: proposalId(turn.requestId, i),
              proposalIndex: i,
              proposalCount: turn.proposals.length,
              mode: 'direct',
              operation: 'apply',
            },
          ),
        );
        if (!receipt) toast.info('原文已变化，未自动应用，请重新生成');
      }
      event(
        turn.questions.length ? 'clarify' : 'success',
        turn.feature,
        turn.requestId,
        {
          elapsedMs: elapsed(),
          statusCode,
          resultType: resultType(turn),
          charged: turn.charged,
          proposalCount: turn.proposals.length,
          questionCount: turn.questions.length,
          optionCount: turn.followups.length,
          mode: shouldAutoApply ? 'direct' : 'preview',
        },
      );
      if (turn.proposals.length && !shouldAutoApply)
        event('preview', turn.feature, turn.requestId, {
          proposalCount: turn.proposals.length,
          mode: 'preview',
        });
      setRetry(null);
    } catch (e) {
      if (e instanceof AssistantStreamError) {
        statusCode = e.payload.status;
        failureReason = failureForStatus(
          e.payload.status,
          e.payload.quotaExceeded === true,
        );
        if (e.payload.errorCode === 'timeout') failureReason = 'timeout';
        if (e.payload.quotaExceeded)
          useVipStore.getState().setShowUpgrade(true, 'ai');
      }
      if (controller.signal.aborted) {
        setError('已停止，未应用任何新修改。若已开始生成，可能已扣次。');
        event('cancel', body.task.feature, body.requestId, {
          elapsedMs: elapsed(),
          failureReason: 'cancelled',
        });
      } else {
        setError(e instanceof Error ? e.message : '处理失败');
        event(
          failureReason === 'quota' ? 'quota_blocked' : 'failed',
          body.task.feature,
          body.requestId,
          {
            elapsedMs: elapsed(),
            statusCode,
            failureReason,
          },
        );
      }
    } finally {
      if (mounted.current) {
        setBusy(false);
        setPreview('');
        refreshEditorAssistQuota();
      }
      abort.current = null;
    }
  };
  actions.current = {
    send: (text, fromFollowup = true, submission = { submissionSource: 'handoff' }, followupTargetId) => {
      void send(text, fromFollowup, submission, {
        messageSource: 'suggestion',
        ...(followupTargetId ? { followupTargetId } : {}),
      });
    },
    startNew,
  };
  const review = (
    turn: AssistantTurn,
    index: number,
    action: 'apply' | 'keep' | 'undo',
  ) => {
    if (!session || busy) return;
    const key = `${turn.requestId}:${index}`;
    const current = ref.current.find((s) => s.task.id === session.task.id)!;
    if (action === 'undo') {
      const receipt = current.receipts[key];
      if (!receipt || !undoChecked(receipt)) {
        event('conflict', turn.feature, turn.requestId, {
          proposalId: proposalId(turn.requestId, index),
          proposalIndex: index,
          mode: turn.direct ? 'direct' : 'preview',
          operation: 'undo',
        });
        toast.info('这段内容后来又有修改，请使用编辑历史撤销');
        return;
      }
      update(session.task.id, (s) => ({
        ...s,
        reviews: Object.fromEntries(
          Object.entries(s.reviews).map(([k, v]) => [
            k,
            s.receipts[k] &&
            JSON.stringify(s.receipts[k]) === JSON.stringify(receipt)
              ? 'undone'
              : v,
          ]),
        ),
      }));
      // One direct application may share an undo receipt across several proposals.
      turn.proposals.forEach((_, i) => {
        const k = `${turn.requestId}:${i}`;
        if (
          current.reviews[k] === 'applied' &&
          current.receipts[k] &&
          JSON.stringify(current.receipts[k]) === JSON.stringify(receipt)
        ) {
          event('undo', turn.feature, turn.requestId, {
            proposalId: proposalId(turn.requestId, i),
            proposalIndex: i,
            mode: turn.direct ? 'direct' : 'preview',
          });
        }
      });
      return;
    }
    if (current.reviews[key] && current.reviews[key] !== 'undone') return;
    const receipt =
      action === 'apply'
        ? applyChecked([turn.proposals[index]], session.task.resumeId)
        : null;
    update(session.task.id, (s) => ({
      ...s,
      reviews: {
        ...s.reviews,
        [key]: action === 'keep' ? 'kept' : receipt ? 'applied' : 'conflict',
      },
      receipts: receipt ? { ...s.receipts, [key]: receipt } : s.receipts,
    }));
    event(
      action === 'keep' ? 'keep' : receipt ? 'apply' : 'conflict',
      turn.feature,
      turn.requestId,
      {
        proposalId: proposalId(turn.requestId, index),
        proposalIndex: index,
        mode: 'preview',
        operation: action === 'apply' ? 'apply' : undefined,
      },
    );
    return action === 'keep' || !!receipt;
  };
  const undoAllApplied = () => {
    if (!session || busy) return;
    const current = ref.current.find((s) => s.task.id === session.task.id);
    if (!current) return;
    const appliedEntries = Object.entries(current.reviews)
      .filter(([, status]) => status === 'applied')
      .reverse();
    if (!appliedEntries.length) return;
    const seenReceipts = new Set<string>();
    const undoneReceiptJsons = new Set<string>();
    for (const [key] of appliedEntries) {
      const receipt = current.receipts[key];
      if (!receipt) continue;
      const serialized = JSON.stringify(receipt);
      if (seenReceipts.has(serialized)) continue;
      seenReceipts.add(serialized);
      if (undoChecked(receipt)) {
        undoneReceiptJsons.add(serialized);
      }
    }
    if (!undoneReceiptJsons.size) {
      toast.info('部分内容后来又有修改，请使用编辑历史撤销');
      return;
    }
    update(session.task.id, (s) => ({
      ...s,
      reviews: Object.fromEntries(
        Object.entries(s.reviews).map(([k, v]) => [
          k,
          v === 'applied' &&
          s.receipts[k] &&
          undoneReceiptJsons.has(JSON.stringify(s.receipts[k]))
            ? 'undone'
            : v,
        ]),
      ),
    }));
    toast.success('已撤销全部修改，恢复原始简历内容');
  };
  const applySelected = (turn: AssistantTurn) => {
    if (!session || busy) return;
    const current = ref.current.find((s) => s.task.id === session.task.id)!;
    const indexes = turn.proposals
      .map((_, i) => i)
      .filter(
        (i) =>
          selected[`${turn.requestId}:${i}`] &&
          !current.reviews[`${turn.requestId}:${i}`],
      );
    if (!indexes.length) return;
    const receipt = applyChecked(
      indexes.map((i) => turn.proposals[i]),
      session.task.resumeId,
    );
    update(session.task.id, (s) => {
      const reviews = { ...s.reviews },
        receipts = { ...s.receipts };
      indexes.forEach((i) => {
        const key = `${turn.requestId}:${i}`;
        reviews[key] = receipt ? 'applied' : 'conflict';
        if (receipt) receipts[key] = receipt;
      });
      return { ...s, reviews, receipts };
    });
    indexes.forEach((i) =>
      event(receipt ? 'apply' : 'conflict', turn.feature, turn.requestId, {
        proposalId: proposalId(turn.requestId, i),
        proposalIndex: i,
        proposalCount: turn.proposals.length,
        selectedCount: indexes.length,
        operation: 'apply',
        mode: 'preview',
      }),
    );
    if (!receipt)
      toast.info('部分原文已变化，本次没有应用任何修改，请重新生成');
  };
  const continueQuestions = (turn: AssistantTurn) => {
    if (busy) return;
    const progress =
      questionProgress[turn.requestId] || INITIAL_QUESTION_PROGRESS;
    const structured = turn.questions.some(
      (q) => questionReplyRange(input, q.question).start >= 0,
    );
    const draft = structured
      ? input
      : updateQuestionReply(
          '',
          turn.questions[progress.index].question,
          input.trim(),
        );
    if (
      !questionReplyRange(
        draft,
        turn.questions[progress.index].question,
        turn.questions,
      ).answer.trim()
    )
      return;
    if (progress.index < turn.questions.length - 1) {
      setInput(draft);
      setQuestionProgress((previous) => ({
        ...previous,
        [turn.requestId]: {
          index: progress.index + 1,
          confirmed: Math.max(progress.confirmed, progress.index + 1),
        },
      }));
    } else {
      const missing = turn.questions.findIndex(
        (q) =>
          !questionReplyRange(draft, q.question, turn.questions).answer.trim(),
      );
      if (missing >= 0) {
        setInput(draft);
        setQuestionProgress((previous) => ({
          ...previous,
          [turn.requestId]: { ...progress, index: missing },
        }));
        return;
      }
      void send(draft);
    }
  };
  const latestTurn = session?.turns.at(-1);
  const currentQuestion =
    latestTurn?.questions[
      (questionProgress[latestTurn.requestId] || INITIAL_QUESTION_PROGRESS)
        .index
    ];
  const hasStructuredAnswer = latestTurn?.questions.some(
    (q) => questionReplyRange(input, q.question).start >= 0,
  );
  const currentAnswer =
    currentQuestion && hasStructuredAnswer
      ? questionReplyRange(
          input,
          currentQuestion.question,
          latestTurn?.questions,
        ).answer
      : input;
  const submitDraft = () => {
    if (latestTurn?.questions.length) continueQuestions(latestTurn);
    else void send(input);
  };
  if (!loaded || !session)
    return <div className="p-4 text-sm text-slate-500">加载对话…</div>;
  const remaining =
    session.task.feature === 'polish'
      ? quota.aiPolishSection
      : session.task.feature === 'generate'
        ? quota.aiGenerateSection
        : quota.aiEditorAssist;
  return (
    <div
      ref={panelRef}
      className="relative flex h-full min-h-0 flex-col bg-white"
      data-testid="unified-assistant"
    >
      <header
        data-testid="assistant-context"
        className="flex shrink-0 items-center gap-1 border-b border-slate-100 px-3 py-2"
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`当前任务：${session.task.label}，查看详情和历史对话`}
              title={session.task.label}
              className="flex h-9 min-w-0 flex-1 items-center gap-1 rounded-lg px-2 text-xs text-slate-700 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-500 active:bg-violet-100"
            >
              <span className="shrink-0 font-medium text-violet-700">
                {session.task.scope === 'resume'
                  ? '全文优化'
                  : session.task.feature === 'polish'
                    ? '润色'
                    : session.task.feature === 'generate'
                      ? '帮我写'
                      : '问答'}
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="truncate">{session.task.label}</span>
              <ChevronDown
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 text-slate-400"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-80 max-w-[calc(100vw-24px)] rounded-xl p-2"
          >
            <DropdownMenuLabel className="break-words text-xs leading-5">
              当前对象：{session.task.label}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-slate-500">
              历史对话 · 仅保存在当前浏览器
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              aria-label="历史对话"
              value={active}
              className="max-h-60 overflow-y-auto"
              onValueChange={(value) => {
                setActive(value);
                setInput('');
                setError('');
                setRetry(null);
              }}
            >
              {sessions.map((s) => (
                <DropdownMenuRadioItem
                  key={s.task.id}
                  value={s.task.id}
                  disabled={busy}
                  className="items-start break-words py-2 text-xs leading-5 focus:bg-violet-50 focus:text-slate-900"
                >
                  <span className="min-w-0">
                    {s.task.label}
                    <span className="block text-slate-500">
                      {s.turns[0]?.text.slice(0, 40) || '新任务'}
                    </span>
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          type="button"
          className="h-9 shrink-0 rounded-lg px-2 text-xs text-slate-600 hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-2 focus-visible:outline-violet-500 active:bg-violet-100 disabled:opacity-40"
          disabled={busy}
          onClick={startNew}
        >
          新对话
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="更多对话操作"
              className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-500 active:bg-violet-100"
            >
              <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem
              className="focus:bg-violet-50 focus:text-slate-900"
              disabled={busy}
              onSelect={onLegacy}
            >
              旧版历史
            </DropdownMenuItem>
            {session.task.blockId && (
              <DropdownMenuItem
                className="focus:bg-violet-50 focus:text-slate-900"
                disabled={busy}
                onSelect={startNew}
              >
                退出任务
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <div
        ref={scroll.viewport}
        data-testid="assistant-conversation"
        className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3"
        onScroll={scroll.onScroll}
        onWheel={scroll.onWheel}
        onTouchStart={scroll.onTouchStart}
        onKeyDown={scroll.onKeyDown}
        style={{ overflowAnchor: 'none', scrollBehavior: 'auto' }}
      >
        <div ref={scroll.content} className="space-y-5">
        {!session.turns.length && !busy && (
          <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs leading-6 text-slate-600">
            <p>
              {session.task.feature === 'polish'
                ? '整理表达，保留真实职责和成果。先查看差异，再决定是否应用。'
                : session.task.feature === 'generate'
                  ? '说说你实际做过什么；不知道从哪里开始，我可以带你一步步补充。'
                  : '告诉我你想改哪段，或提供目标岗位。修改建议会先展示。'}
            </p>
            <div className="flex flex-wrap gap-2">
              {(session.task.feature === 'polish'
                ? []
                : session.task.feature === 'generate'
                  ? ['我不知道怎么写，请引导我', '根据已有信息，帮我写这段经历']
                  : ['优化整份简历', '我不知道怎么写，请引导我']
              ).map((t) => (
                <button
                  className={button}
                  key={t}
                  onClick={() =>
                    void send(t, true, { submissionSource: 'starter' })
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
        {[...session.turns, ...(pendingTurn?.taskId === session.task.id && !session.turns.some(t => t.requestId === pendingTurn.turn.requestId) ? [pendingTurn.turn] : [])].map((turn, ti) => (
          <article
            key={turn.requestId}
            data-assistant-turn={turn.requestId}
            className="space-y-3"
          >
            <p className="ml-8 whitespace-pre-wrap break-words rounded-xl bg-violet-600 px-3 py-2 text-sm leading-6 text-white">
              {turn.text}
            </p>
            <StableAssistantReply busy={busy && turn.requestId === pendingTurn?.turn.requestId}>
            <div className="flex h-7 items-center gap-2 text-xs font-medium text-slate-500" role="status">
              {busy && turn.requestId === pendingTurn?.turn.requestId ? <><Loader2 className="h-3.5 w-3.5 animate-spin text-violet-600" /><span>{ASSISTANT_STAGES[stage]}</span></> : <span>{turn.questions.length ? '请补充真实信息' : turn.proposals.length ? '修改建议已就绪' : '回复已完成'}</span>}
            </div>
            {busy && turn.requestId === pendingTurn?.turn.requestId && !session.turns.some(t => t.requestId === turn.requestId) && (
              <div aria-label="生成中的草稿" aria-busy="true" className="space-y-3 rounded-xl border border-violet-200 bg-white p-3 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 text-xs">
                  <span className="font-semibold text-slate-800">{session.task.label}</span>
                  <span className="text-violet-600">草稿预览 · 尚未完成事实核对</span>
                </div>
                <div className="min-h-14 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{preview || '正在整理你的经历…'}</div>
              </div>
            )}
            {turn.coverage && (
              <details className="rounded-xl border border-slate-200 p-3 text-xs leading-6">
                <summary className="cursor-pointer font-medium text-slate-700">
                  全文检查范围 ·{' '}
                  {
                    turn.coverage.filter((item) =>
                      ['proposed', 'unchanged'].includes(item.status),
                    ).length
                  }
                  /{turn.coverage.length} 段已完成
                </summary>
                <p className="text-slate-500">
                  仅修改段落正文；姓名、联系方式、职位和日期等信息请自行核对。未检查的段落不代表没有问题。
                </p>
                <ul>
                  {turn.coverage.map((item) => (
                    <li
                      key={item.blockId}
                      className="flex items-start justify-between gap-3 py-1"
                    >
                      <span>{item.label}</span>
                      <span className="shrink-0 text-slate-500">
                        {
                          {
                            proposed: '有修改建议',
                            unchanged: '建议保留',
                            confirmation: '待确认',
                            unreviewed: '尚未检查',
                            empty: '暂无正文',
                          }[item.status]
                        }
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {turn.proposals.length > 1 &&
              turn.proposals.some(
                (_, i) => !session.reviews[`${turn.requestId}:${i}`],
              ) && (
                <div
                  className="flex flex-wrap items-center gap-2 rounded-lg bg-violet-50 p-2"
                  aria-label="批量处理建议"
                >
                  <button
                    className={button}
                    disabled={busy}
                    onClick={() =>
                      setSelected((prev) => ({
                        ...prev,
                        ...Object.fromEntries(
                          turn.proposals.map((_, i) => [
                            `${turn.requestId}:${i}`,
                            !session.reviews[`${turn.requestId}:${i}`],
                          ]),
                        ),
                      }))
                    }
                  >
                    全选待处理建议
                  </button>
                  <button
                    className={button}
                    disabled={busy}
                    onClick={() =>
                      setSelected((prev) => ({
                        ...prev,
                        ...Object.fromEntries(
                          turn.proposals.map((_, i) => [
                            `${turn.requestId}:${i}`,
                            false,
                          ]),
                        ),
                      }))
                    }
                  >
                    取消选择
                  </button>
                  <button
                    className={button}
                    disabled={
                      busy ||
                      !turn.proposals.some(
                        (_, i) =>
                          selected[`${turn.requestId}:${i}`] &&
                          !session.reviews[`${turn.requestId}:${i}`],
                      )
                    }
                    onClick={() => applySelected(turn)}
                  >
                    应用所选（
                    {
                      turn.proposals.filter(
                        (_, i) =>
                          selected[`${turn.requestId}:${i}`] &&
                          !session.reviews[`${turn.requestId}:${i}`],
                      ).length
                    }
                    ）
                  </button>
                </div>
              )}
            {turn.questions.length > 0 &&
              (ti === session.turns.length - 1 ? (
                <UnifiedQuestions
                  turn={turn}
                  draft={input}
                  busy={busy}
                  progress={
                    questionProgress[turn.requestId] ||
                    INITIAL_QUESTION_PROGRESS
                  }
                  onChange={setInput}
                  onEdit={(index) =>
                    setQuestionProgress((previous) => ({
                      ...previous,
                      [turn.requestId]: {
                        ...(previous[turn.requestId] ||
                          INITIAL_QUESTION_PROGRESS),
                        index,
                      },
                    }))
                  }
                  onContinue={() => continueQuestions(turn)}
                />
              ) : (
                <details className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
                  <summary className="cursor-pointer">
                    查看此前的 {turn.questions.length} 个问题
                  </summary>
                  {turn.questions.map((q, i) => (
                    <p className="mt-2" key={i}>
                      {i + 1}. {q.question}
                    </p>
                  ))}
                </details>
              ))}
            {turn.proposals.map((p, i) => (
              <div key={i} className="space-y-1">
                {turn.proposals.length > 1 &&
                  !session.reviews[`${turn.requestId}:${i}`] && (
                    <label className="flex items-center gap-2 px-1 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        className="accent-violet-600"
                        disabled={busy}
                        checked={!!selected[`${turn.requestId}:${i}`]}
                        onChange={(e) =>
                          setSelected((prev) => ({
                            ...prev,
                            [`${turn.requestId}:${i}`]: e.target.checked,
                          }))
                        }
                      />
                      选择建议：{p.targetLabel}
                    </label>
                  )}
                <ChangeCard
                  key={i}
                  proposal={p}
                  telemetryId={proposalId(turn.requestId, i)}
                  visible={panelVisible}
                  onVisible={() =>
                    event('proposal_view', turn.feature, turn.requestId, {
                      proposalId: proposalId(turn.requestId, i),
                      proposalIndex: i,
                      mode: turn.direct ? 'direct' : 'preview',
                      proposalCount: turn.proposals.length,
                    })
                  }
                  groupedUndo={
                    (session.receipts[`${turn.requestId}:${i}`]?.targets
                      .length || 0) > 1
                  }
                  status={session.reviews[`${turn.requestId}:${i}`]}
                  disabled={busy}
                  apply={() => review(turn, i, 'apply')}
                  keep={() => review(turn, i, 'keep')}
                  undo={() => review(turn, i, 'undo')}
                />
              </div>
            ))}
            {turn.answer && (
              <div className="ai-chat-markdown break-words text-sm leading-7 text-slate-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {turn.answer}
                </ReactMarkdown>
              </div>
            )}
            {turn.missingFacts &&
              turn.missingFacts.length > 0 &&
              !turn.questions.length && (
                <div className="rounded-lg border border-violet-100 bg-violet-50/70 p-3 text-xs space-y-2 assistant-reveal">
                  <div className="flex items-center gap-1.5 font-medium text-violet-900">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-violet-600" />
                    补充以下真实信息，让这段经历更有说服力：
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {turn.missingFacts.map((mf, mfi) => (
                      <button
                        key={mfi}
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          const prefix = `${mf.label}：`;
                          // Replace an unfilled selection, but preserve an existing draft.
                          const base = visibleFactExample
                            ? input.slice(0, input.lastIndexOf('\n') + 1)
                            : input ? `${input}\n` : '';
                          const draft = `${base}${prefix}`;
                          const example = mf.hint.trim()
                            .replace(/^(?:例如|示例|如)\s*[:：]\s*/, '')
                            .replace(/[，,。；;]?\s*请按实际(?:情况)?填写[。！!]?$/, '')
                            .trim();
                          setInput(draft);
                          setFactExample(example ? { draft, text: example } : null);
                          inputRef.current?.focus();
                        }}
                        title={mf.hint}
                        className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-white px-2.5 py-1 text-slate-700 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-900 transition-colors shadow-2xs"
                      >
                        <span className="font-medium">+ {mf.label}</span>
                        {mf.hint && (
                          <span className="text-[10px] text-slate-400">
                            ({mf.hint.length > 16 ? mf.hint.slice(0, 15) + '...' : mf.hint})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            {turn.coverage &&
              ti === session.turns.length - 1 &&
              !turn.questions.length &&
              !busy &&
              (() => {
                const optimizable = turn.coverage.filter(
                  (item) => item.status !== 'empty',
                );
                const completed = optimizable.filter(
                  (item) =>
                    item.status === 'proposed' || item.status === 'unchanged',
                );
                const nextItem = optimizable.find(
                  (item) => item.status === 'unreviewed',
                );
                const firstProposalStatus =
                  turn.proposals.length > 0
                    ? session.reviews[`${turn.requestId}:0`]
                    : undefined;
                const totalAppliedCount = Object.values(session.reviews).filter(
                  (status) => status === 'applied',
                ).length;
                return (
                  <div
                    data-testid="resume-step-controller"
                    className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/60 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-violet-900">
                        全文分步优化进度：{completed.length} / {optimizable.length} 个模块
                      </span>
                      {firstProposalStatus === 'applied' && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                          ✓ 已应用到简历
                        </span>
                      )}
                    </div>
                    {optimizable.length > 0 && (
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-violet-100">
                        <div
                          className="h-full rounded-full bg-violet-600 transition-all duration-300"
                          style={{
                            width: `${Math.round((completed.length / optimizable.length) * 100)}%`,
                          }}
                        />
                      </div>
                    )}
                    {nextItem ? (
                      <div className="space-y-2.5">
                        <p className="text-xs leading-5 text-slate-600">
                          {firstProposalStatus === 'applied'
                            ? `当前模块已应用到左侧简历。请确认是否保留，确认后将继续优化下一模块：「${nextItem.label}」`
                            : firstProposalStatus === 'undone' ||
                                firstProposalStatus === 'kept'
                              ? `当前模块已恢复原文。点击下方按钮继续优化下一模块：「${nextItem.label}」`
                              : `请确认当前模块修改，确认后将继续优化下一模块：「${nextItem.label}」`}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            className="rounded-lg bg-violet-600 px-3.5 py-2 text-xs font-medium text-white shadow-xs hover:bg-violet-700 active:bg-violet-800 disabled:opacity-40"
                            onClick={() => {
                              if (firstProposalStatus === 'conflict') return;
                              if (
                                turn.proposals.length > 0 &&
                                !session.reviews[`${turn.requestId}:0`]
                              ) {
                                if (!review(turn, 0, 'apply')) return;
                              }
                              void send(
                                `继续优化整份简历的下一模块：${nextItem.label}（blockId=${nextItem.blockId}）`,
                                true,
                                {
                                  submissionSource: 'followup',
                                  sourceRequestId: turn.requestId,
                                },
                              );
                            }}
                          >
                            {firstProposalStatus === 'undone' ||
                            firstProposalStatus === 'kept'
                              ? `继续优化下一模块（${completed.length + 1}/${optimizable.length}：${nextItem.label}）`
                              : `确认应用，优化下一模块（${completed.length + 1}/${optimizable.length}：${nextItem.label}）`}
                          </button>
                          {turn.proposals.length > 0 &&
                            firstProposalStatus === 'applied' && (
                              <button
                                type="button"
                                disabled={busy}
                                className={button}
                                onClick={() => {
                                  review(turn, 0, 'undo');
                                  void send(
                                    `继续优化整份简历的下一模块：${nextItem.label}（blockId=${nextItem.blockId}）`,
                                    true,
                                    {
                                      submissionSource: 'followup',
                                      sourceRequestId: turn.requestId,
                                    },
                                  );
                                }}
                              >
                                还原此项原文，继续下一模块
                              </button>
                            )}
                        </div>
                        <p className="text-xs text-slate-500">继续生成下一模块将按新请求计次。</p>
                      </div>
                    ) : (
                      <p className="text-xs font-medium leading-5 text-emerald-700">
                        整份简历共 {optimizable.length} 个模块已完成检查，请确认尚未应用的修改建议。
                      </p>
                    )}
                    {totalAppliedCount > 0 && (
                      <div className="flex items-center justify-between border-t border-violet-200/70 pt-2 text-xs text-slate-500">
                        <span>本次已应用 {totalAppliedCount} 处模块修改</span>
                        <button
                          type="button"
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"
                          onClick={undoAllApplied}
                        >
                          <Undo2 className="h-3 w-3" />
                          一键全部撤销
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            {ti === session.turns.length - 1 &&
              !turn.questions.length &&
              !busy &&
              panelVisible && (
                <div
                  className="space-y-2 pt-1 assistant-reveal"
                  aria-label="接下来可以"
                >
                  <p className="text-xs text-slate-400">接下来可以</p>
                  {relayFollowups(turn, session, sessions, currentResume).map((action, i) => {
                    const t = action.text;
                    const isNext =
                      action?.kind === 'next_block' ||
                      t.startsWith('👉 继续优化下一段：') ||
                      t.startsWith('继续优化下一段：');
                    return (
                      <FollowupOption
                        key={optionId(turn.requestId, i)}
                        text={t}
                        isNextBlock={isNext}
                        telemetryId={optionId(turn.requestId, i)}
                        onVisible={() =>
                          event('followup_view', turn.feature, turn.requestId, {
                            optionId: optionId(turn.requestId, i),
                            optionIndex: i,
                            optionCount: turn.followups.length,
                          })
                        }
                        onClick={() => {
                          event('followup_click', turn.feature, turn.requestId, {
                            optionId: optionId(turn.requestId, i),
                            optionIndex: i,
                          });

                          // 1. Next block relay
                          let targetBlockId = action?.targetBlockId;
                          let targetBlockLabel = action?.targetBlockLabel;
                          if (
                            !targetBlockId &&
                            (action?.kind === 'next_block' ||
                              t.startsWith('👉 继续优化下一段：') ||
                              t.startsWith('继续优化下一段：'))
                          ) {
                            const rawLabel = t
                              .replace(/^(?:👉\s*)?继续优化下一段：/, '')
                              .trim();
                            const resume = useAppStore.getState().resume;
                            const context = toResumeContext(resume);
                            const matched = context.sections
                              .flatMap((s) =>
                                s.blocks.map((b) => ({
                                  ...b,
                                  sectionTitle: s.title,
                                })),
                              )
                              .find(
                                (b) =>
                                  [b.sectionTitle, b.label]
                                    .filter(Boolean)
                                    .join(' · ') === rawLabel ||
                                  b.label === rawLabel,
                              );
                            if (matched) {
                              targetBlockId = matched.blockId;
                              targetBlockLabel = rawLabel;
                            }
                          }

                          if (targetBlockId) {
                            const available = relayFollowups(turn, session, ref.current, useAppStore.getState().resume);
                            if (!available.some(a => a.kind === 'next_block' && a.targetBlockId === targetBlockId)) return;
                            scrollToResumeBlock(targetBlockId);
                            useEditorUiStore.setState({
                              assistantTask: {
                                id: crypto.randomUUID(),
                                resumeId,
                                feature: 'polish',
                                label: targetBlockLabel || '下一段经历优化',
                                entry: 'module',
                                blockId: targetBlockId,
                              },
                              activePanel: 'ai',
                              showAiChat: true,
                            });
                            return;
                          }

                          const topic = followupFactTopic(t);
                          if (topic) {
                            setFactEntry({
                              requestId: turn.requestId,
                              index: i,
                              topic,
                            });
                            scroll.follow();
                            return;
                          }

                          void send(followupRequest(t), true, {
                            submissionSource: 'followup',
                            sourceRequestId: turn.requestId,
                            sourceOptionId: optionId(turn.requestId, i),
                          });
                        }}
                      />
                    );
                  })}
                  {factEntry?.requestId === turn.requestId && (
                    <UnifiedFollowupForm
                      key={`${turn.requestId}:${factEntry.index}`}
                      topic={factEntry.topic}
                      targets={
                        session.task.blockId
                          ? [
                              {
                                id: session.task.blockId,
                                label: session.task.label,
                              },
                            ]
                          : [
                              ...new Map(
                                turn.proposals.flatMap((proposal) =>
                                  proposal.action === 'updateBlock'
                                    ? [
                                        [
                                          proposal.blockId,
                                          {
                                            id: proposal.blockId,
                                            label: proposal.targetLabel,
                                          },
                                        ] as const,
                                      ]
                                    : [],
                                ),
                              ).values(),
                            ]
                      }
                      onCancel={() => setFactEntry(null)}
                      onSubmit={(text, followupTargetId) =>
                        void send(
                          text,
                          true,
                          {
                            submissionSource: 'followup',
                            sourceRequestId: turn.requestId,
                            sourceOptionId: optionId(
                              turn.requestId,
                              factEntry.index,
                            ),
                          },
                          { messageSource: 'user', followupTargetId },
                        )
                      }
                    />
                  )}
                </div>
              )}
            </StableAssistantReply>
          </article>
        ))}
        {error && (
          <div
            role="alert"
            className="space-y-2 text-xs leading-6 text-red-600"
          >
            <p>{error}</p>
            <p className="text-slate-500">
              重新生成会按新请求计次；上一请求若已开始生成，可能已扣次。
            </p>
            {retry && (
              <button
                className={button}
                onClick={() =>
                  void send(
                    retry.text,
                    retry.fromFollowup,
                    retry.submission,
                    retry.intent,
                  )
                }
              >
                重新生成（重新计次）
              </button>
            )}
            <button
              className={button}
              onClick={() => {
                setInput(retry?.text || '请根据刚才的信息重新生成');
                setRetry(null);
                setError('');
              }}
            >
              编辑要求后重新发送
            </button>
          </div>
        )}
        <div ref={end} />
        </div>
      </div>
      {scroll.paused && <button type="button" onClick={scroll.jumpToLatest} className="absolute bottom-32 right-5 z-10 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs text-violet-700 shadow-sm">回到最新</button>}
      <form
        data-testid="assistant-composer"
        className="shrink-0 space-y-1 border-t border-slate-100 px-3 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          submitDraft();
        }}
      >
        <div className="relative">
          <textarea
            ref={inputRef}
            aria-label="向 AI 描述修改需求"
            rows={1}
            className="block max-h-[120px] min-h-14 w-full resize-none overflow-y-auto rounded-xl border border-slate-200 py-3 pl-3 pr-14 text-sm leading-6 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setFactExample(null);
            }}
            aria-describedby={visibleFactExample ? 'assistant-fact-example' : undefined}
            placeholder={
              currentQuestion
                ? '填写当前问题的答案…'
                : '说说经历，或你想怎么改…'
            }
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'Escape') setFactExample(null);
              if (
                e.key === 'Tab' && !e.shiftKey && !e.ctrlKey &&
                !e.altKey && !e.metaKey && visibleFactExample && !busy
              ) {
                e.preventDefault();
                acceptFactExample();
                return;
              }
              if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          {busy ? (
            <button
              type="button"
              title="停止生成"
              className="absolute right-2 bottom-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-violet-500 active:bg-slate-300"
              onClick={() => abort.current?.abort()}
            >
              <Square aria-hidden="true" className="h-3.5 w-3.5" />
              <span className="sr-only">停止</span>
            </button>
          ) : (
            <button
              aria-label={currentQuestion ? '确认当前回答' : '发送消息'}
              disabled={!currentAnswer.trim()}
              title={currentQuestion ? '确认当前回答' : '发送消息'}
              className="absolute right-2 bottom-2 flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-white hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 active:bg-violet-800 disabled:opacity-40"
            >
              <SendHorizonal aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        </div>
        {visibleFactExample && !busy && (
          <div
            id="assistant-fact-example"
            className="rounded-lg bg-violet-50 px-3 py-2 text-xs leading-5"
            aria-live="polite"
          >
            <p className="whitespace-pre-wrap break-words text-slate-500">
              示例：{visibleFactExample.text}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 text-slate-500">
              <button
                type="button"
                onClick={acceptFactExample}
                className="font-medium text-violet-700 hover:text-violet-900"
              >
                按 Tab 填入示例
              </button>
              <span>填入后可修改，数据请按实际情况调整</span>
            </div>
          </div>
        )}
        <p className="text-[11px] leading-5 text-slate-500">
          {session.task.feature === 'chat'
            ? '按问答或写作任务计次'
            : remaining.isVip
              ? '今日不限次'
              : `今日剩余 ${remaining.remaining} 次`}
          {' · 追问不扣次，生成计次'}
        </p>
      </form>
    </div>
  );
}
