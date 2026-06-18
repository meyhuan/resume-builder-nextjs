'use client';

import { useRouter, usePathname } from 'next/navigation';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDraftStore } from '@/features/edit/draft/draft-store';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useWizardStore, getWizardInput } from '@/state/wizard-store';
import { useAiGeneration } from '@/lib/ai/use-ai-generation';
import { getAvailableModels } from '@/lib/ai/ai-config';
import { mapExternalResume } from '@/io/external-resume-importer';
import type { ResumeData } from '@/entities/resume/resume-data';
import { parseStreamSections } from '@/lib/ai/json-to-markdown';
import type { DisplaySection } from '@/lib/ai/json-to-markdown';
import { Sparkles, Loader2, AlertCircle, ChevronLeft, CircleStop, FileText, Check, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useVipCheck } from '@/hooks/use-vip-check';
import { WxLoginDialog } from '@/components/auth/WxLoginDialog';
import VipUpgradeDialog from '@/components/vip/vip-upgrade-dialog';
import { toast } from 'sonner';
import { track } from '@/lib/analytics';

// Mini-program detection helpers
interface WxMiniProgram {
  postMessage?: (p: { data: unknown }) => void
  navigateTo?: (o: { url: string }) => void
  redirectTo?: (o: { url: string }) => void
  navigateBack?: (o?: { delta?: number }) => void
}

function getMiniProgram(): WxMiniProgram | null {
  if (typeof window === 'undefined') return null
  const wx = (window as unknown as { wx?: { miniProgram?: WxMiniProgram } }).wx
  return wx?.miniProgram ?? null
}

function useInMiniProgram(): boolean {
  const [inMiniProgram, setInMiniProgram] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const params = new URLSearchParams(window.location.search)
    return params.get('source') === 'mini' || params.get('mini') === '1'
  })

  useEffect((): (() => void) | void => {
    if (typeof window === 'undefined') return

    const check = (): void => {
      const isEnv = (window as unknown as { __wxjs_environment?: string }).__wxjs_environment === 'miniprogram'
      const hasMiniProgram = Boolean(getMiniProgram())
      const next = isEnv || hasMiniProgram
      console.log('[useInMiniProgram] environment check:', next, 'wx.miniProgram:', hasMiniProgram)
      setInMiniProgram(next)
    }

    check()
    window.addEventListener('WeixinJSBridgeReady', check)
    const timer = window.setTimeout(check, 300)

    return (): void => {
      window.removeEventListener('WeixinJSBridgeReady', check)
      window.clearTimeout(timer)
    }
  }, [])

  return inMiniProgram
}

function openMiniProgramEditor(resumeId: string): boolean {
  const mini = getMiniProgram()
  const page = `/pages/editShell/editShell?path=${encodeURIComponent(`/m/edit?id=${resumeId}`)}`
  if (mini?.redirectTo) {
    mini.redirectTo({ url: page })
    return true
  }
  if (mini?.navigateTo) {
    mini.navigateTo({ url: page })
    return true
  }
  if (mini?.postMessage) {
    mini.postMessage({ data: { action: 'resumeGenerated', resumeId } })
    return true
  }
  return false
}

const AI_MODELS = getAvailableModels();
const WIZARD_CACHE_KEY = 'wizard_pending_resume';

