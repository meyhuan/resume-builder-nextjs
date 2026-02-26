'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useImportGeneration } from '@/lib/ai/use-import-generation';
import { getAvailableModels } from '@/lib/ai/ai-config';
import { mapExternalResume } from '@/io/external-resume-importer';
import type { ResumeData } from '@/entities/resume/resume-data';
import { parseStreamSections } from '@/lib/ai/json-to-markdown';
import type { DisplaySection } from '@/lib/ai/json-to-markdown';
import {
  ChevronLeft,
  ChevronDown,
  FileUp,
  FileText,
  Loader2,
  AlertCircle,
  CircleStop,
  Sparkles,
  CheckCircle2,
  MessageSquareText,
} from 'lucide-react';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useAiUsage } from '@/hooks/use-ai-usage';
import { WxLoginDialog } from '@/components/auth/WxLoginDialog';

const AI_MODELS = getAvailableModels();
const MIN_TEXT_LENGTH = 10;
const IMPORT_CACHE_KEY = 'import_pending_resume';

const PLATFORM_BADGES: readonly { label: string; color: string }[] = [
  { label: '豆包', color: 'bg-sky-100 text-sky-700' },
  { label: '通义千问', color: 'bg-violet-100 text-violet-700' },
  { label: 'ChatGPT', color: 'bg-emerald-100 text-emerald-700' },
  { label: 'DeepSeek', color: 'bg-blue-100 text-blue-700' },
  { label: 'Kimi', color: 'bg-amber-100 text-amber-700' },
  { label: '其他文本', color: 'bg-slate-100 text-slate-600' },
];

