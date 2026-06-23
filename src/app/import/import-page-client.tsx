'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useImportGeneration } from '@/lib/ai/use-import-generation';
import { mapExternalResume } from '@/io/external-resume-importer';
import type { ResumeData } from '@/entities/resume/resume-data';
import { buildImportResumeTitle } from '@/lib/import-resume-title';
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
  Upload,
  X,
  ArrowRight,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useVipCheck } from '@/hooks/use-vip-check';
import { WxLoginDialog } from '@/components/auth/WxLoginDialog';
import VipUpgradeDialog from '@/components/vip/vip-upgrade-dialog';

const MIN_TEXT_LENGTH = 10;
const IMPORT_CACHE_KEY = 'import_pending_resume';
const ALLOWED_FILE_TYPES = '.doc,.docx,.pdf,.jpg,.jpeg,.png,.bmp,.gif';
const MAX_FILE_SIZE_MB = 8;

type ImportMode = 'text' | 'file';

const PLATFORM_BADGES: readonly string[] = ['豆包', '通义千问', 'ChatGPT', 'DeepSeek', 'Kimi', '其他 AI'];

function looksLikeResumeData(value: unknown): value is ResumeData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const obj = value as Partial<ResumeData> & Record<string, unknown>;
  return (
    Array.isArray(obj.sections) ||
    obj.baseInfo !== undefined ||
    obj.jobIntention !== undefined ||
    obj.name !== undefined
  );
}

function unwrapImportedResume(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const obj = value as Record<string, unknown>;
  const wrapped = obj.resumeData ?? obj.resume ?? obj.data;
  return wrapped && typeof wrapped === 'object' ? wrapped : value;
}

function resolveImportedResumeData(value: unknown): ResumeData {
  const unwrapped = unwrapImportedResume(value);
  if (looksLikeResumeData(unwrapped)) {
    const resume = unwrapped as Partial<ResumeData>;
    return {
      id: resume.id ?? 'resume-imported',
      name: resume.name ?? '',
      contactHtml: resume.contactHtml,
      baseInfo: resume.baseInfo,
      jobIntention: resume.jobIntention,
      jobIntentionVisible: resume.jobIntentionVisible ?? Boolean(resume.jobIntention),
      sections: Array.isArray(resume.sections) ? resume.sections : [],
    };
  }
  return mapExternalResume(unwrapped as Parameters<typeof mapExternalResume>[0]);
}

