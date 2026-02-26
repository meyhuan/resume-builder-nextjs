'use client';

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import type { ReactElement } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Wand2, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useGenerateSection } from '@/lib/ai/use-generate-section';
import { useAiUsage } from '@/hooks/use-ai-usage';
import { getGuidedQuestions } from '@/lib/ai/guided-questions';
import type { SectionIdentity, SectionModuleType, JobCategory } from '@/lib/ai/section-types';
import {
  SECTION_IDENTITY_OPTIONS,
  JOB_CATEGORY_OPTIONS,
  MAX_JD_LENGTH,
} from '@/lib/ai/section-types';
import { useAiSectionStore } from '@/state/ai-section-store';
import InlineEditor from '@/editor/inline-editor';

export interface AiGenerateSheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly moduleType: SectionModuleType;
  readonly defaultIdentity?: SectionIdentity;
  /** Pre-filled values extracted from the block's structured fields (company, role, dates etc). */
  readonly blockPrefill?: Record<string, string>;
  readonly onInsert: (html: string) => void;
}

/**
 * AI Generate Sidebar Sheet — right-side sliding panel for guided content generation.
 * Collects user facts via guided questions, then generates compliant content.
 */
export default function AiGenerateSheet(props: AiGenerateSheetProps): ReactElement {
  const { open, onOpenChange, moduleType, blockPrefill, onInsert } = props;

  const store = useAiSectionStore();
  const [identity, setIdentityLocal] = useState<SectionIdentity>(store.identity);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [jobCategory, setJobCategoryLocal] = useState<JobCategory | undefined>(store.jobCategory);
  const [jobDescription, setJobDescription] = useState<string>(store.cachedJobDescription);
  const [editedResult, setEditedResult] = useState<string>('');
  const [hasResult, setHasResult] = useState<boolean>(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [prevOpen, setPrevOpen] = useState<boolean>(false);

  const { isGenerating, streamedHtml, error, generate, reset } = useGenerateSection();
  const { usage, isLimitReached, refresh: refreshUsage } = useAiUsage();

  const questionSet = useMemo(
    () => getGuidedQuestions(moduleType, identity),
    [moduleType, identity],
  );

  // Compute prefilled answers from block context
  const prefillAnswers: Record<string, string> = useMemo(() => {
    if (!blockPrefill) return {};
    const result: Record<string, string> = {};
    const questions = getGuidedQuestions(moduleType, identity).questions;
    for (const q of questions) {
      if (q.autoFillKey && blockPrefill[q.autoFillKey]) {
        result[q.label] = blockPrefill[q.autoFillKey];
      }
    }
    return result;
  }, [blockPrefill, moduleType, identity]);

  // Apply prefill when the sheet first opens (React-approved pattern)
  if (open && !prevOpen) {
    setPrevOpen(true);
    if (Object.keys(prefillAnswers).length > 0) {
      setAnswers(prefillAnswers);
    }
  }
  if (!open && prevOpen) {
    setPrevOpen(false);
  }

  const requiredComplete: boolean = useMemo(() => {
    return questionSet.questions
      .filter((q) => q.required)
      .every((q) => (answers[q.label] ?? '').trim().length > 0);
  }, [questionSet, answers]);

  const canGenerate: boolean = requiredComplete && !isGenerating && !isLimitReached;

  const handleAnswerChange = useCallback((label: string, value: string): void => {
    setAnswers((prev) => ({ ...prev, [label]: value }));
  }, []);

  const handleGenerate = useCallback(async (): Promise<void> => {
    setHasResult(false);
    setEditedResult('');
    store.setCachedJobDescription(jobDescription);
    
    // Auto-scroll to bottom to show the generating result
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);

    const result = await generate({
      identity,
      moduleType,
      answers,
      jobDescription: jobDescription.trim() || undefined,
      jobCategory: moduleType === 'self-evaluation' ? jobCategory : undefined,
      realisticMode: store.realisticMode,
    });
    await refreshUsage();
    if (result) {
      setEditedResult(result);
      setHasResult(true);
    }
  }, [identity, moduleType, answers, jobDescription, jobCategory, generate, store]);

  useEffect(() => {
    if (isGenerating) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [streamedHtml, isGenerating]);

  const handleInsert = useCallback((): void => {
    const contentToInsert: string = hasResult ? editedResult : streamedHtml;
    if (contentToInsert.trim()) {
      onInsert(contentToInsert);
      onOpenChange(false);
      reset();
      setHasResult(false);
      setEditedResult('');
      setAnswers({});
    }
  }, [hasResult, editedResult, streamedHtml, onInsert, onOpenChange, reset]);

  const handleRegenerate = useCallback((): void => {
    setHasResult(false);
    setEditedResult('');
    reset();
    handleGenerate();
  }, [reset, handleGenerate]);

  const handleClose = useCallback((): void => {
    onOpenChange(false);
    reset();
    setHasResult(false);
    setEditedResult('');
    setAnswers({});
  }, [onOpenChange, reset]);

  const handleIdentityChange = useCallback((newIdentity: SectionIdentity): void => {
    setIdentityLocal(newIdentity);
    store.setIdentity(newIdentity);
    setAnswers({});
    setHasResult(false);
    setEditedResult('');
    reset();
  }, [reset, store]);

  const displayHtml: string = hasResult ? editedResult : streamedHtml;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-violet-500" />
            AI 帮你写模块内容
          </SheetTitle>
          <SheetDescription>
            请如实填写以下信息，AI 将基于您的真实经历生成合规内容
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 space-y-5 custom-scrollbar">
          {/* Identity selector */}
          <section>
            <label className="text-sm font-medium text-slate-700 mb-2 block">求职身份</label>
            <div className="flex gap-2">
              {SECTION_IDENTITY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={(): void => handleIdentityChange(opt.id)}
                  className={`flex-1 text-xs py-2 px-3 rounded-lg border transition-all ${
                    identity === opt.id
                      ? 'border-violet-500 bg-violet-50 text-violet-700 font-medium'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Job category selector (self-evaluation only) */}
          {moduleType === 'self-evaluation' && (
            <section>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                目标岗位类型
                <span className="text-slate-400 font-normal ml-1">（影响自我评价风格和关键词）</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {JOB_CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={(): void => {
                      const next: JobCategory | undefined = jobCategory === opt.id ? undefined : opt.id;
                      setJobCategoryLocal(next);
                      store.setJobCategory(next);
                    }}
                    className={`text-left text-xs py-2.5 px-3 rounded-lg border transition-all ${
                      jobCategory === opt.id
                        ? 'border-violet-500 bg-violet-50 text-violet-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`font-medium ${jobCategory === opt.id ? 'text-violet-700' : 'text-slate-700'}`}>{opt.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{opt.description}</div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Guided questions */}
          <section className="space-y-4">
            <label className="text-sm font-medium text-slate-700 block">
              请如实填写以下信息
              <span className="text-red-500 text-xs ml-1">* 为必填项</span>
            </label>
            {questionSet.questions.map((q) => (
              <div key={q.key}>
                <label className="text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1.5">
                  {q.required && <span className="text-red-500 mr-0.5">*</span>}
                  {q.label}
                  {q.autoFillKey && blockPrefill?.[q.autoFillKey] && (
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-normal">已自动填充</span>
                  )}
                </label>
                {q.multiline ? (
                  <textarea
                    value={answers[q.label] ?? ''}
                    onChange={(e): void => handleAnswerChange(q.label, e.target.value)}
                    placeholder={q.placeholder}
                    className="w-full h-20 text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400/30 resize-none leading-relaxed"
                  />
                ) : (
                  <input
                    type="text"
                    value={answers[q.label] ?? ''}
                    onChange={(e): void => handleAnswerChange(q.label, e.target.value)}
                    placeholder={q.placeholder}
                    className="w-full h-9 text-xs rounded-lg border border-slate-200 bg-white px-3 text-slate-700 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400/30"
                  />
                )}
              </div>
            ))}
          </section>

          {/* JD input */}
          <section>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              目标岗位 JD
              <span className="text-slate-400 font-normal ml-1">（选填，提升岗位匹配度）</span>
            </label>
            <textarea
              value={jobDescription}
              onChange={(e): void => setJobDescription(e.target.value.slice(0, MAX_JD_LENGTH))}
              placeholder="粘贴目标岗位JD"
              className="w-full h-20 text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400/30 resize-none"
            />
            <div className="text-right text-[10px] text-slate-400 mt-1">
              {jobDescription.length}/{MAX_JD_LENGTH}
            </div>
          </section>

          {/* Generate button */}
          {!isGenerating && (
            <div className="space-y-2">
              <Button
                onClick={hasResult ? handleRegenerate : handleGenerate}
                disabled={!canGenerate && !hasResult}
                className="w-full h-10 shrink-0 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white hover:from-violet-700 hover:to-fuchsia-600 rounded-lg font-medium text-sm shadow-sm disabled:opacity-40"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                {hasResult ? '重新生成' : '生成内容'}
                {!requiredComplete && !hasResult && (
                  <span className="ml-2 text-[10px] opacity-70">（请完成必填项）</span>
                )}
              </Button>
              {usage && (
                <p className={`text-center text-[10px] ${isLimitReached ? 'text-red-500' : 'text-slate-400'}`}>
                  {isLimitReached
                    ? `今日次数已用完（${usage.used}/${usage.limit}），${usage.isAuthenticated ? '请明天再试' : '登录后可获得更多次数'}`
                    : `今日剩余 ${usage.remaining}/${usage.limit} 次`}
                </p>
              )}
            </div>
          )}

          {/* Loading state */}
          {isGenerating && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-violet-500 mr-2" />
              <span className="text-sm text-slate-500">AI 正在为您生成内容，请稍候...</span>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-red-700 font-medium">{error}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRegenerate}
                  className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-100 mt-1 px-2"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  重新生成
                </Button>
              </div>
            </div>
          )}

          {/* Result display */}
          {displayHtml && (
            <section className="pb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">生成结果</label>
                {hasResult && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRegenerate}
                    className="h-7 text-xs text-slate-500 hover:text-violet-600 px-2"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    重新生成
                  </Button>
                )}
              </div>
              {hasResult ? (
                <div className="w-full min-h-[160px] text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 focus-within:border-violet-400 focus-within:ring-1 focus-within:ring-violet-400/30 leading-relaxed overflow-y-auto custom-scrollbar">
                  <InlineEditor
                    initialHtml={editedResult}
                    onChange={(html: string): void => setEditedResult(html)}
                    floatingToolbar={false}
                    className="outline-none"
                  />
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-violet-200 p-3 text-xs text-slate-700 leading-relaxed min-h-[100px]">
                  <div dangerouslySetInnerHTML={{ __html: displayHtml }} />
                  {isGenerating && (
                    <span className="inline-block w-1.5 h-4 bg-violet-500 animate-pulse ml-0.5 align-middle" />
                  )}
                </div>
              )}
            </section>
          )}
          <div ref={bottomRef} className="h-4" />
        </div>

        {/* Footer */}
        <SheetFooter>
          <p className="text-[10px] text-slate-400 flex-1">
            内容由 AI 生成，请基于真实经历核对修改
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            className="h-8 text-xs rounded-lg"
          >
            取消
          </Button>
          <Button
            size="sm"
            onClick={handleInsert}
            disabled={!displayHtml.trim() || isGenerating}
            className="h-8 text-xs rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white hover:from-violet-700 hover:to-fuchsia-600 disabled:opacity-40"
          >
            插入到简历
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
