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
  { label: 'ChatGPT', color: 'bg-emerald-100 text-emerald-700' },
  { label: 'Claude', color: 'bg-violet-100 text-violet-700' },
  { label: 'DeepSeek', color: 'bg-blue-100 text-blue-700' },
  { label: 'Gemini', color: 'bg-sky-100 text-sky-700' },
  { label: 'Copilot', color: 'bg-amber-100 text-amber-700' },
  { label: 'Other Text', color: 'bg-slate-100 text-slate-600' },
];

export default function ImportResumePage(): React.ReactElement {
  const router = useRouter();
  const [rawText, setRawText] = useState<string>('');
  const selectedModel: string = AI_MODELS[0].name;
  const [showGenPage, setShowGenPage] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const {
    isGenerating, streamedText, error, isNotResume,
    generate, abort, reset,
  } = useImportGeneration();
  const { isLoginOpen, handleLoginSuccess, handleLoginClose, isLoggedIn } = useRequireAuth();
  const { usage, isLimitReached, refresh: refreshUsage } = useAiUsage();

  const saveResume = useCallback(async (resumeData: ResumeData): Promise<void> => {
    setIsSaving(true);
    try {
      const res: Response = await fetch('/next-api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: resumeData.name || 'AI Formatted Resume',
          content: resumeData,
          template: 'simple',
        }),
      });
      if (!res.ok) throw new Error('Failed to save resume');
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

  const openEditorWithData = useCallback((resumeData: ResumeData): void => {
    localStorage.setItem(IMPORT_CACHE_KEY, JSON.stringify(resumeData));
    if (isLoggedIn()) {
      saveResume(resumeData);
    } else {
      router.push('/editor/new?source=import');
    }
  }, [isLoggedIn, saveResume, router]);

  const handleImport = useCallback(async (): Promise<void> => {
    if (isLimitReached) return;
    if (rawText.trim().length < MIN_TEXT_LENGTH) return;
    setShowGenPage(true);
    const importResult = await generate(rawText, selectedModel);
    await refreshUsage();
    if (importResult) {
      const resumeData = mapExternalResume(importResult);
      openEditorWithData(resumeData);
    }
  }, [rawText, selectedModel, generate, openEditorWithData, isLimitReached, refreshUsage]);

  const handleStop = useCallback((): void => { abort(); }, [abort]);
  const handleBack = useCallback((): void => {
    reset();
    setShowGenPage(false);
    setIsSaving(false);
  }, [reset]);

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
            Back
          </button>
          <div className="w-px h-4 bg-gray-200" />
          <h1 className="text-sm font-semibold text-gray-800">AI Text to Resume</h1>
        </div>
      </header>
      <WxLoginDialog isOpen={isLoginOpen} onClose={handleLoginClose} onSuccess={handleLoginSuccess} />

      <div className="text-center pt-8 pb-2">
        <h2 className="text-xl font-bold text-gray-900">Paste Resume Text, One-Click Format</h2>
        <p className="text-sm text-gray-400 mt-1">
          Supports resume content copied from AI platforms, intelligently parsed into professionally formatted resumes
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center pb-10 px-4">
        <div className="w-full max-w-3xl space-y-6">
          {/* Platform badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="text-xs text-gray-400 mr-1">Supported sources:</span>
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
                  Why import AI-generated resumes here?
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  ChatGPT, Claude, DeepSeek and other AI tools write great content, but lack formatting, avatars, and drag-and-drop.
                  Paste here for <strong className="text-[#8B5CF6]">professional formatting + free PDF export</strong>.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: '📄', text: 'Professional Layout' },
                { icon: '🖼️', text: 'Avatar Support' },
                { icon: '🎨', text: 'Multiple Templates' },
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
              <label className="text-sm font-bold text-gray-800 block">Paste Resume Content</label>
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                💡 If you only have a file, use an AI tool to convert it to text first
              </span>
            </div>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={'Paste or type your resume text here...'}
              className="w-full h-60 resize-none rounded-xl border border-gray-200 bg-[#FAFBFC] px-4 py-3 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/30 focus:border-[#8B5CF6]/50 transition-all"
            />
            <div className="flex items-center justify-between mt-2">
              <span className={cn(
                'text-xs',
                rawText.length > 0 && !isValid ? 'text-amber-500' : 'text-gray-300',
              )}>
                {rawText.length > 0
                  ? `${rawText.length} characters entered${!isValid ? ' (minimum 10 characters)' : ''}`
                  : 'Paste or type resume text'}
              </span>
              {isValid && (
                <span className="flex items-center gap-1 text-xs text-emerald-500">
                  <CheckCircle2 className="w-3 h-3" />
                  Ready
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 pt-2">
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
                Start Import
              </button>
              
              <Link
                href="/editor/new"
                className="px-8 py-3 rounded-full text-lg font-medium flex items-center gap-2 border-2 border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-all bg-white"
              >
                <FileText className="w-5 h-5" />
                Skip Import, Create Directly
              </Link>
            </div>
            {usage && (
              <p className={cn('text-xs', isLimitReached ? 'text-red-500' : 'text-gray-400')}>
                {isLimitReached
                  ? `Daily limit reached (${usage.used}/${usage.limit}). ${usage.isAuthenticated ? 'Please try again tomorrow' : 'Log in for more uses'}`
                  : `${usage.remaining}/${usage.limit} uses remaining today${usage.isAuthenticated ? '' : ' (log in for more)'}`}
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
            Back
          </button>
          <div className="w-px h-4 bg-gray-200" />
          <h1 className="text-sm font-semibold text-gray-800">Parsing Resume</h1>
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
                <p className="text-gray-400 text-sm">Parsing resume content...</p>
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
              <p className="text-sm text-gray-500">Saving resume...</p>
            </motion.div>
          )}

          {isNotResume && error && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-amber-500">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
              <button type="button" onClick={onBack} className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-6 py-2.5 rounded-full text-sm font-medium shadow-md transition-all">
                Go Back and Retry
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
                Retry Parsing
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
              Parsing resume
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <button type="button" onClick={onStop} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors">
              <CircleStop className="w-4 h-4" />
              Stop (Esc)
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
              <span className="font-medium text-gray-700">{f.label}: </span>
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
