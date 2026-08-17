'use client';

import { useRef, useState, type ReactElement } from 'react';
import { AlertTriangle, Check, Copy, Download, FileText, RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LanguageSelect } from '@/components/ai/language-select';
import { AiWaitingState, isAbortError } from '@/components/ai/ai-waiting-state';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/state/store';
import { useEditorUiStore } from '@/state/editor-ui-store';
import { useVipCheck } from '@/hooks/use-vip-check';

type Tone = 'formal' | 'friendly' | 'confident';

const TONE_LABELS: Record<Tone, string> = {
  formal: '正式',
  friendly: '友好',
  confident: '自信',
};

const WAITING_MESSAGES = [
  'AI 正在阅读你的简历…',
  '正在理解目标岗位…',
  '正在撰写求职信…',
] as const;

export function CoverLetterDialog(): ReactElement {
  const open = useEditorUiStore((state) => state.activeModal === 'cover-letter');
  const closeModal = useEditorUiStore((state) => state.closeModal);
  const resume = useAppStore((state) => state.resume);
  const { requireAi } = useVipCheck();
  const [jobDescription, setJobDescription] = useState('');
  const [tone, setTone] = useState<Tone>('formal');
  const [language, setLanguage] = useState('zh');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ title: string; content: string } | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleCancel = (): void => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  const handleClose = (): void => {
    handleCancel();
    closeModal();
    window.setTimeout(() => {
      setResult(null);
      setJobDescription('');
      setTone('formal');
      setLanguage('zh');
      setError('');
      setCopied(false);
    }, 200);
  };

  const handleGenerate = async (): Promise<void> => {
    if (!jobDescription.trim() || !requireAi()) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsGenerating(true);
    setError('');
    try {
      const response = await fetch('/next-api/ai/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData: resume, jobDescription, tone, language }),
        signal: controller.signal,
      });
      const data = await response.json() as { title?: string; content?: string; error?: string };
      if (!response.ok) throw new Error(data.error || '生成失败');
      setResult({ title: data.title || '求职信', content: data.content || '' });
    } catch (err) {
      if (isAbortError(err)) return;
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsGenerating(false);
    }
  };

  const handleCopy = async (): Promise<void> => {
    if (!result) return;
    await navigator.clipboard.writeText(result.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (): void => {
    if (!result) return;
    const blob = new Blob([result.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${result.title || 'cover-letter'}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) handleClose(); }}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="px-6 pb-0 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-violet-600" />
            求职信
          </DialogTitle>
          <DialogDescription>根据当前简历和目标 JD 生成一封求职信。</DialogDescription>
        </DialogHeader>

        {isGenerating ? (
          <AiWaitingState
            messages={WAITING_MESSAGES}
            hint="通常需要 10–20 秒，请稍候"
            onCancel={handleCancel}
          />
        ) : !result ? (
          <div className="space-y-4 px-6 py-4">
            <textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              rows={6}
              placeholder="粘贴目标岗位的职位描述…"
              className="h-[160px] max-h-[160px] w-full resize-none overflow-y-auto rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">语气</label>
              <div className="flex gap-2">
                {(Object.keys(TONE_LABELS) as Tone[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                      tone === item
                        ? 'border-violet-500 bg-violet-50 text-violet-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300',
                    )}
                    onClick={() => setTone(item)}
                  >
                    {TONE_LABELS[item]}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">语言</label>
              <LanguageSelect value={language} onValueChange={setLanguage} />
            </div>
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
                onClick={() => void handleGenerate()}
              >
                生成求职信
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="max-h-[50vh] overflow-y-auto px-6 py-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">{result.title}</h3>
              <pre className="whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700">
                {result.content}
              </pre>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <Button variant="outline" onClick={handleClose}>关闭</Button>
              <Button variant="outline" className="gap-1.5" onClick={() => { setResult(null); setError(''); }}>
                <RotateCcw className="h-3.5 w-3.5" />
                再生成
              </Button>
              <Button variant="outline" className="gap-1.5" onClick={() => void handleCopy()}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? '已复制' : '复制'}
              </Button>
              <Button className="gap-1.5 bg-violet-600 text-white hover:bg-violet-700" onClick={handleDownload}>
                <Download className="h-3.5 w-3.5" />
                下载 TXT
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
