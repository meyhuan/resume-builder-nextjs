'use client';

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { AlertCircle, CheckCircle2, FileEdit, FilePlus2, Languages, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LanguageSelect } from '@/components/ai/language-select';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/state/store';
import { useEditorUiStore } from '@/state/editor-ui-store';
import { useVipCheck } from '@/hooks/use-vip-check';
import {
  handleAssistQuotaError,
  parseAssistErrorPayload,
  trackAssistBlocked,
  trackAssistFailed,
  trackAssistStart,
  trackAssistSuccess,
  refreshEditorAssistQuota,
} from '@/lib/ai/assist-client';
import { EditorAssistQuotaHint } from '@/components/ai/editor-assist-quota-hint';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  applyTranslatedHeader,
  applyTranslatedHeaderToClone,
  applyTranslatedSection,
  applyTranslatedSectionToClone,
  cloneResumeData,
} from '@/lib/ai/apply-translated-section';
import type { ResumeData } from '@/entities/resume/resume-data';

type TranslateMode = 'overwrite' | 'copy';
type TranslateState = 'idle' | 'translating' | 'success' | 'error';

async function readNDJSON(
  response: Response,
  onLine: (data: Record<string, unknown>) => void,
): Promise<void> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      onLine(JSON.parse(line) as Record<string, unknown>);
    }
  }
  if (buffer.trim()) onLine(JSON.parse(buffer) as Record<string, unknown>);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

