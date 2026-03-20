'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
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
import { Sparkles, Loader2, AlertTriangle, RefreshCw, HelpCircle } from 'lucide-react';
import { usePolishSection } from '@/lib/ai/use-polish-section';
import { useAiUsage } from '@/hooks/use-ai-usage';
import type { SectionIdentity, SectionModuleType, PolishLevel } from '@/lib/ai/section-types';
import {
  SECTION_IDENTITY_OPTIONS,
  POLISH_LEVEL_OPTIONS,
  MAX_JD_LENGTH,
  MIN_POLISH_CONTENT_LENGTH,
} from '@/lib/ai/section-types';
import { useAiSectionStore } from '@/state/ai-section-store';
import InlineEditor from '@/editor/inline-editor';

export interface AiPolishSheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly originalContent: string;
  readonly moduleType: SectionModuleType;
  readonly defaultIdentity?: SectionIdentity;
  readonly onInsert: (html: string) => void;
}

/**
 * AI Polish Sidebar Sheet — right-side sliding panel for content polishing.
 * Follows the PRD spec: identity selector, polish level, JD input, realistic mode, result editing.
 */
export default function AiPolishSheet(props: AiPolishSheetProps): ReactElement {
  const { open, onOpenChange, originalContent, moduleType, onInsert } = props;

  const store = useAiSectionStore();
  const [identity, setIdentityLocal] = useState<SectionIdentity>(store.identity);
  const [polishLevel, setPolishLevelLocal] = useState<PolishLevel>(store.polishLevel);
  const [realisticMode, setRealisticModeLocal] = useState<boolean>(store.realisticMode);
  const [jobDescription, setJobDescription] = useState<string>(store.cachedJobDescription);
  const [editedResult, setEditedResult] = useState<string>('');
  const [hasResult, setHasResult] = useState<boolean>(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const setIdentity = useCallback((id: SectionIdentity): void => {
    setIdentityLocal(id);
    store.setIdentity(id);
  }, [store]);

  const setPolishLevel = useCallback((level: PolishLevel): void => {
    setPolishLevelLocal(level);
    store.setPolishLevel(level);
  }, [store]);

  const setRealisticMode = useCallback((enabled: boolean): void => {
    setRealisticModeLocal(enabled);
    store.setRealisticMode(enabled);
  }, [store]);

  const { isPolishing, streamedHtml, error, polish, reset } = usePolishSection();
  const { usage, isLimitReached, refresh: refreshUsage } = useAiUsage();

  const canPolish: boolean =
    originalContent.trim().length >= MIN_POLISH_CONTENT_LENGTH && !isPolishing && !isLimitReached;

  const handlePolish = useCallback(async (): Promise<void> => {
    setHasResult(false);
    setEditedResult('');
    store.setCachedJobDescription(jobDescription);
    
    // Auto-scroll to bottom to show the generating result
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);

    const result = await polish({
      content: originalContent,
      identity,
      moduleType,
      polishLevel: realisticMode ? 'professional' : polishLevel,
      jobDescription: jobDescription.trim() || undefined,
      realisticMode,
    });
    await refreshUsage();
    if (result) {
      setEditedResult(result);
      setHasResult(true);
    }
  }, [originalContent, identity, moduleType, polishLevel, realisticMode, jobDescription, polish, store, refreshUsage]);

  useEffect(() => {
    if (isPolishing) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [streamedHtml, isPolishing]);

  const handleInsert = useCallback((): void => {
    const contentToInsert: string = hasResult ? editedResult : streamedHtml;
    if (contentToInsert.trim()) {
      onInsert(contentToInsert);
      onOpenChange(false);
      reset();
      setHasResult(false);
      setEditedResult('');
    }
  }, [hasResult, editedResult, streamedHtml, onInsert, onOpenChange, reset]);

  const handleRegenerate = useCallback((): void => {
    setHasResult(false);
    setEditedResult('');
    reset();
    handlePolish();
  }, [reset, handlePolish]);

  const handleClose = useCallback((): void => {
    onOpenChange(false);
    reset();
    setHasResult(false);
    setEditedResult('');
  }, [onOpenChange, reset]);

  const displayHtml: string = hasResult ? editedResult : streamedHtml;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" />
            AI Content Polish
          </SheetTitle>
          <SheetDescription>
            Optimize your original content compliantly without adding unsubstantiated claims
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 space-y-5 custom-scrollbar">
          {/* Identity selector */}
          <section>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Job Seeker Identity</label>
            <div className="flex gap-2">
              {SECTION_IDENTITY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={(): void => setIdentity(opt.id)}
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

          {/* Original content preview */}
          <section>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Original Content</label>
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 max-h-32 overflow-y-auto text-xs text-slate-600 leading-relaxed">
              <div dangerouslySetInnerHTML={{ __html: originalContent }} />
            </div>
          </section>

          {/* JD input */}
          <section>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Target Job Description
              <span className="text-slate-400 font-normal ml-1">(Optional)</span>
            </label>
            <textarea
              value={jobDescription}
              onChange={(e): void => setJobDescription(e.target.value.slice(0, MAX_JD_LENGTH))}
              placeholder="Paste target job description for better alignment"
              className="w-full h-20 text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400/30 resize-none"
            />
            <div className="text-right text-[10px] text-slate-400 mt-1">
              {jobDescription.length}/{MAX_JD_LENGTH}
            </div>
          </section>

          {/* Polish level selector */}
          <section className="space-y-3">
            <label className="text-sm font-medium text-slate-700">Polish Level</label>
            <div className="grid grid-cols-1 gap-2">
              {POLISH_LEVEL_OPTIONS.map((opt) => (
                <div
                  key={opt.id}
                  onClick={(): void => {
                    if (!realisticMode) setPolishLevel(opt.id);
                  }}
                  className={`relative p-3 rounded-lg border text-left cursor-pointer transition-all ${
                    polishLevel === opt.id
                      ? 'border-violet-500 bg-violet-50/50'
                      : 'border-slate-200 bg-white hover:border-violet-200 hover:bg-slate-50'
                  } ${realisticMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-sm font-medium flex items-center gap-1.5 ${
                        polishLevel === opt.id ? 'text-violet-700' : 'text-slate-700'
                      }`}
                    >
                      {opt.label}
                      <div className="group relative flex items-center">
                        <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-violet-500 transition-colors" />
                        
                        {/* Hover Tooltip (Pure CSS) */}
                        <div className="absolute left-0 bottom-full mb-2 hidden w-[260px] flex-col gap-1.5 rounded-lg bg-slate-800 p-3 text-[11px] text-slate-100 opacity-0 shadow-xl transition-all group-hover:flex group-hover:opacity-100 z-50 pointer-events-none">
                          <div className="flex gap-2">
                            <span className="text-slate-400 shrink-0 font-medium mt-0.5">Before:</span>
                            <span className="line-through decoration-slate-500">{opt.exampleBefore}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-violet-300 shrink-0 font-medium mt-0.5">After:</span>
                            <span className="font-medium text-white">{opt.exampleAfter}</span>
                          </div>
                          {/* Triangle arrow */}
                          <div className="absolute -bottom-1 left-1.5 border-4 border-transparent border-t-slate-800" />
                        </div>
                      </div>
                    </span>
                    <div
                      className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                        polishLevel === opt.id
                          ? 'border-violet-500 bg-violet-500'
                          : 'border-slate-300'
                      }`}
                    >
                      {polishLevel === opt.id && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">{opt.description}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Realistic mode toggle */}
          <section>
            <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-all">
              <input
                type="checkbox"
                checked={realisticMode}
                onChange={(e): void => {
                  setRealisticMode(e.target.checked);
                  if (e.target.checked) {
                    setPolishLevel('professional');
                  }
                }}
                className="accent-violet-500 mt-0.5"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                  Fact-Only Realistic Mode
                  <div className="group relative flex items-center">
                    <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-violet-500 transition-colors" />
                    
                    {/* Hover Tooltip (Pure CSS) */}
                    <div className="absolute left-0 bottom-full mb-2 hidden w-[240px] flex-col gap-1.5 rounded-lg bg-slate-800 p-3 text-[11px] text-slate-100 opacity-0 shadow-xl transition-all group-hover:flex group-hover:opacity-100 z-50 pointer-events-none">
                      <div className="text-slate-300 mb-1">When enabled, AI will strictly avoid fabricating data or exaggerating results.</div>
                      <div className="flex gap-2">
                        <span className="text-slate-400 shrink-0 font-medium mt-0.5">Before:</span>
                        <span className="line-through decoration-slate-500">Managed social media, great results</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-violet-300 shrink-0 font-medium mt-0.5">Normal:</span>
                        <span className="text-slate-300">Managed social media, grew followers by 200%</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-emerald-300 shrink-0 font-medium mt-0.5">Realistic:</span>
                        <span className="font-medium text-white">Independently managed social media operations and content distribution, improving content reach.</span>
                      </div>
                      {/* Triangle arrow */}
                      <div className="absolute -bottom-1 left-1.5 border-4 border-transparent border-t-slate-800" />
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  When enabled, only fact-based optimization — no fabricated data or exaggerated results
                </div>
              </div>
            </label>
          </section>

          {/* Start polish button */}
          {!isPolishing && (
            <div className="space-y-2">
              <Button
                onClick={hasResult ? handleRegenerate : handlePolish}
                disabled={!canPolish && !hasResult}
                className="w-full h-10 shrink-0 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white hover:from-violet-700 hover:to-fuchsia-600 rounded-lg font-medium text-sm shadow-sm disabled:opacity-40"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {hasResult ? 'Re-polish' : 'Start Polish'}
              </Button>
              {usage && (
                <p className={`text-center text-[10px] ${isLimitReached ? 'text-red-500' : 'text-slate-400'}`}>
                  {isLimitReached
                    ? `Daily limit reached (${usage.used}/${usage.limit}). ${usage.isAuthenticated ? 'Please try again tomorrow.' : 'Sign in for more.'}`
                    : `${usage.remaining}/${usage.limit} remaining today`}
                </p>
              )}
            </div>
          )}

          {/* Loading state */}
          {isPolishing && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-violet-500 mr-2" />
              <span className="text-sm text-slate-500">AI is optimizing your content, please wait...</span>
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
                  Regenerate
                </Button>
              </div>
            </div>
          )}

          {/* Result display */}
          {displayHtml && (
            <section className="pb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Polished Result</label>
                {hasResult && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRegenerate}
                    className="h-7 text-xs text-slate-500 hover:text-violet-600 px-2"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Regenerate
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
                  {isPolishing && (
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
            AI-generated content — please verify against your real experience
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            className="h-8 text-xs rounded-lg"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleInsert}
            disabled={!displayHtml.trim() || isPolishing}
            className="h-8 text-xs rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white hover:from-violet-700 hover:to-fuchsia-600 disabled:opacity-40"
          >
            Insert to Resume
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
