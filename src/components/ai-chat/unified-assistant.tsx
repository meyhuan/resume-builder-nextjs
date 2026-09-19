'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { get, set } from 'idb-keyval';
import {
  Loader2,
  SendHorizonal,
  Square,
  Sparkles,
  ArrowUpRight,
  Undo2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { useAppStore } from '@/state/store';
import { useEditorUiStore } from '@/state/editor-ui-store';
import { useVipStore } from '@/store/use-vip-store';
import { refreshEditorAssistQuota } from '@/lib/ai/assist-client';
import { track } from '@/lib/analytics';
import { plainText } from '@/lib/ai/unified/policy';
import type {
  AssistantSession,
  AssistantTask,
  AssistantTurn,
  CheckedProposal,
  ReviewStatus,
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
function ChangeCard({
  proposal,
  status,
  apply,
  keep,
  undo,
  disabled,
}: {
  proposal: CheckedProposal;
  status?: ReviewStatus;
  apply: () => void;
  keep: () => void;
  undo: () => void;
  disabled: boolean;
}) {
  const [diff, setDiff] = useState(true);
  const pieces = textDiff(beforeText(proposal), afterText(proposal));
  return (
    <section
      className="space-y-3 rounded-xl border border-violet-200 bg-white p-3"
      aria-label={`修改建议：${proposal.targetLabel}`}
    >
      <button
        type="button"
        className="text-left text-xs font-semibold text-slate-800 hover:text-violet-700"
        onClick={() => {
          if (proposal.action !== 'updateBlock') return;
          const target = Array.from(
            document.querySelectorAll<HTMLElement>('[data-ai-block-id]'),
          ).find((el) => el.dataset.aiBlockId === proposal.blockId);
          if (target) {
            target.scrollIntoView({ block: 'center', behavior: 'smooth' });
            target.animate(
              [
                { backgroundColor: '#ede9fe' },
                { backgroundColor: 'transparent' },
              ],
              { duration: 1400 },
            );
          }
        }}
      >
        {proposal.targetLabel}
      </button>
      {proposal.action === 'updateBlock' && (
        <div className="flex gap-2">
          <button
            className={button}
            aria-pressed={diff}
            onClick={() => setDiff(true)}
          >
            查看差异
          </button>
          <button
            className={button}
            aria-pressed={!diff}
            onClick={() => setDiff(false)}
          >
            完整改写
          </button>
        </div>
      )}
      <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
        {diff && proposal.action === 'updateBlock'
          ? pieces.map((p, i) =>
              p.kind === 'remove' ? (
                <del
                  key={i}
                  className="bg-rose-50 text-rose-700 decoration-rose-400"
                >
                  {p.text}
                </del>
              ) : p.kind === 'add' ? (
                <ins
                  key={i}
                  className="bg-emerald-50 text-emerald-800 underline decoration-emerald-400"
                >
                  {p.text}
                </ins>
              ) : (
                <span key={i}>{p.text}</span>
              ),
            )
          : afterText(proposal) || '新增空白模块'}
      </div>
      {status ? (
        <div
          role="status"
          className="flex items-center justify-between text-xs text-slate-500"
        >
          <span>
            {status === 'applied'
              ? '已应用'
              : status === 'kept'
                ? '已保留原文'
                : status === 'undone'
                  ? '已撤销'
                  : '原文已变化，请重新生成'}
          </span>
          {status === 'applied' && (
            <button className={button} disabled={disabled} onClick={undo}>
              <Undo2 className="mr-1 inline h-3 w-3" />
              撤销这次修改
            </button>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            className="rounded-lg bg-violet-600 px-3 py-2 text-xs text-white disabled:opacity-40"
            disabled={disabled}
            onClick={apply}
          >
            应用这一处
          </button>
          <button className={button} disabled={disabled} onClick={keep}>
            保留原文
          </button>
        </div>
      )}
    </section>
  );
}
export function UnifiedAssistant({
  resumeId,
  onLegacy,
}: {
  resumeId: string;
  onLegacy: () => void;
}) {
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [active, setActive] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState('');
  const [retry, setRetry] = useState<{
    task: AssistantTask;
    requestId: string;
    text: string;
    fromFollowup?: boolean;
    resumeData: ReturnType<typeof useAppStore.getState>['resume'];
  } | null>(null);
  const actions = useRef<{
    send: (text: string) => void;
    startNew: () => void;
  }>({ send: () => {}, startNew: () => {} });
  const ref = useRef(sessions);
  ref.current = sessions;
  const abort = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const consumed = useRef<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const task = useEditorUiStore((s) => s.assistantTask);
  const externalMessage = useEditorUiStore((s) => s.pendingAiMessage);
  const session = sessions.find((s) => s.task.id === active);
  const quota = useVipStore((s) => s.quota);
  const storageKey = `ai-unified-history:${resumeId}`;
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
    if (!existing)
      persist([makeSession(resumeId, task), ...ref.current].slice(0, 20));
    setActive(task.id);
    setInput('');
    setError('');
    setRetry(null);
  }, [task, loaded, busy, resumeId, persist]);
  useEffect(() => {
    if (nearBottom.current)
      end.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [sessions, pending, error]);
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
    action: string,
    feature = session?.task.feature,
    requestId?: string,
  ) => {
    try {
      track('ai_assist_interaction', {
        feature,
        action,
        requestId,
        taskId: session?.task.id,
        entry: session?.task.entry,
      });
    } catch {
      /* Telemetry cannot interrupt editing. */
    }
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
    retryBody = retry,
    fromFollowup = false,
  ) => {
    if (!session || busy || abort.current || !text.trim()) return;
    const body = retryBody || {
      task: session.task,
      requestId: crypto.randomUUID(),
      text: text.trim(),
      fromFollowup,
      resumeData: structuredClone(useAppStore.getState().resume),
    };
    setBusy(true);
    setError('');
    setPending(body.text);
    setInput('');
    setRetry(body);
    nearBottom.current = true;
    event('start', body.task.feature, body.requestId);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const response = await fetch('/next-api/ai/chat/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.quotaExceeded) {
          useVipStore.getState().setShowUpgrade(true, 'ai');
          event('quota_blocked', body.task.feature, body.requestId);
        }
        throw new Error(data.error || '处理失败，请重试');
      }
      if (controller.signal.aborted || !mounted.current) return;
      const turn = data.turn as AssistantTurn;
      if (turn.requestId !== body.requestId)
        throw new Error('返回结果不匹配，请重试');
      update(body.task.id, (s) =>
        s.turns.some((t) => t.requestId === turn.requestId)
          ? s
          : { ...s, turns: [...s.turns, turn], updatedAt: Date.now() },
      );
      const current = ref.current.find((s) => s.task.id === body.task.id);
      // Live responses only. Restoring history must never execute a proposal.
      if (
        turn.direct &&
        !body.fromFollowup &&
        current &&
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
        if (receipt) event('direct_apply', turn.feature, turn.requestId);
        else toast.info('原文已变化，未自动应用，请重新生成');
      }
      event(
        turn.questions.length ? 'clarify' : 'success',
        turn.feature,
        turn.requestId,
      );
      if (turn.proposals.length && !turn.direct)
        event('preview', turn.feature, turn.requestId);
      setRetry(null);
      refreshEditorAssistQuota();
    } catch (e) {
      if (controller.signal.aborted) {
        setError('已停止，未应用任何新修改。');
        event('cancel', body.task.feature, body.requestId);
        setRetry(null);
      } else {
        setError(e instanceof Error ? e.message : '处理失败');
        event('failed', body.task.feature, body.requestId);
      }
    } finally {
      if (mounted.current) {
        setBusy(false);
        setPending('');
      }
      abort.current = null;
    }
  };
  actions.current = {
    send: (text) => {
      void send(text, null, true);
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
      event('undo');
      return;
    }
    if (current.reviews[key]) return;
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
    );
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
      className="flex h-full min-h-0 flex-col bg-white"
      data-testid="unified-assistant"
    >
      <header className="shrink-0 space-y-2 border-b border-slate-100 p-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1 text-sm font-semibold text-violet-700">
            <Sparkles className="h-4 w-4" />
            AI 助手
          </h2>
          <div className="flex gap-2">
            <button
              className="text-xs text-slate-400 hover:text-violet-700"
              disabled={busy}
              onClick={onLegacy}
            >
              旧版历史
            </button>
            <button className={button} disabled={busy} onClick={startNew}>
              新对话
            </button>
          </div>
        </div>
        <select
          aria-label="历史对话"
          className="w-full rounded-lg border border-slate-200 p-1.5 text-xs"
          value={active}
          disabled={busy}
          onChange={(e) => {
            setActive(e.target.value);
            setInput('');
            setError('');
            setRetry(null);
          }}
        >
          {sessions.map((s) => (
            <option key={s.task.id} value={s.task.id}>
              {s.task.label} · {s.turns[0]?.text.slice(0, 16) || '新任务'}
            </option>
          ))}
        </select>
        <div className="rounded-lg bg-violet-50 px-2 py-2 text-xs leading-5">
          <p className="break-words font-medium text-slate-700">
            当前对象：{session.task.label}
          </p>
          <div className="flex items-center justify-between text-slate-500">
            <span>
              {session.task.feature === 'polish'
                ? '润色'
                : session.task.feature === 'generate'
                  ? '帮我写'
                  : '简历问答与修改'}
            </span>
            {session.task.blockId && (
              <button
                disabled={busy}
                onClick={startNew}
                className="text-violet-700"
              >
                退出任务
              </button>
            )}
          </div>
        </div>
      </header>
      <div
        className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3"
        onScroll={(e) => {
          const el = e.currentTarget;
          nearBottom.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
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
                ? ['帮我润色这段，保持事实不变', '帮我把这段写得更精简']
                : session.task.feature === 'generate'
                  ? ['我不知道怎么写，请引导我', '根据已有信息，帮我写这段经历']
                  : ['帮我检查哪些表达需要改进', '我不知道怎么写，请引导我']
              ).map((t) => (
                <button
                  className={button}
                  key={t}
                  onClick={() => void send(t, null)}
                >
                  {t}
                </button>
              ))}
            </div>
            <button className="text-slate-400 underline" onClick={onLegacy}>
              查看旧版对话
            </button>
          </div>
        )}
        {session.turns.map((turn, ti) => (
          <article key={turn.requestId} className="space-y-3">
            <p className="ml-8 whitespace-pre-wrap break-words rounded-xl bg-violet-600 px-3 py-2 text-sm leading-6 text-white">
              {turn.text}
            </p>
            {turn.answer && (
              <div className="ai-chat-markdown break-words text-sm leading-7 text-slate-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {turn.answer}
                </ReactMarkdown>
              </div>
            )}
            {turn.questions.map((q, i) => (
              <div
                key={i}
                className="space-y-2 rounded-xl border border-amber-100 bg-amber-50/50 p-3"
              >
                <p className="text-sm leading-6 text-slate-800">{q.question}</p>
                <div className="flex flex-wrap gap-2">
                  {q.options.map((option) => (
                    <button
                      disabled={busy}
                      className={button}
                      key={option}
                      onClick={() =>
                        setInput(
                          (previous) =>
                            `${previous}${previous ? '\n' : ''}${q.question}：${option}`,
                        )
                      }
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {turn.proposals.map((p, i) => (
              <ChangeCard
                key={i}
                proposal={p}
                status={session.reviews[`${turn.requestId}:${i}`]}
                disabled={busy}
                apply={() => review(turn, i, 'apply')}
                keep={() => review(turn, i, 'keep')}
                undo={() => review(turn, i, 'undo')}
              />
            ))}
            {ti === session.turns.length - 1 && !busy && (
              <div className="space-y-2 pt-1" aria-label="接下来可以">
                <p className="text-xs text-slate-400">接下来可以</p>
                {turn.followups.map((t) => (
                  <button
                    className="flex w-full items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-left text-xs leading-5 text-slate-700 hover:bg-violet-50"
                    key={t}
                    onClick={() => {
                      event('followup_click', turn.feature, turn.requestId);
                      void send(t, null, true);
                    }}
                  >
                    {t}
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </article>
        ))}
        {busy && (
          <div role="status" className="space-y-3">
            <p className="ml-8 rounded-xl bg-violet-600 p-3 text-sm text-white">
              {pending}
            </p>
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              正在核对信息并整理结果…
            </p>
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="space-y-2 text-xs leading-6 text-red-600"
          >
            <p>{error}</p>
            {retry && (
              <button
                className={button}
                onClick={() => void send(retry.text, retry)}
              >
                重试原请求
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
      <form
        className="shrink-0 space-y-2 border-t border-slate-100 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input, null);
        }}
      >
        <textarea
          aria-label="向 AI 描述修改需求"
          rows={3}
          className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-violet-400"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="说说真实经历，或告诉我想怎么调整…"
          onKeyDown={(e) => {
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
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] leading-5 text-slate-400">
            {session.task.feature === 'chat'
              ? '按问答或写作任务计次'
              : `今日剩余 ${remaining.isVip ? '不限' : remaining.remaining} 次`}{' '}
            · 补充事实不重复扣次
          </span>
          {busy ? (
            <button
              type="button"
              className={button}
              onClick={() => abort.current?.abort()}
            >
              <Square className="mr-1 inline h-3 w-3" />
              停止
            </button>
          ) : (
            <button
              aria-label="发送消息"
              disabled={!input.trim()}
              className="rounded-full bg-violet-600 p-2.5 text-white disabled:opacity-40"
            >
              <SendHorizonal className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