export default function ImportResumePage(): React.ReactElement {
  const router = useRouter();
  const [rawText, setRawText] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>(AI_MODELS[0].name);
  const [showModelPicker, setShowModelPicker] = useState<boolean>(false);
  const [showGenPage, setShowGenPage] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const {
    isGenerating, streamedText, error, isNotResume,
    generate, abort, reset,
  } = useImportGeneration();
  const { isLoginOpen, requireAuth, handleLoginSuccess, handleLoginClose, isLoggedIn } = useRequireAuth();
  const { usage, isLimitReached, refresh: refreshUsage } = useAiUsage();

  const saveResume = useCallback(async (resumeData: ResumeData): Promise<void> => {
    setIsSaving(true);
    try {
      const res: Response = await fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: resumeData.name || 'AI 排版简历',
          content: resumeData,
          template: 'simple',
        }),
      });
      if (!res.ok) throw new Error('保存简历失败');
      const saved: { id: string } = await res.json();
      localStorage.removeItem(IMPORT_CACHE_KEY);
      router.push(`/editor/${saved.id}`);
    } catch (err) {
      console.error('[Import] Failed to save resume:', err);
    } finally {
      setIsSaving(false);
    }
  }, [router]);

  // Auto-save cached result when user returns logged in
  useEffect(() => {
    const cached = localStorage.getItem(IMPORT_CACHE_KEY);
    if (cached && isLoggedIn()) {
      try {
        const resumeData = JSON.parse(cached) as ResumeData;
        saveResume(resumeData);
      } catch {
        localStorage.removeItem(IMPORT_CACHE_KEY);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleImport = useCallback(async (): Promise<void> => {
    if (isLimitReached) return;
    if (rawText.trim().length < MIN_TEXT_LENGTH) return;
    setShowGenPage(true);
    const importResult = await generate(rawText, selectedModel);
    await refreshUsage();
    if (importResult) {
      const resumeData = mapExternalResume(importResult);
      localStorage.setItem(IMPORT_CACHE_KEY, JSON.stringify(resumeData));
      requireAuth(() => { saveResume(resumeData); });
    }
  }, [rawText, selectedModel, generate, requireAuth, saveResume, isLimitReached, refreshUsage]);

  const handleStop = useCallback((): void => { abort(); }, [abort]);
  const handleBack = useCallback((): void => {
    reset();
    setShowGenPage(false);
    setIsSaving(false);
  }, [reset]);

  const selectedModelLabel: string =
    AI_MODELS.find((m) => m.name === selectedModel)?.displayName ?? selectedModel;

  if (showGenPage) {
    return (
      <ImportGenerationPage
        isGenerating={isGenerating}
        isSaving={isSaving}
        streamedText={streamedText}
        error={error}
        isNotResume={isNotResume}
        onStop={handleStop}
        onBack={handleBack}
        onRetry={handleImport}
      />
    );
  }

  const isValid: boolean = rawText.trim().length >= MIN_TEXT_LENGTH;

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col">
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
          <h1 className="text-sm font-semibold text-gray-800">AI 文本转简历</h1>
        </div>
      </header>
      <WxLoginDialog isOpen={isLoginOpen} onClose={handleLoginClose} onSuccess={handleLoginSuccess} />

      <div className="text-center pt-8 pb-2">
        <h2 className="text-xl font-bold text-gray-900">粘贴简历文本，一键格式化</h2>
        <p className="text-sm text-gray-400 mt-1">
          支持从各大 AI 平台复制的简历内容，智能解析为专业排版简历
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center pb-10 px-4">
        <div className="w-full max-w-3xl space-y-6">
          {/* Platform badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="text-xs text-gray-400 mr-1">支持来源：</span>
            {PLATFORM_BADGES.map((badge) => (
              <span
                key={badge.label}
                className={cn('text-xs font-medium px-2.5 py-1 rounded-full', badge.color)}
              >
                {badge.label}
              </span>
            ))}
          </div>

          {/* Pain point card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#F5F3FF] flex items-center justify-center shrink-0">
                <MessageSquareText className="w-4 h-4 text-[#8B5CF6]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-1">
                  为什么用 AI 生成的简历还需要导入？
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  豆包、千问、ChatGPT 等 AI 能写出好内容，但缺少排版、无法添加头像、不支持模块拖拽。
                  粘贴到这里，<strong className="text-[#8B5CF6]">一键获得专业排版 + 免费 PDF 导出</strong>。
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: '📄', text: '专业排版' },
                { icon: '🖼️', text: '支持头像' },
                { icon: '🎨', text: '多套模板' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2 bg-[#F8F9FC] rounded-lg px-3 py-2">
                  <span className="text-base">{item.icon}</span>
                  <span className="text-xs font-medium text-gray-600">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Textarea */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-gray-800 block">粘贴简历内容</label>
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                💡 如果只有文件格式，请使用豆包等工具转成文本格式
              </span>
            </div>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={'在此粘贴或输入简历文本...'}
              className="w-full h-60 resize-none rounded-xl border border-gray-200 bg-[#FAFBFC] px-4 py-3 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/30 focus:border-[#8B5CF6]/50 transition-all"
            />
            <div className="flex items-center justify-between mt-2">
              <span className={cn(
                'text-xs',
                rawText.length > 0 && !isValid ? 'text-amber-500' : 'text-gray-300',
              )}>
                {rawText.length > 0
                  ? `已输入 ${rawText.length} 字符${!isValid ? '（至少需要10个字符）' : ''}`
                  : '粘贴或输入简历文本'}
              </span>
              {isValid && (
                <span className="flex items-center gap-1 text-xs text-emerald-500">
                  <CheckCircle2 className="w-3 h-3" />
                  内容就绪
                </span>
              )}
            </div>
          </div>

          {/* Model selector + button */}
          <div className="flex flex-col items-center gap-4 pt-2">
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
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                type="button"
                onClick={handleImport}
                disabled={!isValid || isLimitReached}
                className={cn(
                  'px-8 py-3 rounded-full text-lg font-medium flex items-center gap-2 shadow-lg transition-all',
                  isValid && !isLimitReached
                    ? 'bg-[#8B5CF6] hover:bg-[#7C3AED] text-white hover:shadow-xl'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none',
                )}
              >
                <FileUp className="w-5 h-5" />
                开始解析导入
              </button>
              
              <Link
                href="/editor/new"
                className="px-8 py-3 rounded-full text-lg font-medium flex items-center gap-2 border-2 border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-all bg-white"
              >
                <FileText className="w-5 h-5" />
                跳过导入，直接创建
              </Link>
            </div>
            {usage && (
              <p className={cn('text-xs', isLimitReached ? 'text-red-500' : 'text-gray-400')}>
                {isLimitReached
                  ? `今日次数已用完（${usage.used}/${usage.limit}），${usage.isAuthenticated ? '请明天再试' : '登录后可获得更多次数'}`
                  : `今日剩余 ${usage.remaining}/${usage.limit} 次${usage.isAuthenticated ? '' : '（登录后可获得更多次数）'}`}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generation page (streaming display)
// ---------------------------------------------------------------------------

interface ImportGenerationPageProps {
  readonly isGenerating: boolean;
  readonly isSaving: boolean;
  readonly streamedText: string;
  readonly error: string | null;
  readonly isNotResume: boolean;
  readonly onStop: () => void;
  readonly onBack: () => void;
  readonly onRetry: () => void;
}

function ImportGenerationPage({
  isGenerating, isSaving, streamedText, error, isNotResume,
  onStop, onBack, onRetry,
}: ImportGenerationPageProps): React.ReactElement {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isUserScrolled = useRef<boolean>(false);
  const sections: readonly DisplaySection[] = parseStreamSections(streamedText);
  const hasSections: boolean = sections.length > 0;

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
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
      if (e.key === 'Escape' && isGenerating) onStop();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGenerating, onStop]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0EAFF]/40 via-[#F8F9FC] to-[#F8F9FC] flex flex-col">
      <header className="sticky top-0 z-20 bg-white/70 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-3">
          <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#8B5CF6] transition-colors">
            <ChevronLeft className="w-4 h-4" />
            返回
          </button>
          <div className="w-px h-4 bg-gray-200" />
          <h1 className="text-sm font-semibold text-gray-800">解析导入简历</h1>
        </div>
      </header>

      <div 
        ref={scrollRef} 
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto pb-28"
      >
        <div className="max-w-3xl mx-auto px-6 py-8">
          <AnimatePresence mode="wait">
            {hasSections ? (
              <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {sections.map((sec, idx) => (
                  <SectionBlock key={`${sec.title}-${idx}`} section={sec} />
                ))}
              </motion.div>
            ) : (
              <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-8 h-8 text-[#8B5CF6] animate-spin" />
                <p className="text-gray-400 text-sm">正在解析简历内容...</p>
              </motion.div>
            )}
          </AnimatePresence>

          {isGenerating && hasSections && (
            <div className="mt-6 space-y-3">
              <ShimmerBar width="90%" delay={0} />
              <ShimmerBar width="100%" delay={0.15} />
              <ShimmerBar width="75%" delay={0.3} />
            </div>
          )}

          {isSaving && !isGenerating && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 text-[#8B5CF6] animate-spin" />
              <p className="text-sm text-gray-500">正在保存简历...</p>
            </motion.div>
          )}

          {isNotResume && error && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-amber-500">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
              <button type="button" onClick={onBack} className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-6 py-2.5 rounded-full text-sm font-medium shadow-md transition-all">
                返回重新粘贴
              </button>
            </motion.div>
          )}

          {error && !isNotResume && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
              <button type="button" onClick={onRetry} className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-6 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 shadow-md transition-all">
                <Sparkles className="w-4 h-4" />
                重新解析
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {isGenerating && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 px-5 py-2.5 bg-white/90 backdrop-blur-lg rounded-full shadow-lg border border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 text-[#8B5CF6] animate-spin" />
              正在解析简历
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <button type="button" onClick={onStop} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors">
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
// Sub-components
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
        <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{section.text}</div>
      )}
      {section.type === 'experience' && section.items && (
        <div className="space-y-4">
          {section.items.map((item, i) => (
            <div key={i}>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-semibold text-gray-700 text-sm">{item.name}</span>
                {item.subtitle && <span className="text-sm text-gray-500">{item.subtitle}</span>}
                {item.period && <span className="text-xs text-gray-400 ml-auto">{item.period}</span>}
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
