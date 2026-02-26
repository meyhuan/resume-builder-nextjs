'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useWizardStore, getWizardInput } from '@/state/wizard-store';
import { useAiGeneration } from '@/lib/ai/use-ai-generation';
import { getAvailableModels } from '@/lib/ai/ai-config';
import { mapExternalResume } from '@/io/external-resume-importer';
import type { ResumeData } from '@/entities/resume/resume-data';
import { parseStreamSections } from '@/lib/ai/json-to-markdown';
import type { DisplaySection } from '@/lib/ai/json-to-markdown';
import { Sparkles, Loader2, AlertCircle, ChevronDown, ChevronLeft, CircleStop } from 'lucide-react';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useAiUsage } from '@/hooks/use-ai-usage';
import { WxLoginDialog } from '@/components/auth/WxLoginDialog';

const AI_MODELS = getAvailableModels();
const WIZARD_CACHE_KEY = 'wizard_pending_resume';

export const WizardLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const wizardState = useWizardStore();
  const { isGenerating, streamedText, error, generate, abort, reset } = useAiGeneration();
  const [selectedModel, setSelectedModel] = useState<string>(AI_MODELS[0].name);
  const [showModelPicker, setShowModelPicker] = useState<boolean>(false);
  const [showGenPage, setShowGenPage] = useState<boolean>(false);
  const { isLoginOpen, requireAuth, handleLoginSuccess, handleLoginClose, isLoggedIn } = useRequireAuth();
  const { usage, isLimitReached, refresh: refreshUsage } = useAiUsage();

  const saveResume = useCallback(async (resumeData: ResumeData): Promise<void> => {
    try {
      const res: Response = await fetch('/api/resumes', {
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
      router.push(`/editor/${saved.id}`);
    } catch (err) {
      console.error('[AI] Failed to save resume:', err);
    }
  }, [router]);

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

  const handleGenerate = async (): Promise<void> => {
    if (isLimitReached) return;
    const input = getWizardInput(wizardState);
    if (!input) return;
    setShowGenPage(true);
    const result = await generate(input, selectedModel);
    await refreshUsage();
    if (result) {
      const resumeData = mapExternalResume(result);
      localStorage.setItem(WIZARD_CACHE_KEY, JSON.stringify(resumeData));
      requireAuth(() => { saveResume(resumeData); });
    }
  };

  const handleStop = useCallback((): void => {
    abort();
  }, [abort]);

  const handleBack = useCallback((): void => {
    reset();
    setShowGenPage(false);
  }, [reset]);

  const selectedModelLabel: string =
    AI_MODELS.find((m) => m.name === selectedModel)?.displayName ?? selectedModel;

  if (showGenPage) {
    return (
      <GenerationPage
        isGenerating={isGenerating}
        streamedText={streamedText}
        error={error}
        onStop={handleStop}
        onBack={handleBack}
        onRetry={handleGenerate}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col">
      {/* Page header */}
      <header className="sticky top-0 z-20 bg-white/70 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(isLoggedIn() ? '/dashboard' : '/')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#8B5CF6] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            返回
          </button>
          <div className="w-px h-4 bg-gray-200" />
          <h1 className="text-sm font-semibold text-gray-800">AI 生成简历</h1>
        </div>
      </header>
      <WxLoginDialog isOpen={isLoginOpen} onClose={handleLoginClose} onSuccess={handleLoginSuccess} />

      {/* Hero title */}
      <div className="text-center pt-8 pb-4">
        <h2 className="text-xl font-bold text-gray-900">一分钟，AI生成简历</h2>
        <p className="text-sm text-gray-400 mt-1">输入关键信息，AI 一键生成匹配岗位的专业简历</p>
      </div>

      <div className="flex-1 flex flex-col items-center pb-10 px-4">
      <div className="w-full max-w-3xl space-y-6">
        <div className="space-y-6">
          {children}
        </div>

        {wizardState.currentStep === wizardState.totalSteps && (
          <div className="flex flex-col items-center pt-8 gap-4">
            <p className="text-gray-400 text-sm">已收到你的信息，点击生成简历</p>

            {/* Model selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowModelPicker(!showModelPicker)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-500 hover:border-[#8B5CF6]/40 transition-colors"
              >
                模型：{selectedModelLabel}
                <ChevronDown className="w-3 h-3" />
              </button>
              {showModelPicker && (
                <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-white rounded-lg border border-gray-200 shadow-lg z-10 min-w-[180px] py-1">
                  {AI_MODELS.map((m) => (
                    <button
                      key={m.name}
                      type="button"
                      onClick={() => { setSelectedModel(m.name); setShowModelPicker(false); }}
                      className={cn(
                        'w-full text-left px-4 py-2 text-sm hover:bg-[#F5F3FF] transition-colors',
                        m.name === selectedModel ? 'text-[#8B5CF6] font-medium bg-[#F5F3FF]' : 'text-gray-600',
                      )}
                    >
                      {m.displayName}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLimitReached}
              className={cn(
                'px-8 py-3 rounded-full text-lg font-medium flex items-center gap-2 shadow-lg transition-all',
                isLimitReached
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                  : 'bg-[#8B5CF6] hover:bg-[#7C3AED] text-white hover:shadow-xl',
              )}
            >
              <Sparkles className="w-5 h-5" />
              生成简历
            </button>
            {usage && (
              <p className={cn('text-xs', isLimitReached ? 'text-red-500' : 'text-gray-400')}>
                {isLimitReached
                  ? `今日次数已用完（${usage.used}/${usage.limit}），${usage.isAuthenticated ? '请明天再试' : '登录后可获得更多次数'}`
                  : `今日剩余 ${usage.remaining}/${usage.limit} 次${usage.isAuthenticated ? '' : '（登录后可获得更多次数）'}`}
              </p>
            )}
          </div>
        )}
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
}

function GenerationPage({
  isGenerating,
  streamedText,
  error,
  onStop,
  onBack,
  onRetry,
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
    <div className="min-h-screen bg-gradient-to-b from-[#F0EAFF]/40 via-[#F8F9FC] to-[#F8F9FC] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/70 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#8B5CF6] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            返回
          </button>
          <div className="w-px h-4 bg-gray-200" />
          <h1 className="text-sm font-semibold text-gray-800">AI 生成简历</h1>
        </div>
      </header>

      {/* Content area */}
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
                className="flex flex-col items-center justify-center py-20 gap-4"
              >
                <Loader2 className="w-8 h-8 text-[#8B5CF6] animate-spin" />
                <p className="text-gray-400 text-sm">正在连接 AI 模型...</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Animated gradient loading bars */}
          {isGenerating && hasSections && (
            <div className="mt-6 space-y-3">
              <ShimmerBar width="90%" delay={0} />
              <ShimmerBar width="100%" delay={0.15} />
              <ShimmerBar width="75%" delay={0.3} />
            </div>
          )}

          {/* Error state */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 flex flex-col items-center gap-4"
            >
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
              <button
                type="button"
                onClick={onRetry}
                className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-6 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 shadow-md transition-all"
              >
                <Sparkles className="w-4 h-4" />
                重新生成
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Floating status bar */}
      {isGenerating && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 px-5 py-2.5 bg-white/90 backdrop-blur-lg rounded-full shadow-lg border border-gray-100"
          >
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 text-[#8B5CF6] animate-spin" />
              正在生成简历
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <button
              type="button"
              onClick={onStop}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors"
            >
              <CircleStop className="w-4 h-4" />
              停止 Esc
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
    <div className="border-b border-gray-100 pb-5 last:border-b-0">
      <h3 className="text-base font-bold text-gray-800 mb-3">{section.title}</h3>
      {section.type === 'fields' && section.fields && (
        <ul className="space-y-1.5">
          {section.fields.map((f, i) => (
            <li key={i} className="flex items-baseline gap-2 text-sm text-gray-600">
              <span className="text-gray-400">•</span>
              <span className="font-medium text-gray-700">{f.label}：</span>
              <span>{f.value}</span>
            </li>
          ))}
        </ul>
      )}
      {section.type === 'text' && section.text && (
        <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
          {section.text}
        </div>
      )}
      {section.type === 'experience' && section.items && (
        <div className="space-y-4">
          {section.items.map((item, i) => (
            <div key={i}>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-semibold text-gray-700 text-sm">{item.name}</span>
                {item.subtitle && (
                  <span className="text-sm text-gray-500">{item.subtitle}</span>
                )}
                {item.period && (
                  <span className="text-xs text-gray-400 ml-auto">{item.period}</span>
                )}
              </div>
              {item.lines.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {item.lines.map((line, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span>{line}</span>
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
      className="h-3 rounded-full overflow-hidden"
      style={{ width }}
    >
      <div
        className="h-full rounded-full animate-shimmer"
        style={{
          background: 'linear-gradient(90deg, #E9D5FF 0%, #F5D0FE 30%, #FBCFE8 50%, #F5D0FE 70%, #E9D5FF 100%)',
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
  const { currentStep, totalSteps } = useWizardStore();
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div className={cn(
        "bg-white rounded-2xl p-6 shadow-sm border border-gray-100",
        isPast && onClickPast && "transition-colors"
      )}>
        <div
          className={cn(
            "flex items-center justify-between mb-4",
            isPast && onClickPast && "cursor-pointer hover:opacity-70 transition-opacity"
          )}
          onClick={handleHeaderClick}
        >
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium">{stepNumber}/{totalSteps}</span>
            <h2 className="text-gray-800 font-bold text-lg">{title}</h2>
          </div>
          {onSkip && isCurrent && (
            <button 
              onClick={onSkip}
              className="text-gray-400 hover:text-gray-600 text-sm font-medium"
            >
              跳过
            </button>
          )}
        </div>
        
        {children}
      </div>
    </motion.div>
  );
};

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
        "px-5 py-3 rounded-2xl max-w-[80%] text-sm font-medium",
        isUser 
          ? "bg-[#D8B4FE] text-[#4C1D95] rounded-tr-none" 
          : "bg-white border border-gray-100 shadow-sm text-gray-700 rounded-tl-none"
      )}>
        {content}
      </div>
    </motion.div>
  );
};
