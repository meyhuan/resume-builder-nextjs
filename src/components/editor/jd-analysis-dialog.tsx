'use client';

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import {
  AlertTriangle,
  Briefcase,
  ChevronDown,
  ChevronLeft,
  FileSearch,
  Lightbulb,
  RotateCcw,
  ShieldCheck,
  Target,
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
import { AiWaitingState } from '@/components/ai/ai-waiting-state';
import { useJdAnalysis } from '@/lib/ai/use-jd-analysis';
import {
  createHistoryId,
  deleteAnalysisHistory,
  listAnalysisHistory,
  saveAnalysisHistory,
  type AnalysisHistoryItem,
} from '@/lib/ai/analysis-history';
import type { JdAnalysisOutput } from '@/lib/ai/jd-analysis-schema';
import { formatJdSuggestionSection } from '@/lib/ai/jd-section-label';
import { useAppStore } from '@/state/store';
import { useEditorUiStore } from '@/state/editor-ui-store';
import { useVipCheck } from '@/hooks/use-vip-check';
import { MAX_OPTIMIZE_JD_LENGTH } from '@/lib/ai/optimize-resume-prompt-builder';

const HISTORY_KIND = 'jd-analysis';

const WAITING_MESSAGES = [
  'AI 正在阅读你的简历…',
  '正在对照职位描述…',
  '正在整理匹配建议…',
] as const;

function formatDate(value: number): string {
  return new Date(value).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function JdAnalysisResultView(props: {
  readonly result: JdAnalysisOutput;
  readonly jobDescription?: string;
}): ReactElement {
  const resume = useAppStore((state) => state.resume);
  const [jdExpanded, setJdExpanded] = useState(false);
  return (
    <div className="space-y-6 px-6 py-4">
      {props.jobDescription ? (
        <div className="rounded-lg border border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={() => setJdExpanded((open) => !open)}
            className="flex w-full items-center gap-1.5 px-3.5 py-2.5 text-left"
          >
            <Briefcase className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="flex-1 truncate text-sm font-semibold text-slate-800">职位描述</span>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${jdExpanded ? 'rotate-180' : ''}`} />
          </button>
          {jdExpanded ? (
            <div className="border-t border-slate-100 px-3.5 py-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{props.jobDescription}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-center gap-10 rounded-xl border border-slate-100 bg-slate-50/50 py-5">
        <ScoreCircle score={props.result.overallScore} label="整体匹配分" />
        <ScoreCircle score={props.result.atsScore} label="ATS 分数" />
      </div>

      <div className="space-y-2">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          <Target className="h-4 w-4 text-slate-400" />
          分析摘要
        </h4>
        <p className="text-sm leading-relaxed text-slate-600">{props.result.summary}</p>
      </div>

      {props.result.keywordMatches.length > 0 ? (
        <div className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            已命中关键词
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {props.result.keywordMatches.map((keyword) => (
              <Badge key={keyword} className="border-emerald-200 bg-emerald-50 text-emerald-700">
                {keyword}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {props.result.missingKeywords.length > 0 ? (
        <div className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            缺失关键词
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {props.result.missingKeywords.map((keyword) => (
              <Badge key={keyword} className="border-orange-200 bg-orange-50 text-orange-700">
                {keyword}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {props.result.suggestions.length > 0 ? (
        <div className="space-y-3">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            优化建议
          </h4>
          <div className="space-y-2.5">
            {props.result.suggestions.map((suggestion, index) => (
              <div key={`${suggestion.section}-${index}`} className="space-y-2 rounded-lg border border-slate-200 bg-white p-3.5">
                <Badge variant="secondary" className="text-xs font-medium">
                  {formatJdSuggestionSection(suggestion.section, resume, suggestion.blockId)}
                </Badge>
                <div className="space-y-1.5">
                  <div>
                    <span className="text-xs font-medium text-slate-400">当前</span>
                    <p className="text-sm text-slate-600">{suggestion.current}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-violet-600">建议</span>
                    <p className="text-sm text-slate-800">{suggestion.suggested}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function JdAnalysisDialog(props: {
  readonly resumeId?: string;
}): ReactElement {
  const open = useEditorUiStore((state) => state.activeModal === 'jd-analysis');
  const closeModal = useEditorUiStore((state) => state.closeModal);
  const handoffToChat = useEditorUiStore((state) => state.handoffToChat);
  const resume = useAppStore((state) => state.resume);
  const { requireAi } = useVipCheck();
  const historyKey = props.resumeId || resume.id || 'local';
  const [jobDescription, setJobDescription] = useState('');
  const { isRunning, result, error, run, reset } = useJdAnalysis();
  const [activeTab, setActiveTab] = useState('new');
  const [history, setHistory] = useState<AnalysisHistoryItem<JdAnalysisOutput>[]>([]);
  const [historyDetail, setHistoryDetail] = useState<AnalysisHistoryItem<JdAnalysisOutput> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadHistory = useCallback(async () => {
    setHistory(await listAnalysisHistory<JdAnalysisOutput>(HISTORY_KIND, historyKey));
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
      reset();
      setJobDescription('');
      setActiveTab('new');
      setHistoryDetail(null);
    }, 200);
  };

  const handleAnalyze = async (): Promise<void> => {
    if (!jobDescription.trim() || !requireAi()) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const data = await run({ resumeData: resume, jobDescription, signal: controller.signal });
    if (abortRef.current === controller) abortRef.current = null;
    if (!data) return;
    const saved = await saveAnalysisHistory(HISTORY_KIND, historyKey, {
      id: createHistoryId(),
      createdAt: Date.now(),
      result: data,
      jobDescription,
      overallScore: data.overallScore,
      atsScore: data.atsScore,
    });
    setHistory(saved);
  };

  const handleOptimize = (): void => {
    if (!result) return;
    const parts: string[] = [];
    if (result.missingKeywords.length > 0) {
      parts.push(`缺失关键词：${result.missingKeywords.join('、')}`);
    }
    if (result.suggestions.length > 0) {
      const list = result.suggestions
        .map((item, index) => `${index + 1}. [${formatJdSuggestionSection(item.section, resume, item.blockId)}] "${item.current}" → "${item.suggested}"`)
        .join('\n');
      parts.push(`优化建议：\n${list}`);
    }
    handoffToChat(`请根据以下 JD 匹配分析结果优化简历，使其更匹配目标职位：\n\n${parts.join('\n\n')}\n\n请使用工具直接修改对应的简历模块内容，尽量自然地融入缺失关键词。`);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => { if (!next) handleClose(); }}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="px-6 pb-0 pt-6">
            <DialogTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-violet-600" />
              JD 匹配分析
            </DialogTitle>
            <DialogDescription>粘贴职位描述，分析简历匹配度并给出可执行建议。</DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col gap-0">
            <div className="px-6 pt-3">
              <TabsList className="w-full">
                <TabsTrigger value="new" className="flex-1" disabled={isRunning}>新分析</TabsTrigger>
                <TabsTrigger value="history" className="flex-1 gap-1.5" disabled={isRunning}>
                  历史
                  {history.length > 0 ? (
                    <Badge className="ml-1 h-5 min-w-5 bg-violet-600 px-1 text-xs text-white">{history.length}</Badge>
                  ) : null}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="new" className="flex min-h-0 flex-col">
              {isRunning ? (
                <AiWaitingState
                  messages={WAITING_MESSAGES}
                  hint="通常需要 10–20 秒，请稍候"
                  onCancel={handleCancel}
                />
              ) : !result ? (
                <div className="space-y-4 px-6 py-4">
                  <textarea
                    value={jobDescription}
                    onChange={(event) => setJobDescription(event.target.value.slice(0, MAX_OPTIMIZE_JD_LENGTH))}
                    rows={6}
                    placeholder="粘贴目标岗位的职位描述…"
                    className="h-[200px] max-h-[200px] w-full resize-none overflow-y-auto rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  />
                  {error ? (
                    <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      {error}
                    </div>
                  ) : null}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleClose}>关闭</Button>
                    <Button
                      className="bg-violet-600 text-white hover:bg-violet-700"
                      disabled={!jobDescription.trim()}
                      onClick={() => void handleAnalyze()}
                    >
                      开始分析
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <JdAnalysisResultView result={result} jobDescription={jobDescription} />
                  </div>
                  <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
                    <Button variant="outline" onClick={handleClose}>关闭</Button>
                    <Button variant="outline" className="gap-1.5" onClick={() => reset()}>
                      <RotateCcw className="h-3.5 w-3.5" />
                      再分析一次
                    </Button>
                    {(result.suggestions.length > 0 || result.missingKeywords.length > 0) ? (
                      <Button className="gap-1.5 bg-violet-600 text-white hover:bg-violet-700" onClick={handleOptimize}>
                        <Wand2 className="h-3.5 w-3.5" />
                        一键优化
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-2 gap-1 text-slate-500"
                      onClick={() => setHistoryDetail(null)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      历史
                    </Button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <JdAnalysisResultView result={historyDetail.result} jobDescription={historyDetail.jobDescription} />
                  </div>
                </>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-12">
                  <FileSearch className="mb-3 h-12 w-12 text-slate-300" />
                  <p className="text-sm text-slate-500">还没有分析记录</p>
                </div>
              ) : (
                <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-6 py-4">
                  {history.map((item, index) => {
                    const previous = index < history.length - 1 ? history[index + 1].overallScore : undefined;
                    return (
                      <div
                        key={item.id}
                        className="group flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 bg-white p-3 hover:border-slate-200"
                        onClick={() => setHistoryDetail(item)}
                      >
                        <div className="flex items-center gap-1">
                          <ScoreCircle score={item.overallScore ?? item.result.overallScore} size="sm" />
                          <ScoreTrend current={item.overallScore ?? item.result.overallScore} previous={previous} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">{formatDate(item.createdAt)}</span>
                            <Badge variant="secondary" className="text-xs">
                              ATS {item.atsScore ?? item.result.atsScore}
                            </Badge>
                          </div>
                          <p className="mt-0.5 truncate text-sm text-slate-600">{item.jobDescription}</p>
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
        title="删除这条分析？"
        description="删除后无法恢复。"
        confirmText="删除"
        variant="destructive"
        onConfirm={() => {
          if (!deleteId) return;
          void deleteAnalysisHistory<JdAnalysisOutput>(HISTORY_KIND, historyKey, deleteId).then(setHistory);
          if (historyDetail?.id === deleteId) setHistoryDetail(null);
          setDeleteId(null);
        }}
      />
    </>
  );
}
