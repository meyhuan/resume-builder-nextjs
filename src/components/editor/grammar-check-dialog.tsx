'use client';

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  RotateCcw,
  SpellCheck,
  Trash2,
  Wand2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ScoreCircle, ScoreTrend } from '@/components/ai/score-circle';
import { AiWaitingState, isAbortError } from '@/components/ai/ai-waiting-state';
import {
  createHistoryId,
  deleteAnalysisHistory,
  listAnalysisHistory,
  saveAnalysisHistory,
  type AnalysisHistoryItem,
} from '@/lib/ai/analysis-history';
import type { GrammarCheckOutput, GrammarIssue } from '@/lib/ai/grammar-check-schema';
import { useAppStore } from '@/state/store';
import { useEditorUiStore } from '@/state/editor-ui-store';
import { useVipCheck } from '@/hooks/use-vip-check';

const HISTORY_KIND = 'grammar-check';

const WAITING_MESSAGES = [
  'AI 正在阅读你的简历…',
  '正在检查语法和拼写…',
  '正在标出可量化的表述…',
] as const;

const SEVERITY_LABEL: Record<GrammarIssue['severity'], string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const TYPE_LABEL: Record<GrammarIssue['type'], string> = {
  grammar: '语法',
  weak_verb: '弱动词',
  vague: '表述空泛',
  quantify: '缺少量化',
  spelling: '拼写',
};

