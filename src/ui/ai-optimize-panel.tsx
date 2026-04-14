'use client';

/**
 * AiOptimizePanel — 4-phase "one-click resume optimization" panel.
 *
 * Phases: INPUT → LOADING → PREVIEW → DONE
 * AI result is shown as a diff preview before being written to the store.
 */
import { useState, useEffect, useCallback, useRef, useMemo, type ReactElement } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Check, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/state/store';
import { useVipCheck } from '@/hooks/use-vip-check';
import { useOptimizeResume } from '@/lib/ai/use-optimize-resume';
import type { SectionIdentity } from '@/lib/ai/section-types';
import { SECTION_IDENTITY_OPTIONS } from '@/lib/ai/section-types';
import type { OptimizeResumeBlock } from '@/lib/ai/optimize-resume-prompt-builder';
import { MIN_OPTIMIZE_CONTENT_LENGTH, MAX_OPTIMIZE_JD_LENGTH } from '@/lib/ai/optimize-resume-prompt-builder';
import type { ResumeBlock } from '@/entities/blocks/resume-block';

type Phase = 'input' | 'loading' | 'preview' | 'done';

const LOADING_MESSAGES = [
  'AI 正在阅读你的简历...',
  '正在匹配岗位要求...',
  '正在优化内容表达...',
] as const;

const BLOCK_TYPE_LABEL: Record<string, string> = {
  experience: '工作经历',
  project: '项目经历',
  campus: '校园经历',
  text: '自我评价',
};

/** Extract a display label from a block. */
function getBlockLabel(block: ResumeBlock): string {
  if (block.type === 'experience') return block.company || '工作经历';
  if (block.type === 'project') return block.name || '项目经历';
  if (block.type === 'campus') return block.organization || '校园经历';
  if (block.type === 'text') return '自我评价';
  return '内容';
}

/** Extract the primary HTML content from a block. */
function getBlockContentHtml(block: ResumeBlock): string {
  if ('contentHtml' in block) return (block as { contentHtml: string }).contentHtml || '';
  if ('html' in block) return (block as { html: string }).html || '';
  return '';
}

/** Strip HTML tags for character counting. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/** Convert resume sections into OptimizeResumeBlock list for the AI. */
function extractOptimizableBlocks(resume: ReturnType<typeof useAppStore.getState>['resume']): {
  sendableBlocks: OptimizeResumeBlock[];
  emptyLabels: string[];
} {
  const sendableBlocks: OptimizeResumeBlock[] = [];
  const emptyLabels: string[] = [];

  for (const section of resume.sections) {
    for (const block of section.blocks) {
      if (!['experience', 'project', 'campus', 'text'].includes(block.type)) continue;
      const contentHtml = getBlockContentHtml(block);
      const textLen = stripHtml(contentHtml).length;
      const label = `${BLOCK_TYPE_LABEL[block.type] ?? '内容'} · ${getBlockLabel(block)}`;
      if (textLen < MIN_OPTIMIZE_CONTENT_LENGTH) {
        emptyLabels.push(label);
        continue;
      }
      sendableBlocks.push({
        blockId: block.id,
        type: block.type as OptimizeResumeBlock['type'],
        label,
        contentHtml,
      });
    }
  }
  return { sendableBlocks, emptyLabels };
}

