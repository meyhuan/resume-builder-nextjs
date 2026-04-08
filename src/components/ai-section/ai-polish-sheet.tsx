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
import { useVipCheck } from '@/hooks/use-vip-check';
import VipUpgradeDialog from '@/components/vip/vip-upgrade-dialog';
import type { SectionIdentity, SectionModuleType, PolishLevel } from '@/lib/ai/section-types';
import {
  SECTION_IDENTITY_OPTIONS,
  POLISH_LEVEL_OPTIONS,
  MAX_JD_LENGTH,
  MIN_POLISH_CONTENT_LENGTH,
} from '@/lib/ai/section-types';
import { useAiSectionStore } from '@/state/ai-section-store';
import InlineEditor from '@/editor/inline-editor';
import { toast } from 'sonner';

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
  const { showUpgrade, setShowUpgrade, quota, refreshQuota } = useVipCheck();
  const polishQuota = quota.aiPolishSection;
  const isLimitReached = polishQuota.remaining === 0;

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
    await refreshQuota();
    if (result) {
      setEditedResult(result);
      setHasResult(true);
    }
  }, [originalContent, identity, moduleType, polishLevel, realisticMode, jobDescription, polish, store, refreshQuota]);

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
            AI 内容润色
          </SheetTitle>
          <SheetDescription>
            基于您的原始内容进行合规优化，不新增任何无依据内容
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
            <label className="text-sm font-medium text-slate-700 mb-2 block">原始内容</label>
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 max-h-32 overflow-y-auto text-xs text-slate-600 leading-relaxed">
              <div dangerouslySetInnerHTML={{ __html: originalContent }} />
            </div>
          </section>

          {/* JD input */}
          <section>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              目标岗位 JD
              <span className="text-slate-400 font-normal ml-1">（选填）</span>
            </label>
            <textarea
              value={jobDescription}
              onChange={(e): void => setJobDescription(e.target.value.slice(0, MAX_JD_LENGTH))}
              placeholder="粘贴目标岗位JD，AI将优先匹配岗位需求"
              className="w-full h-20 text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400/30 resize-none"
            />
            <div className="text-right text-[10px] text-slate-400 mt-1">
              {jobDescription.length}/{MAX_JD_LENGTH}
            </div>
          </section>

          {/* Polish level selector */}
          <section className="space-y-3">
            <label className="text-sm font-medium text-slate-700">润色档位</label>
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
                            <span className="text-slate-400 shrink-0 font-medium mt-0.5">原句:</span>
                            <span className="line-through decoration-slate-500">{opt.exampleBefore}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-violet-300 shrink-0 font-medium mt-0.5">改后:</span>
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
                  无成果纯写实模式
                  <div className="group relative flex items-center">
                    <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-violet-500 transition-colors" />
                    
                    {/* Hover Tooltip (Pure CSS) */}
                    <div className="absolute left-0 bottom-full mb-2 hidden w-[240px] flex-col gap-1.5 rounded-lg bg-slate-800 p-3 text-[11px] text-slate-100 opacity-0 shadow-xl transition-all group-hover:flex group-hover:opacity-100 z-50 pointer-events-none">
                      <div className="text-slate-300 mb-1">开启后，AI 将完全禁止凭空捏造数据和夸大业务成果。</div>
                      <div className="flex gap-2">
                        <span className="text-slate-400 shrink-0 font-medium mt-0.5">原句:</span>
                        <span className="line-through decoration-slate-500">负责新媒体运营，数据很好</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-violet-300 shrink-0 font-medium mt-0.5">普通:</span>
                        <span className="text-slate-300">负责新媒体运营，粉丝量增长200%</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-emerald-300 shrink-0 font-medium mt-0.5">写实:</span>
                        <span className="font-medium text-white">独立负责新媒体矩阵的日常运营与内容分发，提升内容曝光量。</span>
                      </div>
                      {/* Triangle arrow */}
                      <div className="absolute -bottom-1 left-1.5 border-4 border-transparent border-t-slate-800" />
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  开启后仅基于事实优化，完全禁止虚构数据和成果夸大
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
                {hasResult ? '重新润色' : '开始润色'}
              </Button>
              <div className="flex items-center justify-center gap-1 text-[10px]">
                {isLimitReached ? (
                  <>
                    <span className="text-red-500">今日次数已用完，</span>
                    <button
                      type="button"
                      onClick={() => setShowUpgrade(true)}
                      className="text-violet-600 hover:text-violet-700 font-medium underline underline-offset-2"
                    >
                      升级会员可无限使用 →
                    </button>
                  </>
                ) : (
                  <span className="text-slate-400">
                    今日剩余 {polishQuota.remaining}/{polishQuota.limit} 次
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Loading state */}
          {isPolishing && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-violet-500 mr-2" />
              <span className="text-sm text-slate-500">AI 正在为您优化内容，请稍候...</span>
            </div>
          )}

          {/* Error state - Auto show VIP dialog on quota exceeded */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-red-700 font-medium">{error}</div>
                {error.includes('VIP') || error.includes('次数已达上限') ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      toast.error('今日免费额度已用完，升级VIP可无限使用');
                      setShowUpgrade(true);
                    }}
                    className="h-7 text-xs bg-gradient-to-r from-amber-400 to-orange-400 text-white hover:from-amber-500 hover:to-orange-500 mt-1 px-3"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    升级VIP无限使用
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRegenerate}
                    className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-100 mt-1 px-2"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    重新生成
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Result display */}
          {displayHtml && (
            <section className="pb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">润色结果</label>
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
            disabled={!displayHtml.trim() || isPolishing}
            className="h-8 text-xs rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white hover:from-violet-700 hover:to-fuchsia-600 disabled:opacity-40"
          >
            插入到简历
          </Button>
        </SheetFooter>
      </SheetContent>

      {/* VIP Upgrade Dialog for quota exceeded */}
      <VipUpgradeDialog
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
      />
    </Sheet>
  );
}