export function TranslateDialog(props: {
  readonly resumeId?: string;
  readonly template: string;
}): ReactElement {
  const open = useEditorUiStore((state) => state.activeModal === 'translate');
  const closeModal = useEditorUiStore((state) => state.closeModal);
  const { requireAiFeature } = useVipCheck();
  const router = useRouter();
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [mode, setMode] = useState<TranslateMode>('overwrite');
  const [state, setState] = useState<TranslateState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [failedCount, setFailedCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      setState('idle');
      setErrorMessage('');
      setProgress({ completed: 0, total: 0 });
      setFailedCount(0);
      setMode('overwrite');
      setTargetLanguage('en');
    } else {
      abortRef.current?.abort();
      abortRef.current = null;
    }
  }, [open]);

  const handleTranslate = useCallback(async () => {
    if (!requireAiFeature('aiEditorAssist')) {
      trackAssistBlocked('translate');
      return;
    }
    setState('translating');
    setErrorMessage('');
    setProgress({ completed: 0, total: 0 });
    setFailedCount(0);
    const controller = new AbortController();
    abortRef.current = controller;
    let working = cloneResumeData(useAppStore.getState().resume);

    try {
      trackAssistStart('translate');
      const response = await fetch('/next-api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeData: useAppStore.getState().resume,
          targetLanguage,
          mode,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string; quotaExceeded?: boolean };
        const payload = parseAssistErrorPayload(data);
        if (!handleAssistQuotaError('translate', payload)) {
          trackAssistFailed('translate', data.error || '翻译失败');
        }
        throw new Error(data.error || '翻译失败');
      }

      await readNDJSON(response, (data) => {
        if (data.type === 'progress') {
          setProgress({
            completed: Number(data.completed) || 0,
            total: Number(data.total) || 0,
          });
          const unit = data.unit;
          if (!isRecord(unit)) return;
          if (unit.kind === 'header') {
            const header = {
              name: typeof unit.name === 'string' ? unit.name : undefined,
              baseInfo: isRecord(unit.baseInfo) ? unit.baseInfo : undefined,
              jobIntention: isRecord(unit.jobIntention) ? unit.jobIntention : undefined,
              language: targetLanguage,
            };
            if (mode === 'overwrite') applyTranslatedHeader(header);
            else working = applyTranslatedHeaderToClone(working, header);
            return;
          }
          if (typeof unit.sectionId === 'string') {
            const section = {
              sectionId: unit.sectionId,
              title: typeof unit.title === 'string' ? unit.title : undefined,
              blocks: Array.isArray(unit.blocks) ? unit.blocks : undefined,
            };
            if (mode === 'overwrite') applyTranslatedSection(section);
            else working = applyTranslatedSectionToClone(working, section);
          }
        } else if (data.type === 'done') {
          setFailedCount(Number(data.failedCount) || 0);
          setState('success');
          trackAssistSuccess('translate');
          refreshEditorAssistQuota();
          if (mode === 'overwrite') {
            applyTranslatedHeader({ language: targetLanguage });
          } else {
            working = applyTranslatedHeaderToClone(working, { language: targetLanguage });
          }
          if (mode === 'copy') {
            void createCopiedResume(working, props.template, targetLanguage)
              .then((id) => {
                closeModal();
                router.push(`/editor/${id}`);
              })
              .catch((error: unknown) => {
                setState('error');
                setErrorMessage(error instanceof Error ? error.message : '复制简历失败');
              });
          } else {
            window.setTimeout(() => closeModal(), 1200);
          }
        }
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setState('error');
      setErrorMessage(error instanceof Error ? error.message : '翻译失败');
    }
  }, [closeModal, mode, props.template, requireAiFeature, router, targetLanguage]);

  const progressPercent = progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && state !== 'translating') closeModal(); }}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="px-6 pb-0 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5 text-violet-600" />
            翻译简历
          </DialogTitle>
          <DialogDescription>将简历翻译为另一种语言，可覆盖当前版本或另存副本。</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          {state === 'idle' ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">目标语言</label>
                <LanguageSelect value={targetLanguage} onValueChange={setTargetLanguage} />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {([
                  { value: 'overwrite' as const, label: '覆盖当前', desc: '直接改这份简历', icon: <FileEdit className="h-4 w-4" /> },
                  { value: 'copy' as const, label: '另存副本', desc: '生成一份新简历', icon: <FilePlus2 className="h-4 w-4" /> },
                ]).map((option) => {
                  const active = mode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setMode(option.value)}
                      className={cn(
                        'relative flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 text-center transition-all',
                        active ? 'border-violet-500 bg-violet-50' : 'border-slate-200 bg-white hover:border-slate-300',
                      )}
                    >
                      <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', active ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500')}>
                        {option.icon}
                      </span>
                      <span className={cn('text-sm font-semibold', active ? 'text-violet-700' : 'text-slate-700')}>{option.label}</span>
                      <span className="text-[11px] leading-tight text-slate-400">{option.desc}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {state === 'translating' ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-violet-600" />
              <p className="mb-3 text-sm font-medium text-slate-700">
                {progress.total > 0 ? `正在翻译 ${progress.completed}/${progress.total}` : '正在翻译…'}
              </p>
              {progress.total > 0 ? (
                <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
              ) : null}
            </div>
          ) : null}

          {state === 'success' ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CheckCircle2 className="mb-3 h-8 w-8 text-green-500" />
              <p className="text-sm font-medium text-slate-700">
                {failedCount > 0 ? `已完成，${failedCount} 个模块失败` : '翻译完成'}
              </p>
            </div>
          ) : null}

          {state === 'error' ? (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <AlertCircle className="mb-3 h-8 w-8 text-red-500" />
              <p className="text-sm font-medium text-red-600">{errorMessage || '翻译失败'}</p>
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex-col items-stretch gap-2 border-t border-slate-100 px-6 py-4 sm:flex-col">
          {state === 'idle' || state === 'error' ? (
            <>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeModal}>关闭</Button>
                <Button className="bg-violet-600 text-white hover:bg-violet-700" onClick={() => void handleTranslate()}>
                  翻译全部
                </Button>
              </div>
              <EditorAssistQuotaHint />
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function createCopiedResume(
  resume: ResumeData,
  template: string,
  language: string,
): Promise<string> {
  const response = await fetch('/next-api/resumes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: `${resume.name || '未命名简历'}-${language}`,
      content: resume,
      template,
    }),
  });
  const data = await response.json() as { id?: string; error?: string };
  if (!response.ok || !data.id) {
    toast.error(data.error || '复制简历失败，请先登录');
    throw new Error(data.error || '复制简历失败');
  }
  return data.id;
}