/** A single diff card showing before/after for one block. */
function DiffCard(props: {
  readonly label: string;
  readonly originalHtml: string;
  readonly optimizedHtml: string;
  readonly accepted: boolean;
  readonly onToggle: () => void;
}): ReactElement {
  const [expanded, setExpanded] = useState(true);
  const originalText = stripHtml(props.originalHtml);
  const optimizedText = stripHtml(props.optimizedHtml);
  const growth = originalText.length > 0
    ? Math.round(((optimizedText.length - originalText.length) / originalText.length) * 100)
    : 0;

  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${
        props.accepted
          ? 'border-violet-200 bg-violet-50/50'
          : 'border-slate-200 bg-white opacity-60'
      }`}
    >
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={props.onToggle}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            props.accepted
              ? 'border-violet-500 bg-violet-500 text-white'
              : 'border-slate-300 bg-white text-slate-400'
          }`}
          aria-label={props.accepted ? '取消接受' : '接受此优化'}
        >
          {props.accepted && <Check size={12} />}
        </button>
        <span className="flex-1 text-sm font-semibold text-slate-700 truncate">{props.label}</span>
        {growth > 0 && (
          <span className="shrink-0 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            +{growth}%
          </span>
        )}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-slate-400 hover:text-slate-600"
          aria-label={expanded ? '折叠' : '展开'}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">原文</div>
            <div
              className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 line-through leading-relaxed"
              dangerouslySetInnerHTML={{ __html: props.originalHtml }}
            />
          </div>
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-500">优化后</div>
            <div
              className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: props.optimizedHtml }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function AiOptimizePanel(): ReactElement {
  const resume = useAppStore((s) => s.resume);
  const setResume = useAppStore((s) => s.setResume);
  const { quota, quotaLoaded, setShowUpgrade } = useVipCheck();
  const { isRunning, resultMap, error, quotaExceeded, run, abort, reset } = useOptimizeResume();

  const [phase, setPhase] = useState<Phase>('input');
  const [jd, setJd] = useState('');
  const [identity, setIdentity] = useState<SectionIdentity>('professional');
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [originalMap, setOriginalMap] = useState<Record<string, string>>({});
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const optimizeQuota = quotaLoaded ? quota.aiOptimizeResume : null;
  const remainingCount = optimizeQuota
    ? (optimizeQuota.isVip ? '∞' : String(optimizeQuota.remaining))
    : '...';

  const { sendableBlocks, emptyLabels } = useMemo(
    () => extractOptimizableBlocks(resume),
    [resume],
  );

  const startLoadingMessages = useCallback((): void => {
    setLoadingMsgIdx(0);
    loadingIntervalRef.current = setInterval(() => {
      setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 3000);
  }, []);

  const stopLoadingMessages = useCallback((): void => {
    if (loadingIntervalRef.current) {
      clearInterval(loadingIntervalRef.current);
      loadingIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopLoadingMessages();
  }, [stopLoadingMessages]);

  const handleRun = async (): Promise<void> => {
    if (!optimizeQuota?.isVip && !optimizeQuota?.allowed) {
      setShowUpgrade(true);
      return;
    }
    if (sendableBlocks.length === 0) return;

    const snap: Record<string, string> = {};
    for (const b of sendableBlocks) {
      snap[b.blockId] = b.contentHtml;
    }
    setOriginalMap(snap);

    setPhase('loading');
    startLoadingMessages();

    const result = await run({ blocks: sendableBlocks, identity, jobDescription: jd || undefined });

    stopLoadingMessages();

    if (result && Object.keys(result).length > 0) {
      setAcceptedIds(new Set(Object.keys(result)));
      setPhase('preview');
    } else if (!error) {
      setPhase('input');
    } else {
      setPhase('input');
    }
  };

  const handleAbort = useCallback((): void => {
    abort();
    stopLoadingMessages();
    setPhase('input');
  }, [abort, stopLoadingMessages]);

  const handleApply = useCallback((): void => {
    const toApply = Object.entries(resultMap).filter(([id]) => acceptedIds.has(id));
    if (toApply.length === 0) {
      setPhase('input');
      return;
    }
    setResume((draft) => {
      for (const section of draft.sections) {
        for (const block of section.blocks) {
          const newHtml = toApply.find(([id]) => id === block.id)?.[1];
          if (!newHtml) continue;
          if ('contentHtml' in block) {
            (block as { contentHtml: string }).contentHtml = newHtml;
          } else if ('html' in block) {
            (block as { html: string }).html = newHtml;
          }
        }
      }
    });
    setPhase('done');
    setTimeout(() => {
      reset();
      setPhase('input');
    }, 3500);
  }, [resultMap, acceptedIds, setResume, reset]);

  const handleDiscard = useCallback((): void => {
    reset();
    setPhase('input');
  }, [reset]);

  const toggleAccept = useCallback((id: string): void => {
    setAcceptedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (phase === 'loading') {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-6 p-8">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-violet-100 animate-ping opacity-40" />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-violet-100">
            <Loader2 className="h-6 w-6 text-violet-600 animate-spin" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-slate-700">{LOADING_MESSAGES[loadingMsgIdx]}</p>
          <p className="text-xs text-slate-400">AI 正在从整体视角优化你的简历</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-slate-600 text-xs"
          onClick={handleAbort}
        >
          取消
        </Button>
      </div>
    );
  }

  if (phase === 'done') {
    const appliedCount = Object.keys(resultMap).filter((id) => acceptedIds.has(id)).length;
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-7 w-7 text-emerald-600" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-slate-800">已应用 {appliedCount} 个优化</p>
          <p className="text-xs text-slate-400">按 Ctrl+Z 可撤销所有更改</p>
        </div>
      </div>
    );
  }

  if (phase === 'preview') {
    const previewEntries = Object.entries(resultMap);
    const acceptedCount = previewEntries.filter(([id]) => acceptedIds.has(id)).length;
    const allSelected = acceptedCount === previewEntries.length;
    const noneSelected = acceptedCount === 0;

    const toggleAll = (): void => {
      if (allSelected) {
        setAcceptedIds(new Set());
      } else {
        setAcceptedIds(new Set(previewEntries.map(([id]) => id)));
      }
    };

    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-5 pt-2 pb-3 shrink-0 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            <span className="text-sm font-semibold text-slate-700 flex-1">
              AI 优化了 {previewEntries.length} 个模块
            </span>
            <button
              type="button"
              onClick={toggleAll}
              className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-800 transition-colors"
            >
              <div
                className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${
                  allSelected
                    ? 'border-violet-500 bg-violet-500'
                    : noneSelected
                      ? 'border-slate-300 bg-white'
                      : 'border-violet-400 bg-violet-100'
                }`}
              >
                {allSelected && <Check size={10} className="text-white" />}
                {!allSelected && !noneSelected && (
                  <div className="h-1.5 w-1.5 rounded-sm bg-violet-500" />
                )}
              </div>
              {allSelected ? '全部取消' : '全部选中'}
            </button>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            已选 {acceptedCount}/{previewEntries.length} 个模块，确认后写入简历
          </p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-3">
          {previewEntries.map(([blockId, optimizedHtml]) => (
            <DiffCard
              key={blockId}
              label={sendableBlocks.find((b) => b.blockId === blockId)?.label ?? blockId}
              originalHtml={originalMap[blockId] ?? ''}
              optimizedHtml={optimizedHtml}
              accepted={acceptedIds.has(blockId)}
              onToggle={() => toggleAccept(blockId)}
            />
          ))}

          {emptyLabels.length > 0 && (
            <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold text-amber-700 mb-1">以下模块内容为空，已跳过：</p>
              <ul className="space-y-0.5">
                {emptyLabels.map((label) => (
                  <li key={label} className="text-xs text-amber-600">· {label}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 space-y-2">
          <Button
            className="w-full h-11 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-semibold hover:opacity-90 transition-opacity shadow-sm"
            onClick={handleApply}
            disabled={acceptedCount === 0}
          >
            应用选中的 {acceptedCount} 个优化
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-slate-400 hover:text-slate-600 text-xs"
            onClick={handleDiscard}
          >
            放弃，不做修改
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-5">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">求职身份</p>
          <div className="flex gap-2 flex-wrap">
            {SECTION_IDENTITY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setIdentity(opt.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  identity === opt.id
                    ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">目标岗位 JD</p>
            <span className="text-[11px] text-slate-400">{jd.length}/{MAX_OPTIMIZE_JD_LENGTH}</span>
          </div>
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value.slice(0, MAX_OPTIMIZE_JD_LENGTH))}
            rows={6}
            placeholder={`请将招聘软件（如 BOSS直聘）上的【职位描述】粘贴到这里\n建议包含：\n- 岗位职责\n- 任职要求\n（提示：内容越详细，AI 优化的匹配度越高）`}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 leading-relaxed transition-colors"
          />
          <p className="text-[11px] text-slate-400">JD 为可选项，不填也可直接优化</p>
        </div>

        {sendableBlocks.length > 0 && (
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold text-slate-600 mb-2">
              将优化 {sendableBlocks.length} 个模块：
            </p>
            <ul className="space-y-1">
              {sendableBlocks.map((b) => (
                <li key={b.blockId} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className="h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
                  {b.label}
                </li>
              ))}
            </ul>
            {emptyLabels.length > 0 && (
              <p className="mt-2 text-[11px] text-amber-500">
                · {emptyLabels.length} 个模块内容为空将被跳过
              </p>
            )}
          </div>
        )}

        {sendableBlocks.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center">
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm font-semibold text-slate-500">暂无可优化的内容</p>
            <p className="mt-1 text-xs text-slate-400">请先填写工作经历、项目经历或自我评价</p>
          </div>
        )}

        {(error || quotaExceeded) && (
          <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <p className="text-xs text-red-600">{error ?? '今日优化次数已用完，升级 VIP 可无限使用'}</p>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-4 space-y-2">
        <Button
          className="w-full h-11 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-semibold hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50"
          disabled={isRunning || sendableBlocks.length === 0}
          onClick={handleRun}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          一键优化简历
        </Button>
        <p className="text-center text-[11px] text-slate-400">
          今日剩余 {remainingCount} 次 · VIP 用户无限使用
        </p>
      </div>
    </div>
  );
}