export const WizardLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname: string | null = usePathname();
  // When the wizard is mounted under the mobile route prefix, save/nav paths
  // must point at the mobile editor instead of the PC editor.
  const isMobile: boolean = typeof pathname === 'string' && pathname.startsWith('/m');
  const setDraftFromServer = useDraftStore((s) => s.setFromServer);
  const wizardState = useWizardStore();
  const { isGenerating, streamedText, error, generate, abort, reset } = useAiGeneration();
  const selectedModel: string = AI_MODELS[0].name;
  const [showGenPage, setShowGenPage] = useState<boolean>(false);
  const { isLoginOpen, handleLoginSuccess, handleLoginClose, isLoggedIn } = useRequireAuth();
  const { showUpgrade, setShowUpgrade, quota, refreshQuota } = useVipCheck();
  const resumeQuota = quota.aiGenerateResume;
  const isLimitReached = resumeQuota.remaining === 0;
  const inMiniProgram = useInMiniProgram();

  useEffect((): void => {
    document.title = 'AI 生成简历';
    const mini = getMiniProgram();
    if (inMiniProgram && mini?.postMessage) {
      mini.postMessage({ data: { action: 'setTitle', title: 'AI 生成简历' } });
    }
  }, [inMiniProgram]);

  const saveResume = useCallback(async (resumeData: ResumeData): Promise<void> => {
    try {
      track('resume_create_start', {
        createMethod: 'ai',
        templateId: 'simple',
        entry: inMiniProgram ? 'mini_ai_wizard' : isMobile ? 'mobile_ai_wizard' : 'pc_ai_wizard',
      });
      const res: Response = await fetch('/next-api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: resumeData.name || 'AI 生成简历',
          content: resumeData,
          template: 'simple',
        }),
      });
      if (!res.ok) throw new Error('保存简历失败');
      const saved: { id: string } = await res.json();
      localStorage.removeItem(WIZARD_CACHE_KEY);
      track('resume_create_success', {
        resumeId: saved.id,
        createMethod: 'ai',
        templateId: 'simple',
      });

      // In mini-program web-view, bindmessage is not reliable as an immediate
      // navigation trigger, so jump to the native edit shell directly.
      if (inMiniProgram) {
        console.log('[WizardLayout] opening mini-program editor:', saved.id);
        const opened = openMiniProgramEditor(saved.id);
        if (opened) {
          return;
        }
        console.warn('[WizardLayout] mini-program bridge unavailable, falling back to H5 mobile editor');
      }

      if (isMobile) {
        // Prime the mobile draft store so /m/edit does not re-fetch.
        setDraftFromServer(saved.id, resumeData, 'simple');
        router.push(`/m/edit?id=${saved.id}`);
      } else {
        router.push(`/editor/${saved.id}`);
      }
    } catch (err) {
      console.error('[AI] Failed to save resume:', err);
      track('resume_create_failed', {
        createMethod: 'ai',
        templateId: 'simple',
        entry: inMiniProgram ? 'mini_ai_wizard' : isMobile ? 'mobile_ai_wizard' : 'pc_ai_wizard',
        failureReason: err instanceof Error ? err.message : String(err),
      });
    }
  }, [router, isMobile, setDraftFromServer, inMiniProgram]);

  // Auto-save cached result when user returns logged in
  useEffect(() => {
    const cached = localStorage.getItem(WIZARD_CACHE_KEY);
    if (cached && isLoggedIn()) {
      try {
        const resumeData = JSON.parse(cached) as ResumeData;
        saveResume(resumeData);
      } catch {
        localStorage.removeItem(WIZARD_CACHE_KEY);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openEditorWithData = useCallback((resumeData: ResumeData): void => {
    localStorage.setItem(WIZARD_CACHE_KEY, JSON.stringify(resumeData));
    if (isLoggedIn()) {
      saveResume(resumeData);
    } else {
      router.push(isMobile ? '/m' : '/editor/new?source=ai');
    }
  }, [isLoggedIn, saveResume, router, isMobile]);

  const handleGenerate = async (): Promise<void> => {
    if (isLimitReached) {
      toast.error('今日免费额度已用完，升级VIP可无限使用');
      setShowUpgrade(true);
      return;
    }
    const input = getWizardInput(wizardState);
    if (!input) return;
    track('ai_generate_start', {
      aiFeature: 'generate_resume',
      model: selectedModel,
      identity: wizardState.identity,
      targetRole: wizardState.targetRole,
    });
    setShowGenPage(true);
    const result = await generate(input, selectedModel);
    await refreshQuota();
    if (result) {
      track('ai_generate_success', {
        aiFeature: 'generate_resume',
        model: selectedModel,
        identity: wizardState.identity,
        targetRole: wizardState.targetRole,
      });
      const resumeData = mapExternalResume(result);
      openEditorWithData(resumeData);
    } else {
      track('ai_generate_failed', {
        aiFeature: 'generate_resume',
        model: selectedModel,
        failureReason: error || 'generation_empty',
      });
    }
  };

  const handleStop = useCallback((): void => {
    abort();
  }, [abort]);

  const handleBack = useCallback((): void => {
    reset();
    setShowGenPage(false);
  }, [reset]);

  if (showGenPage) {
    return (
      <GenerationPage
        isGenerating={isGenerating}
        streamedText={streamedText}
        error={error}
        onStop={handleStop}
        onBack={handleBack}
        onRetry={handleGenerate}
        setShowUpgrade={setShowUpgrade}
        inMiniProgram={inMiniProgram}
      />
    );
  }

  const canGenerate = wizardState.currentStep >= 3 && wizardState.identity && wizardState.targetRole;

  return (
    <div className="min-h-screen bg-[#F7F6FB] flex flex-col">
      {!inMiniProgram && <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-gray-100/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-13 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (inMiniProgram) {
                // In mini-program webview, navigate back to mini-program
                const mini = getMiniProgram();
                if (mini?.navigateBack) {
                  mini.navigateBack();
                }
                return;
              }
              router.push(isMobile ? '/m' : (isLoggedIn() ? '/dashboard' : '/'));
            }}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-violet-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">返回</span>
          </button>
          <span className="text-sm font-semibold text-gray-800">AI 生成简历</span>
          {/* Hide skip link in mini-program */}
          {!inMiniProgram && (
            <Link
              href={isMobile ? '/m' : '/editor/new'}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
            >
              <span className="hidden sm:inline">跳过，直接创建</span>
              <span className="sm:hidden">跳过</span>
              <FileText className="w-3 h-3" />
            </Link>
          )}
          {inMiniProgram && <span />} {/* Spacer to maintain layout */}
        </div>
      </header>}

      <WxLoginDialog isOpen={isLoginOpen} onClose={handleLoginClose} onSuccess={handleLoginSuccess} />
      <VipUpgradeDialog open={showUpgrade} onOpenChange={setShowUpgrade} />

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-5 sm:px-6 sm:py-10 lg:py-12">
        <div className="flex flex-col lg:flex-row lg:gap-12 gap-6 sm:gap-8">

          {/* LEFT: step cards (main action area) */}
          <div className="flex-1 min-w-0 flex flex-col gap-5">
            {children}

            {/* CTA — below step cards, always visible on all breakpoints */}
            {canGenerate && (
              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isLimitReached}
                  className={cn(
                    'w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all',
                    isLimitReached
                      ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                      : 'bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-200 hover:shadow-lg active:scale-[0.99]',
                  )}
                >
                  <Sparkles className="w-4 h-4" />
                  {wizardState.currentStep < wizardState.totalSteps ? '已可生成，立即生成' : 'AI 生成简历'}
                </button>
                <QuotaHint
                  remaining={resumeQuota.remaining}
                  limit={resumeQuota.limit}
                  isLimitReached={isLimitReached}
                  onUpgrade={() => setShowUpgrade(true)}
                />
              </div>
            )}
          </div>

          {/* RIGHT: sticky info + progress panel */}
          <div className="lg:w-[280px] lg:shrink-0 hidden lg:block">
            <div className="sticky top-20 flex flex-col gap-6 bg-gradient-to-b from-violet-50/80 to-transparent rounded-3xl px-6 py-8">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">AI 生成</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900 leading-snug">一分钟<br />AI 生成简历</h2>
                <p className="text-xs text-violet-900/40 mt-2 leading-relaxed">填写关键信息，AI 自动匹配岗位生成专业内容。</p>
              </div>

              {/* Step progress indicator */}
              <div className="flex flex-col gap-2">
                {Array.from({ length: wizardState.totalSteps }, (_, i) => i + 1).map((step) => (
                  <div key={step} className="flex items-center gap-2.5">
                    <div className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all',
                      step < wizardState.currentStep
                        ? 'bg-violet-600'
                        : step === wizardState.currentStep
                          ? 'bg-violet-100 ring-2 ring-violet-400'
                          : 'bg-gray-100',
                    )}>
                      {step < wizardState.currentStep
                        ? <Check className="w-3 h-3 text-white" />
                        : <span className={cn(
                            'text-[10px] font-bold',
                            step === wizardState.currentStep ? 'text-violet-700' : 'text-gray-400',
                          )}>{step}</span>
                      }
                    </div>
                    <span className={cn(
                      'text-xs transition-colors',
                      step < wizardState.currentStep ? 'text-violet-600 font-medium' :
                      step === wizardState.currentStep ? 'font-semibold text-gray-800' : 'text-gray-400',
                    )}>
                      {['基本身份', '目标岗位', '工作经历', '教育背景', '技能亮点'][step - 1] ?? `步骤 ${step}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Full-page generation view
// ---------------------------------------------------------------------------

interface GenerationPageProps {
  readonly isGenerating: boolean;
  readonly streamedText: string;
  readonly error: string | null;
  readonly onStop: () => void;
  readonly onBack: () => void;
  readonly onRetry: () => void;
  readonly setShowUpgrade: (show: boolean) => void;
  readonly inMiniProgram: boolean;
}

function GenerationPage({
  isGenerating,
  streamedText,
  error,
  onStop,
  onBack,
  onRetry,
  setShowUpgrade,
  inMiniProgram,
}: GenerationPageProps): React.ReactElement {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isUserScrolled = useRef<boolean>(false);
  const sections: readonly DisplaySection[] = parseStreamSections(streamedText);
  const hasSections: boolean = sections.length > 0;

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // 如果距离底部小于 100px，认为用户在最底部，否则认为是用户主动向上滑动了
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    isUserScrolled.current = !isAtBottom;
  }, []);

  useEffect(() => {
    if (scrollRef.current && isGenerating && !isUserScrolled.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [streamedText, isGenerating]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && isGenerating) {
        onStop();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGenerating, onStop]);

  return (
    <div className="min-h-screen bg-[#F7F6FB] flex flex-col">
      {!inMiniProgram && <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-gray-100/80">
        <div className="max-w-6xl mx-auto px-6 h-13 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-violet-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            返回
          </button>
          <div className="w-px h-4 bg-gray-200" />
          <span className="text-sm font-semibold text-gray-800">AI 生成简历</span>
          <span className="text-sm text-gray-400">·</span>
          <span className="text-sm text-gray-500">{isGenerating ? '正在生成…' : '生成完成'}</span>
          {isGenerating && (
            <div className="flex gap-1 ml-1">
              {[0, 0.15, 0.3].map((d) => (
                <motion.div
                  key={d}
                  className="w-1 h-1 rounded-full bg-violet-400"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, delay: d, repeat: Infinity }}
                />
              ))}
            </div>
          )}
        </div>
      </header>}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto pb-28"
      >
        <div className="max-w-3xl mx-auto px-6 py-8">
          <AnimatePresence mode="wait">
            {hasSections ? (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {sections.map((sec, idx) => (
                  <SectionBlock key={`${sec.title}-${idx}`} section={sec} />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-24 gap-5"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-violet-400" />
                  </div>
                  <motion.div
                    className="absolute inset-0 rounded-2xl border-2 border-violet-300"
                    animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">正在生成简历内容</p>
                  <p className="text-xs text-gray-400 mt-1">通常需要 15–30 秒</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isGenerating && hasSections && (
            <div className="mt-5 space-y-2.5">
              <ShimmerBar width="88%" delay={0} />
              <ShimmerBar width="100%" delay={0.12} />
              <ShimmerBar width="72%" delay={0.24} />
            </div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 flex flex-col items-center gap-4"
            >
              <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 flex items-start gap-3 max-w-sm w-full">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
              {error.includes('VIP') || error.includes('次数已达上限') ? (
                <button
                  type="button"
                  onClick={() => { toast.error('今日免费额度已用完，升级VIP可无限使用'); setShowUpgrade(true); }}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  升级 VIP 无限使用
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onRetry}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  重新生成
                </button>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {isGenerating && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-5 py-2.5 bg-white rounded-full shadow-lg shadow-gray-200/80 border border-gray-100"
          >
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Loader2 className="w-3.5 h-3.5 text-violet-500 animate-spin" />
              正在生成
            </div>
            <div className="w-px h-3.5 bg-gray-200" />
            <button
              type="button"
              onClick={onStop}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              <CircleStop className="w-3.5 h-3.5" />
              停止
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section renderers — simple JSX, no markdown library
// ---------------------------------------------------------------------------

function SectionBlock({ section }: { section: DisplaySection }): React.ReactElement {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h3 className="text-xs font-semibold text-violet-600 uppercase tracking-wider mb-3">{section.title}</h3>
      {section.type === 'fields' && section.fields && (
        <ul className="space-y-2">
          {section.fields.map((f, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="font-medium text-gray-500 shrink-0 min-w-14">{f.label}</span>
              <span className="text-gray-800">{f.value}</span>
            </li>
          ))}
        </ul>
      )}
      {section.type === 'text' && section.text && (
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{section.text}</p>
      )}
      {section.type === 'experience' && section.items && (
        <div className="space-y-4">
          {section.items.map((item, i) => (
            <div key={i}>
              <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-gray-800 text-sm">{item.name}</span>
                  {item.subtitle && <span className="text-xs text-gray-500">{item.subtitle}</span>}
                </div>
                {item.period && <span className="text-xs text-gray-400">{item.period}</span>}
              </div>
              {item.lines.length > 0 && (
                <ul className="space-y-1">
                  {item.lines.map((line, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="w-1 h-1 rounded-full bg-gray-300 mt-2 shrink-0" />
                      <span className="leading-relaxed">{line}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Animated shimmer loading bar
// ---------------------------------------------------------------------------

function ShimmerBar({ width, delay }: { width: string; delay: number }): React.ReactElement {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className="h-2.5 rounded-full overflow-hidden bg-gray-100"
      style={{ width }}
    >
      <div
        className="h-full rounded-full animate-shimmer"
        style={{
          background: 'linear-gradient(90deg, #f3f0ff 0%, #ede9fe 40%, #f3f0ff 100%)',
          backgroundSize: '200% 100%',
        }}
      />
    </motion.div>
  );
}

export const StepCard = ({ 
  stepNumber, 
  title, 
  children, 
  onSkip,
  onClickPast,
}: { 
  stepNumber: number; 
  title: string; 
  children: React.ReactNode;
  onSkip?: () => void;
  onClickPast?: () => void;
}) => {
  const { currentStep } = useWizardStore();
  const isCurrent: boolean = stepNumber === currentStep;
  const isPast: boolean = stepNumber < currentStep;
  
  if (stepNumber > currentStep) return null;

  const handleHeaderClick = (): void => {
    if (isPast && onClickPast) {
      onClickPast();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="w-full"
    >
      <div className={cn(
        'bg-white rounded-2xl border shadow-sm transition-all',
        isCurrent ? 'border-violet-200 p-4 sm:p-6' : 'border-gray-100 p-4 sm:p-5',
      )}>
        <div
          className={cn(
            'flex items-center justify-between mb-4',
            isPast && onClickPast && 'cursor-pointer hover:opacity-70 transition-opacity',
          )}
          onClick={handleHeaderClick}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
              isPast
                ? 'bg-violet-600'
                : 'bg-violet-100 ring-2 ring-violet-300',
            )}>
              {isPast
                ? <Check className="w-3.5 h-3.5 text-white" />
                : <span className="text-[10px] font-bold text-violet-700">{stepNumber}</span>
              }
            </div>
            <h2 className={cn(
              'font-bold',
              isCurrent ? 'text-gray-900 text-base' : 'text-gray-500 text-sm',
            )}>{title}</h2>
          </div>
          <div className="flex items-center gap-3">
            {isPast && onClickPast && (
              <span className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-600 transition-colors">
                <Pencil className="w-3 h-3" />
                修改
              </span>
            )}
            {onSkip && isCurrent && (
              <button
                onClick={onSkip}
                className="text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors"
              >
                跳过
              </button>
            )}
          </div>
        </div>

        {isCurrent && children}
      </div>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// Quota hint — handles VIP unlimited, limit reached, and normal states
// ---------------------------------------------------------------------------

interface QuotaHintProps {
  readonly remaining: number | 'unlimited';
  readonly limit: number | null;
  readonly isLimitReached: boolean;
  readonly onUpgrade: () => void;
}

function QuotaHint({ remaining, limit, isLimitReached, onUpgrade }: QuotaHintProps): React.ReactElement {
  if (isLimitReached) {
    return (
      <p className="text-center text-xs text-gray-400">
        今日次数已用完 ·{' '}
        <button type="button" onClick={onUpgrade} className="text-violet-600 font-medium hover:underline">
          升级会员无限使用
        </button>
      </p>
    );
  }
  if (remaining === 'unlimited') {
    return <p className="text-center text-xs text-gray-300">会员无限次使用</p>;
  }
  return (
    <p className="text-center text-xs text-gray-300">今日剩余 {remaining}/{limit ?? '∞'} 次</p>
  );
}

export const ChatBubble = ({ 
  content, 
  isUser = false 
}: { 
  content: string; 
  isUser?: boolean; 
}) => {
  if (!content) return null;
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex w-full mb-6",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div className={cn(
        "px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl max-w-[85%] sm:max-w-[80%] text-sm font-medium",
        isUser 
          ? "bg-[#D8B4FE] text-[#4C1D95] rounded-tr-none" 
          : "bg-white border border-gray-100 shadow-sm text-gray-700 rounded-tl-none"
      )}>
        {content}
      </div>
    </motion.div>
  );
};