export default function ImportResumePage(): React.ReactElement {
  const router = useRouter();
  const [mode, setMode] = useState<ImportMode>('text');
  const [rawText, setRawText] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isFileImporting, setIsFileImporting] = useState<boolean>(false);
  const [fileProgress, setFileProgress] = useState<number>(0);
  const [fileStage, setFileStage] = useState<string>('');
  const [extractedText, setExtractedText] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showGenPage, setShowGenPage] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const {
    isGenerating, streamedText, error, isNotResume,
    generate, abort, reset,
  } = useImportGeneration();
  const { isLoginOpen, handleLoginSuccess, handleLoginClose, isLoggedIn } = useRequireAuth();
  const { showUpgrade, setShowUpgrade, quota, refreshQuota } = useVipCheck();
  const importQuota = quota.aiImportSection;
  const isLimitReached = importQuota.remaining === 0;

  const saveResume = useCallback(async (resumeData: ResumeData, sourceFileName?: string | null): Promise<void> => {
    setIsSaving(true);
    try {
      const res: Response = await fetch('/next-api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: buildImportResumeTitle(resumeData, sourceFileName),
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

  const openEditorWithData = useCallback((resumeData: ResumeData, sourceFileName?: string | null): void => {
    localStorage.setItem(IMPORT_CACHE_KEY, JSON.stringify(resumeData));
    if (isLoggedIn()) {
      saveResume(resumeData, sourceFileName);
    } else {
      router.push('/editor/new?source=import');
    }
  }, [isLoggedIn, saveResume, router]);

  const handleImport = useCallback(async (): Promise<void> => {
    if (isLimitReached) return;
    if (rawText.trim().length < MIN_TEXT_LENGTH) return;
    setShowGenPage(true);
    const importResult = await generate(rawText);
    await refreshQuota();
    if (importResult) {
      const resumeData = mapExternalResume(importResult);
      openEditorWithData(resumeData);
    }
  }, [rawText, generate, openEditorWithData, isLimitReached, refreshQuota]);

  const handleFileSelect = useCallback((file: File): void => {
    setFileError(null);
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const allowed = ['doc', 'docx', 'pdf', 'jpg', 'jpeg', 'png', 'bmp', 'gif'];
    if (!allowed.includes(ext)) {
      setFileError('不支持的文件格式，请上传 Word、PDF 或图片文件');
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setFileError(`文件大小不能超过 ${MAX_FILE_SIZE_MB}MB`);
      return;
    }
    setSelectedFile(file);
  }, []);

  const handleFileImport = useCallback(async (): Promise<void> => {
    if (!selectedFile || isLimitReached) return;
    setIsFileImporting(true);
    setFileError(null);
    setFileProgress(0);
    setFileStage('');
    setExtractedText('');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await fetch('/next-api/ai/import-resume-file', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok || !res.body) {
        setFileError('解析失败，请稍后重试');
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const dataLine = line.split('\n').find((l) => l.startsWith('data: '));
          if (!dataLine) continue;
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const event = JSON.parse(dataLine.slice(6)) as Record<string, any>;
            if (event.type === 'stage') {
              setFileStage(event.label as string);
              setFileProgress(event.progress as number);
            } else if (event.type === 'extracted') {
              setExtractedText(event.text as string);
            } else if (event.type === 'done') {
              setFileProgress(100);
              await refreshQuota();
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const externalResume = event.resumeData as any;
              if (externalResume && typeof externalResume.error === 'string') {
                setFileError((externalResume.message as string) || '内容不像简历，请检查文件后重试');
                return;
              }
              const resumeData = resolveImportedResumeData(externalResume);
              const parsedName: string = externalResume?.base_info?.name ?? '';
              if (parsedName) resumeData.name = parsedName;
              openEditorWithData(resumeData, selectedFile.name);
              return;
            } else if (event.type === 'error') {
              setFileError(event.error as string);
              return;
            }
          } catch {
            // skip malformed events
          }
        }
      }
    } catch (err) {
      setFileError(err instanceof Error ? err.message : '解析失败，请稍后重试');
    } finally {
      setIsFileImporting(false);
    }
  }, [selectedFile, isLimitReached, openEditorWithData, refreshQuota, setFileStage, setExtractedText]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleStop = useCallback((): void => { abort(); }, [abort]);
  const handleBack = useCallback((): void => {
    reset();
    setShowGenPage(false);
    setIsSaving(false);
    setIsFileImporting(false);
    setFileError(null);
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
        setShowUpgrade={setShowUpgrade}
      />
    );
  }

  const isTextValid: boolean = rawText.trim().length >= MIN_TEXT_LENGTH;
  const canSubmitFile = selectedFile && !isFileImporting && !isLimitReached;

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-gray-100/80">
        <div className="max-w-6xl mx-auto px-6 h-13 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push(isLoggedIn() ? '/dashboard' : '/')}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-violet-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            返回
          </button>
          <span className="text-sm font-semibold text-gray-800">AI 导入简历</span>
          <Link
            href="/editor/new"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
          >
            直接创建空白简历
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </header>

      <WxLoginDialog isOpen={isLoginOpen} onClose={handleLoginClose} onSuccess={handleLoginSuccess} />

      {/* Two-column layout on desktop, single column on mobile */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-10 lg:py-16">
        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-12 gap-8">

          {/* ── LEFT: Action panel (主操作区) ── */}
          <div className="flex-1 min-w-0 bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-violet-100/60">
            {/* Mode switcher */}
            <div className="flex gap-1 border-b border-gray-200 mb-6">
              {(['text', 'file'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setFileError(null); }}
                  className={cn(
                    'pb-3 px-1 mr-5 text-sm font-medium border-b-2 -mb-px transition-colors',
                    mode === m
                      ? 'border-violet-600 text-violet-700'
                      : 'border-transparent text-gray-400 hover:text-gray-600',
                  )}
                >
                  {m === 'text' ? '文本粘贴' : '文件上传'}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {/* ── TEXT MODE ── */}
              {mode === 'text' && (
                <motion.div
                  key="text"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col gap-5 min-h-[340px]"
                >
                  <div className="relative flex-1 flex flex-col">
                    <textarea
                      ref={textareaRef}
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder="在此粘贴来自豆包、ChatGPT 等 AI 生成的简历文本..."
                      className="flex-1 w-full h-[220px] resize-none rounded-2xl border border-violet-100 bg-violet-50/30 px-5 py-4 text-sm text-gray-700 placeholder:text-violet-300/60 focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-400 focus:bg-white transition-all leading-relaxed"
                    />
                    {isTextValid && (
                      <div className="absolute bottom-3 right-4 flex items-center gap-1 text-xs text-emerald-500">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        就绪
                      </div>
                    )}
                  </div>

                  {!isTextValid && rawText.length > 0 && (
                    <p className="text-xs text-amber-500 -mt-3">至少需要 {MIN_TEXT_LENGTH} 个字符</p>
                  )}

                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={handleImport}
                      disabled={!isTextValid || isLimitReached}
                      className={cn(
                        'w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all',
                        isTextValid && !isLimitReached
                          ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-200 hover:shadow-lg hover:shadow-violet-200 active:scale-[0.99]'
                          : 'bg-gray-100 text-gray-300 cursor-not-allowed',
                      )}
                    >
                      <Sparkles className="w-4 h-4" />
                      AI 解析并生成简历
                    </button>
                    <QuotaNote remaining={importQuota.remaining} limit={importQuota.limit} isLimitReached={isLimitReached} onUpgrade={() => setShowUpgrade(true)} />
                  </div>
                </motion.div>
              )}

              {/* ── FILE MODE ── */}
              {mode === 'file' && (
                <motion.div
                  key="file"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col gap-5 min-h-[340px] justify-between"
                >
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => !selectedFile && fileInputRef.current?.click()}
                    className={cn(
                      'relative rounded-2xl border-2 border-dashed transition-all overflow-hidden h-[180px] flex items-center justify-center px-5',
                      selectedFile
                        ? 'border-violet-200 bg-violet-50/50 cursor-default'
                        : isDragging
                          ? 'border-violet-400 bg-violet-50 cursor-copy'
                          : 'border-gray-200 bg-white hover:border-violet-300 hover:bg-gray-50/50 cursor-pointer',
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ALLOWED_FILE_TYPES}
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                    />
                    {selectedFile ? (
                      <div className="flex items-center gap-3 w-full">
                        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-violet-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{selectedFile.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setFileError(null); }}
                          className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-center">
                        <div className={cn(
                          'w-12 h-12 rounded-2xl flex items-center justify-center transition-colors',
                          isDragging ? 'bg-violet-100' : 'bg-gray-100',
                        )}>
                          <Upload className={cn('w-6 h-6 transition-colors', isDragging ? 'text-violet-600' : 'text-gray-400')} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-700">
                            {isDragging ? '松开以上传' : '拖拽文件或点击选择'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">Word / PDF / 图片 · 最大 {MAX_FILE_SIZE_MB}MB</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {!selectedFile && (
                    <div className="flex items-center justify-center gap-3 text-xs text-gray-400">
                      {['上传文件', 'AI 提取文本', '生成简历'].map((step, i) => (
                        <React.Fragment key={step}>
                          <span className="bg-white border border-gray-200 rounded-full px-2.5 py-1">{step}</span>
                          {i < 2 && <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />}
                        </React.Fragment>
                      ))}
                    </div>
                  )}

                  {fileError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-100 rounded-xl px-4 py-3"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {fileError}
                    </motion.div>
                  )}

                  <div className="flex flex-col gap-3">
                    {isFileImporting && extractedText && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="rounded-xl bg-violet-50 border border-violet-100 overflow-hidden"
                      >
                        <div className="px-4 py-2 border-b border-violet-100 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-violet-400" />
                          <span className="text-xs font-medium text-violet-600">已提取文本内容</span>
                        </div>
                        <div className="px-4 py-3 max-h-36 overflow-y-auto">
                          <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{extractedText}</p>
                        </div>
                      </motion.div>
                    )}
                    {isFileImporting ? (
                      <FileProgressButton progress={fileProgress} stage={fileStage} />
                    ) : (
                      <button
                        type="button"
                        onClick={handleFileImport}
                        disabled={!canSubmitFile}
                        className={cn(
                          'w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all',
                          canSubmitFile
                            ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-200 hover:shadow-lg hover:shadow-violet-200 active:scale-[0.99]'
                            : 'bg-gray-100 text-gray-300 cursor-not-allowed',
                        )}
                      >
                        <FileUp className="w-4 h-4" />
                        {selectedFile ? 'AI 解析并生成简历' : '选择文件后开始解析'}
                      </button>
                    )}
                    <QuotaNote remaining={importQuota.remaining} limit={importQuota.limit} isLimitReached={isLimitReached} onUpgrade={() => setShowUpgrade(true)} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── RIGHT: Sticky info / explanation panel ── */}
          <div className="lg:w-[280px] lg:shrink-0 hidden lg:block">
            <div className="sticky top-20 flex flex-col gap-6 bg-gradient-to-b from-violet-50/80 to-transparent rounded-3xl px-6 py-8">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">AI 导入</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900 leading-snug">
                  把简历内容<br />变成专业排版
                </h2>
                <p className="text-xs text-violet-900/40 mt-2 leading-relaxed">
                  粘贴文本或上传文件，AI 自动识别结构，生成可拖拽编辑的专业简历。
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {[
                  { label: '专业排版模板', sub: '多套风格，一键切换', color: 'bg-violet-500' },
                  { label: 'AI 智能解析', sub: '自动识别姓名、经历、技能', color: 'bg-fuchsia-500' },
                  { label: 'PDF 免费导出', sub: '高清打印，即拿即用', color: 'bg-violet-400' },
                  { label: '支持头像上传', sub: '裁剪调整，形象专业', color: 'bg-fuchsia-400' },
                ].map((f) => (
                  <div key={f.label} className="flex items-start gap-2.5">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${f.color}`} />
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{f.label}</p>
                      <p className="text-[11px] text-violet-900/40 mt-0.5">{f.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-[11px] text-violet-400 mb-2 font-medium">支持来源</p>
                <div className="flex flex-wrap gap-1.5">
                  {PLATFORM_BADGES.map((label) => (
                    <span key={label} className="text-[11px] text-violet-700 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <VipUpgradeDialog open={showUpgrade} onOpenChange={setShowUpgrade} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quota note
// ---------------------------------------------------------------------------

interface QuotaNoteProps {
  readonly remaining: number | 'unlimited';
  readonly limit: number | null;
  readonly isLimitReached: boolean;
  readonly onUpgrade: () => void;
}

function QuotaNote({ remaining, limit, isLimitReached, onUpgrade }: QuotaNoteProps): React.ReactElement {
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
  readonly setShowUpgrade?: (show: boolean) => void;
}

function ImportGenerationPage({
  isGenerating, isSaving, streamedText, error, isNotResume,
  onStop, onBack, onRetry, setShowUpgrade,
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
    <div className="min-h-screen bg-[#F7F6FB] flex flex-col">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-gray-100/80">
        <div className="max-w-6xl mx-auto px-6 h-13 flex items-center gap-3">
          <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-violet-600 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            返回
          </button>
          <div className="w-px h-4 bg-gray-200" />
          <span className="text-sm font-medium text-gray-700">AI 解析中</span>
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
      </header>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto pb-28"
      >
        <div className="max-w-3xl mx-auto px-6 py-8">
          <AnimatePresence mode="wait">
            {hasSections ? (
              <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                {sections.map((sec, idx) => (
                  <SectionBlock key={`${sec.title}-${idx}`} section={sec} />
                ))}
              </motion.div>
            ) : (
              <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 gap-6">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-violet-400" />
                  </div>
                  <motion.div
                    className="absolute inset-0 rounded-2xl border-2 border-violet-300"
                    animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
                <GenerationSteps />
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

          {isSaving && !isGenerating && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-8 flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
              <p className="text-xs text-gray-400">正在保存，稍候…</p>
            </motion.div>
          )}

          {isNotResume && error && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-8 flex flex-col items-center gap-4">
              <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 flex items-start gap-3 max-w-sm w-full">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-700">{error}</p>
              </div>
              <button type="button" onClick={onBack} className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-full text-sm font-medium transition-all">
                返回重新粘贴
              </button>
            </motion.div>
          )}

          {error && !isNotResume && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-8 flex flex-col items-center gap-4">
              <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 flex items-start gap-3 max-w-sm w-full">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
              {error.includes('VIP') || error.includes('升级会员') ? (
                <button
                  type="button"
                  onClick={() => setShowUpgrade?.(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  升级 VIP 无限使用
                </button>
              ) : (
                <button type="button" onClick={onRetry} className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all">
                  <Sparkles className="w-4 h-4" />
                  重新解析
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
              正在解析
            </div>
            <div className="w-px h-3.5 bg-gray-200" />
            <button type="button" onClick={onStop} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
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
// Sub-components
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

const FILE_PROGRESS_LABELS: readonly string[] = [
  '正在上传文件…',
  '正在识别内容…',
  'AI 解析结构中…',
  '即将完成…',
];

function FileProgressButton({ progress, stage }: { progress: number; stage: string }): React.ReactElement {
  const fallbackIdx = Math.min(Math.floor(progress / 25), FILE_PROGRESS_LABELS.length - 1);
  const label = stage || FILE_PROGRESS_LABELS[fallbackIdx];
  return (
    <div className="w-full rounded-2xl bg-violet-50 border border-violet-100 overflow-hidden relative h-[52px]">
      <motion.div
        className="absolute inset-y-0 left-0 bg-violet-200/60 rounded-2xl"
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
      <div className="absolute inset-0 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 text-violet-600 animate-spin relative z-10" />
        <AnimatePresence mode="wait">
          <motion.span
            key={label}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-sm font-semibold text-violet-700 relative z-10"
          >
            {label}
          </motion.span>
        </AnimatePresence>
        <span className="text-xs text-violet-600/70 tabular-nums relative z-10 ml-1">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}

const GENERATION_STEPS: readonly string[] = [
  '读取简历文本内容…',
  '识别姓名、联系方式…',
  '提取工作经历与项目…',
  '整理教育背景与技能…',
  '生成专业排版结构…',
];

function GenerationSteps(): React.ReactElement {
  const [activeStep, setActiveStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % GENERATION_STEPS.length);
    }, 2200);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col items-center gap-3">
      <AnimatePresence mode="wait">
        <motion.p
          key={activeStep}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="text-sm font-medium text-gray-700"
        >
          {GENERATION_STEPS[activeStep]}
        </motion.p>
      </AnimatePresence>
      <div className="flex gap-1.5">
        {GENERATION_STEPS.map((_, i) => (
          <motion.div
            key={i}
            className="h-1 rounded-full bg-violet-300"
            animate={{ width: i === activeStep ? 20 : 6, opacity: i === activeStep ? 1 : 0.35 }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-1">通常需要 10–20 秒，请稍候</p>
    </div>
  );
}