function formatDate(value: number): string {
  return new Date(value).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function GrammarResultView(props: { readonly result: GrammarCheckOutput }): ReactElement {
  return (
    <div className="space-y-6 px-6 py-4">
      <div className="flex items-center justify-center rounded-xl border border-slate-100 bg-slate-50/50 py-5">
        <ScoreCircle score={props.result.score} label="写作质量" />
      </div>
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-slate-800">摘要</h4>
        <p className="text-sm leading-relaxed text-slate-600">{props.result.summary}</p>
      </div>
      {props.result.issues.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-800">问题（{props.result.issues.length}）</h4>
          {props.result.issues.map((issue, index) => (
            <div key={`${issue.sectionTitle}-${index}`} className="space-y-2 rounded-lg border border-slate-200 bg-white p-3.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="text-xs font-medium">{issue.sectionTitle}</Badge>
                <Badge className={
                  issue.severity === 'high'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : issue.severity === 'medium'
                      ? 'border-yellow-200 bg-yellow-50 text-yellow-700'
                      : 'border-blue-200 bg-blue-50 text-blue-700'
                }>
                  {SEVERITY_LABEL[issue.severity]}
                </Badge>
                <Badge variant="secondary" className="text-xs">{TYPE_LABEL[issue.type]}</Badge>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400">原文</span>
                <p className="text-sm text-slate-500 line-through">{issue.original}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-violet-600">建议</span>
                <p className="text-sm font-medium text-slate-800">{issue.suggestion}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-slate-500">未发现问题</p>
      )}
    </div>
  );
}

export function GrammarCheckDialog(props: {
  readonly resumeId?: string;
}): ReactElement {
  const open = useEditorUiStore((state) => state.activeModal === 'grammar-check');
  const closeModal = useEditorUiStore((state) => state.closeModal);
  const handoffToChat = useEditorUiStore((state) => state.handoffToChat);
  const resume = useAppStore((state) => state.resume);
  const { requireAi } = useVipCheck();
  const historyKey = props.resumeId || resume.id || 'local';
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<GrammarCheckOutput | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('new');
  const [history, setHistory] = useState<AnalysisHistoryItem<GrammarCheckOutput>[]>([]);
  const [historyDetail, setHistoryDetail] = useState<AnalysisHistoryItem<GrammarCheckOutput> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadHistory = useCallback(async () => {
    setHistory(await listAnalysisHistory<GrammarCheckOutput>(HISTORY_KIND, historyKey));
  }, [historyKey]);

  useEffect(() => {
    if (open) void loadHistory();
  }, [open, loadHistory]);

  const handleCancel = useCallback((): void => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const handleClose = (): void => {
    handleCancel();
    closeModal();
    window.setTimeout(() => {
      setResult(null);
      setError('');
      setActiveTab('new');
      setHistoryDetail(null);
    }, 200);
  };

  const handleCheck = async (): Promise<void> => {
    if (!requireAi()) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsChecking(true);
    setError('');
    try {
      const response = await fetch('/next-api/ai/grammar-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData: resume }),
        signal: controller.signal,
      });
      const data = await response.json() as GrammarCheckOutput & { error?: string };
      if (!response.ok) throw new Error(data.error || '语法检查失败');
      setResult(data);
      const saved = await saveAnalysisHistory(HISTORY_KIND, historyKey, {
        id: createHistoryId(),
        createdAt: Date.now(),
        result: data,
        score: data.score,
        issueCount: data.issues.length,
      });
      setHistory(saved);
    } catch (err) {
      if (isAbortError(err)) return;
      setError(err instanceof Error ? err.message : '语法检查失败');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsChecking(false);
    }
  };

  const handleFixAll = (): void => {
    if (!result || result.issues.length === 0) return;
    const issueList = result.issues
      .map((issue, index) => `${index + 1}. [${issue.sectionTitle}] "${issue.original}" → "${issue.suggestion}"`)
      .join('\n');
    handoffToChat(`请根据以下语法检查结果，逐一修复简历中的问题：\n\n${issueList}\n\n请使用工具直接修改对应的简历模块内容。`);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => { if (!next) handleClose(); }}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="px-6 pb-0 pt-6">
            <DialogTitle className="flex items-center gap-2">
              <SpellCheck className="h-5 w-5 text-violet-600" />
              语法检查
            </DialogTitle>
            <DialogDescription>检查简历中的语法、拼写和表达问题。</DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col gap-0">
            <div className="px-6 pt-3">
              <TabsList className="w-full">
                <TabsTrigger value="new" className="flex-1" disabled={isChecking}>新检查</TabsTrigger>
                <TabsTrigger value="history" className="flex-1 gap-1.5" disabled={isChecking}>
                  历史
                  {history.length > 0 ? (
                    <Badge className="ml-1 h-5 min-w-5 bg-violet-600 px-1 text-xs text-white">{history.length}</Badge>
                  ) : null}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="new" className="flex min-h-0 flex-col">
              {isChecking ? (
                <AiWaitingState
                  messages={WAITING_MESSAGES}
                  hint="通常需要 10–20 秒，请稍候"
                  onCancel={handleCancel}
                />
              ) : !result ? (
                <div className="flex flex-col items-center justify-center px-6 py-12">
                  <SpellCheck className="mb-3 h-12 w-12 text-slate-300" />
                  <p className="mb-4 text-sm text-slate-500">检查当前简历的写作质量</p>
                  {error ? (
                    <div className="mb-4 flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      {error}
                    </div>
                  ) : null}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleClose}>关闭</Button>
                    <Button className="bg-violet-600 text-white hover:bg-violet-700" onClick={() => void handleCheck()}>
                      开始检查
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <GrammarResultView result={result} />
                  </div>
                  <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
                    <Button variant="outline" onClick={handleClose}>关闭</Button>
                    <Button variant="outline" className="gap-1.5" onClick={() => { setResult(null); void handleCheck(); }}>
                      <RotateCcw className="h-3.5 w-3.5" />
                      再检查
                    </Button>
                    {result.issues.length > 0 ? (
                      <Button className="gap-1.5 bg-violet-600 text-white hover:bg-violet-700" onClick={handleFixAll}>
                        <Wand2 className="h-3.5 w-3.5" />
                        全部修复
                      </Button>
                    ) : null}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="history" className="flex min-h-0 flex-col">
              {historyDetail ? (
                <>
                  <div className="px-6 pt-2">
                    <Button variant="ghost" size="sm" className="-ml-2 gap-1 text-slate-500" onClick={() => setHistoryDetail(null)}>
                      <ChevronLeft className="h-4 w-4" />
                      历史
                    </Button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <GrammarResultView result={historyDetail.result} />
                  </div>
                </>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-12">
                  <SpellCheck className="mb-3 h-12 w-12 text-slate-300" />
                  <p className="text-sm text-slate-500">还没有检查记录</p>
                </div>
              ) : (
                <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-6 py-4">
                  {history.map((item, index) => {
                    const previous = index < history.length - 1 ? history[index + 1].score : undefined;
                    return (
                      <div
                        key={item.id}
                        className="group flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 bg-white p-3 hover:border-slate-200"
                        onClick={() => setHistoryDetail(item)}
                      >
                        <div className="flex items-center gap-1">
                          <ScoreCircle score={item.score ?? item.result.score} size="sm" />
                          <ScoreTrend current={item.score ?? item.result.score} previous={previous} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs text-slate-400">{formatDate(item.createdAt)}</span>
                          <p className="mt-0.5 text-sm text-slate-600">{item.issueCount ?? item.result.issues.length} 个问题</p>
                        </div>
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteId(item.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(next) => { if (!next) setDeleteId(null); }}
        title="删除这条记录？"
        description="删除后无法恢复。"
        confirmText="删除"
        variant="destructive"
        onConfirm={() => {
          if (!deleteId) return;
          void deleteAnalysisHistory<GrammarCheckOutput>(HISTORY_KIND, historyKey, deleteId).then(setHistory);
          if (historyDetail?.id === deleteId) setHistoryDetail(null);
          setDeleteId(null);
        }}
      />
    </>
  );
}
