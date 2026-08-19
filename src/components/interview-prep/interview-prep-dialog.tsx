'use client';

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  Copy,
  Download,
  FileText,
  MessageSquare,
  RotateCcw,
  Trash2,
  UserRound,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AiWaitingState, isAbortError } from '@/components/ai/ai-waiting-state';
import { WxLoginDialog } from '@/components/auth/WxLoginDialog';
import VipUpgradeDialog from '@/components/vip/vip-upgrade-dialog';
import type { ResumeData } from '@/entities/resume/resume-data';
import {
  createInterviewPrepHistoryId,
  deleteInterviewPrepHistory,
  listInterviewPrepHistory,
  resolveInterviewPrepAccountId,
  saveInterviewPrepHistory,
  type InterviewPrepHistoryItem,
} from '@/lib/ai/interview-prep-history';
import {
  clearInterviewPrepDraft,
  loadInterviewPrepDraft,
  saveInterviewPrepDraft,
} from '@/lib/ai/interview-prep-draft';
import {
  fetchInterviewPrepResume,
  listInterviewPrepResumes,
  type InterviewPrepResumeOption,
} from '@/lib/ai/interview-prep-resume';
import {
  MAX_INTERVIEW_PREP_JD_LENGTH,
  type InterviewPrepGreeting,
  type InterviewPrepOutput,
  type InterviewPrepQuestion,
} from '@/lib/ai/interview-prep-schema';
import { useAppStore } from '@/state/store';
import { useEditorUiStore } from '@/state/editor-ui-store';
import { useVipCheck } from '@/hooks/use-vip-check';
import { useRequireAuth } from '@/hooks/use-require-auth';
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

const WAITING_MESSAGES = [
  'AI 正在阅读你的简历…',
  '正在对照职位描述…',
  '正在写打招呼语和面试题…',
] as const;

const GREETING_LABEL: Record<InterviewPrepGreeting['style'], string> = {
  concise: '简洁',
  polite: '礼貌',
  highlight: '亮点',
};

const GREETING_BADGE_CLASS: Record<InterviewPrepGreeting['style'], string> = {
  concise: 'border-slate-200 bg-slate-100 text-slate-700',
  polite: 'border-sky-200 bg-sky-50 text-sky-700',
  highlight: 'border-amber-200 bg-amber-50 text-amber-800',
};

const CATEGORY_LABEL: Record<InterviewPrepQuestion['category'], string> = {
  hr: 'HR',
  professional: '专业',
  behavioral: '行为',
  project: '项目',
  weakness: '缺口',
};

const CATEGORY_BADGE_CLASS: Record<InterviewPrepQuestion['category'], string> = {
  hr: 'border-sky-200 bg-sky-50 text-sky-700',
  professional: 'border-violet-200 bg-violet-50 text-violet-700',
  behavioral: 'border-teal-200 bg-teal-50 text-teal-700',
  project: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  weakness: 'border-orange-200 bg-orange-50 text-orange-700',
};

const LOGIN_SUBTITLE = '登录后生成，结果会保存在账号里';

function formatDate(value: number): string {
  return new Date(value).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function CopyTextButton(props: { readonly text: string; readonly label?: string }): ReactElement {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (): Promise<void> => {
    await navigator.clipboard.writeText(props.text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => void handleCopy()}>
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? '已复制' : (props.label ?? '复制')}
    </Button>
  );
}

function formatInterviewPrepText(result: InterviewPrepOutput, jobDescription?: string): string {
  const lines: string[] = [];
  if (result.jobTitle) lines.push(`岗位：${result.jobTitle}`);
  if (result.summary) lines.push('', result.summary);
  if (jobDescription) lines.push('', '【职位描述】', jobDescription);
  if (result.greetings.length > 0) {
    lines.push('', '【BOSS 打招呼】');
    for (const greeting of result.greetings) {
      lines.push(`${GREETING_LABEL[greeting.style]}：${greeting.text}`);
    }
  }
  if (result.selfIntro30s) lines.push('', '【30 秒自我介绍】', result.selfIntro30s);
  if (result.selfIntro2min) lines.push('', '【2 分钟自我介绍】', result.selfIntro2min);
  if (result.questions.length > 0) {
    lines.push('', '【面试题】');
    result.questions.forEach((item, index) => {
      lines.push('', `${index + 1}. ${item.question}`);
      if (item.why) lines.push(`考察点：${item.why}`);
      if (item.experienceHint) lines.push(`结合经历：${item.experienceHint}`);
      if (item.starAnswer) lines.push(`建议答法：${item.starAnswer}`);
      if (item.followUps.length > 0) lines.push(`可能追问：${item.followUps.join(' / ')}`);
    });
  }
  if (result.gaps.length > 0) {
    lines.push('', '【面试缺口】');
    result.gaps.forEach((gap, index) => lines.push(`${index + 1}. ${gap}`));
  }
  if (result.coverLetter.content) {
    lines.push('', '【求职信】', result.coverLetter.title, result.coverLetter.content);
  }
  return lines.join('\n').trim();
}

function InterviewPrepResultView(props: {
  readonly result: InterviewPrepOutput;
  readonly jobDescription?: string;
}): ReactElement {
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(0);
  const [coverOpen, setCoverOpen] = useState(false);
  const [jdExpanded, setJdExpanded] = useState(false);

  return (
    <div className="space-y-6 px-6 py-4">
      {props.result.jobTitle ? (
        <p className="text-sm font-semibold text-slate-800">{props.result.jobTitle}</p>
      ) : null}
      {props.result.summary ? (
        <p className="text-sm leading-relaxed text-slate-600">{props.result.summary}</p>
      ) : null}

      {props.jobDescription ? (
        <div className="rounded-lg border border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={() => setJdExpanded((open) => !open)}
            className="flex w-full items-center gap-1.5 px-3.5 py-2.5 text-left"
          >
            <span className="flex-1 truncate text-sm font-semibold text-slate-800">职位描述</span>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${jdExpanded ? 'rotate-180' : ''}`} />
          </button>
          {jdExpanded ? (
            <div className="border-t border-slate-100 px-3.5 py-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{props.jobDescription}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {props.result.greetings.length > 0 ? (
        <div className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            <MessageSquare className="h-4 w-4 text-violet-500" />
            BOSS 打招呼
          </h4>
          <div className="space-y-2.5">
            {props.result.greetings.map((greeting) => (
              <div key={greeting.style} className="rounded-lg border border-slate-200 bg-white p-3.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge variant="outline" className={`text-xs ${GREETING_BADGE_CLASS[greeting.style]}`}>
                    {GREETING_LABEL[greeting.style]}
                  </Badge>
                  <CopyTextButton text={greeting.text} />
                </div>
                <p className="text-sm leading-relaxed text-slate-700">{greeting.text}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {(props.result.selfIntro30s || props.result.selfIntro2min) ? (
        <div className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            <UserRound className="h-4 w-4 text-violet-500" />
            自我介绍
          </h4>
          {props.result.selfIntro30s ? (
            <div className="rounded-lg border border-slate-200 bg-white p-3.5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">30 秒</span>
                <CopyTextButton text={props.result.selfIntro30s} />
              </div>
              <p className="text-sm leading-relaxed text-slate-700">{props.result.selfIntro30s}</p>
            </div>
          ) : null}
          {props.result.selfIntro2min ? (
            <div className="rounded-lg border border-slate-200 bg-white p-3.5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">2 分钟</span>
                <CopyTextButton text={props.result.selfIntro2min} />
              </div>
              <p className="text-sm leading-relaxed text-slate-700">{props.result.selfIntro2min}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {props.result.questions.length > 0 ? (
        <div className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            <ClipboardList className="h-4 w-4 text-violet-500" />
            面试题
          </h4>
          <div className="space-y-2">
            {props.result.questions.map((item, index) => {
              const open = expandedQuestion === index;
              return (
                <div key={`${item.question}-${index}`} className="rounded-lg border border-slate-200 bg-white">
                  <button
                    type="button"
                    className="flex w-full items-start gap-2 px-3.5 py-3 text-left"
                    onClick={() => setExpandedQuestion(open ? null : index)}
                  >
                    <Badge variant="outline" className={`mt-0.5 shrink-0 text-xs ${CATEGORY_BADGE_CLASS[item.category]}`}>
                      {CATEGORY_LABEL[item.category]}
                    </Badge>
                    <span className="flex-1 text-sm font-medium text-slate-800">{item.question}</span>
                    <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open ? (
                    <div className="space-y-2 border-t border-slate-100 px-3.5 py-3 text-sm text-slate-600">
                      {item.why ? <p><span className="font-medium text-slate-500">考察点：</span>{item.why}</p> : null}
                      {item.experienceHint ? <p><span className="font-medium text-slate-500">结合经历：</span>{item.experienceHint}</p> : null}
                      {item.starAnswer ? (
                        <div>
                          <div className="mb-1 flex items-center justify-between">
                            <span className="font-medium text-slate-500">建议答法</span>
                            <CopyTextButton text={item.starAnswer} />
                          </div>
                          <p className="leading-relaxed text-slate-700">{item.starAnswer}</p>
                        </div>
                      ) : null}
                      {item.followUps.length > 0 ? (
                        <p><span className="font-medium text-slate-500">可能追问：</span>{item.followUps.join(' / ')}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {props.result.gaps.length > 0 ? (
        <div className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            面试缺口
          </h4>
          <ul className="space-y-1.5 rounded-lg border border-orange-100 bg-orange-50/60 px-3.5 py-3">
            {props.result.gaps.map((gap) => (
              <li key={gap} className="text-sm leading-relaxed text-slate-700">· {gap}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {props.result.coverLetter.content ? (
        <div className="rounded-lg border border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={() => setCoverOpen((open) => !open)}
            className="flex w-full items-center gap-1.5 px-3.5 py-2.5 text-left"
          >
            <FileText className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="flex-1 text-sm font-semibold text-slate-800">求职信（邮箱投递备用）</span>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${coverOpen ? 'rotate-180' : ''}`} />
          </button>
          {coverOpen ? (
            <div className="space-y-2 border-t border-slate-100 px-3.5 py-3">
              <div className="flex justify-end">
                <CopyTextButton text={props.result.coverLetter.content} />
              </div>
              {props.result.coverLetter.title ? (
                <p className="text-sm font-medium text-slate-800">{props.result.coverLetter.title}</p>
              ) : null}
              <pre className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                {props.result.coverLetter.content}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export interface InterviewPrepDialogProps {
  readonly resumeId?: string;
  readonly resumeTitle?: string;
  readonly resume?: ResumeData;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly lockResume?: boolean;
  readonly resumeOptions?: InterviewPrepResumeOption[];
  readonly initialHistoryId?: string;
  readonly initialTab?: 'new' | 'history';
  readonly embedded?: boolean;
  readonly onHistoryChange?: () => void;
}

export function InterviewPrepDialog(props: InterviewPrepDialogProps): ReactElement {
  const isEditorBound = props.open === undefined;
  const editorOpen = useEditorUiStore((state) => state.activeModal === 'interview-prep');
  const closeModal = useEditorUiStore((state) => state.closeModal);
  const pendingJobDescription = useEditorUiStore((state) => state.pendingJobDescription);
  const clearPendingJobDescription = useEditorUiStore((state) => state.clearPendingJobDescription);
  const editorResume = useAppStore((state) => state.resume);
  const open = isEditorBound ? editorOpen : Boolean(props.open);
  const lockResume = isEditorBound ? true : Boolean(props.lockResume);
  const boundResume = isEditorBound ? editorResume : props.resume;
  const { requireAiFeature, refreshQuota, showUpgrade, setShowUpgrade } = useVipCheck();
  const { isLoginOpen, requireAuth, handleLoginSuccess, handleLoginClose } = useRequireAuth();

  const [jobDescription, setJobDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<InterviewPrepOutput | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [history, setHistory] = useState<InterviewPrepHistoryItem[]>([]);
  const [historyDetail, setHistoryDetail] = useState<InterviewPrepHistoryItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [resumeOptions, setResumeOptions] = useState<InterviewPrepResumeOption[]>(props.resumeOptions ?? []);
  const [selectedResumeId, setSelectedResumeId] = useState(props.resumeId ?? '');
  const [needsResumePick, setNeedsResumePick] = useState(false);
  const [emptyResumeHint, setEmptyResumeHint] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const jobDescriptionRef = useRef(jobDescription);
  const selectedResumeIdRef = useRef(selectedResumeId);
  const boundResumeRef = useRef(boundResume);
  const intendedPosition = (isEditorBound ? editorResume : boundResume)?.jobIntention?.position?.trim() ?? '';
  const hasJd = jobDescription.trim().length > 0;
  const historyFilterOptions = Array.from(
    new Map(history.map((item) => [item.resumeId, item.resumeTitle || '未命名简历'])).entries(),
  );
  const [historyResumeFilter, setHistoryResumeFilter] = useState<string>('all');
  const visibleHistory = historyResumeFilter === 'all'
    ? history
    : history.filter((item) => item.resumeId === historyResumeFilter);

  jobDescriptionRef.current = jobDescription;
  selectedResumeIdRef.current = selectedResumeId;
  boundResumeRef.current = boundResume;

  const loadHistory = useCallback(async () => {
    const wxId = resolveInterviewPrepAccountId();
    if (!wxId) {
      setHistory([]);
      return;
    }
    setHistory(await listInterviewPrepHistory(wxId));
  }, []);

  const loadResumeOptions = useCallback(async (): Promise<InterviewPrepResumeOption[]> => {
    if (props.resumeOptions && props.resumeOptions.length > 0) {
      setResumeOptions(props.resumeOptions);
      return props.resumeOptions;
    }
    const options = await listInterviewPrepResumes();
    setResumeOptions(options);
    return options;
  }, [props.resumeOptions]);

  useEffect(() => {
    if (props.resumeOptions) setResumeOptions(props.resumeOptions);
  }, [props.resumeOptions]);

  useEffect(() => {
    if (resumeOptions.length === 0) return;
    const selectedIsValid = selectedResumeId
      && resumeOptions.some((option) => option.id === selectedResumeId);
    if (selectedIsValid) return;
    if (props.resumeId && resumeOptions.some((option) => option.id === props.resumeId)) {
      setSelectedResumeId(props.resumeId);
      return;
    }
    if (resumeOptions.length === 1) {
      setSelectedResumeId(resumeOptions[0].id);
    }
  }, [props.resumeId, resumeOptions, selectedResumeId]);

  useEffect(() => {
    if (!open) return;
    void loadHistory();
    if (resolveInterviewPrepAccountId()) {
      void loadResumeOptions().catch(() => {
        setError('无法加载简历列表');
      });
    }
  }, [open, loadHistory, loadResumeOptions]);

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setError('');
    setCopied(false);
    setNeedsResumePick(false);
    setEmptyResumeHint(false);
    setHistoryDetail(null);
    const draft = loadInterviewPrepDraft();
    setJobDescription(draft?.jobDescription ?? '');
    if (draft?.resumeId && !lockResume && !props.resumeId) {
      setSelectedResumeId(draft.resumeId);
    }
    setActiveTab(props.initialTab ?? 'new');
  }, [open, lockResume, props.resumeId, props.initialTab]);

  useEffect(() => {
    if (!open || !props.initialHistoryId || history.length === 0) return;
    const match = history.find((item) => item.id === props.initialHistoryId);
    if (match) {
      setHistoryDetail(match);
      setActiveTab('history');
      setHistoryResumeFilter(match.resumeId);
    }
  }, [open, props.initialHistoryId, history]);

  useEffect(() => {
    if (!isEditorBound || !open || !pendingJobDescription) return;
    setJobDescription(pendingJobDescription);
    setResult(null);
    setError('');
    setActiveTab('new');
    setNeedsResumePick(false);
    setEmptyResumeHint(false);
    clearPendingJobDescription();
  }, [isEditorBound, open, pendingJobDescription, clearPendingJobDescription]);

  const handleCancel = useCallback((): void => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const resetTransientState = useCallback((): void => {
    setResult(null);
    setJobDescription('');
    setError('');
    setCopied(false);
    setActiveTab('new');
    setHistoryDetail(null);
    setNeedsResumePick(false);
    setEmptyResumeHint(false);
    if (!lockResume && !props.resumeId) setSelectedResumeId('');
    setHistoryResumeFilter('all');
  }, [lockResume, props.resumeId]);

  const handleClose = (): void => {
    handleCancel();
    if (isEditorBound) closeModal();
    else props.onOpenChange?.(false);
    window.setTimeout(() => {
      resetTransientState();
    }, 200);
  };

  const resolveResumeForGenerate = useCallback(async (): Promise<{
    resume: ResumeData;
    resumeId: string;
    resumeTitle: string;
  } | 'empty' | 'pick'> => {
    const selectedId = selectedResumeIdRef.current || props.resumeId || '';
    if (boundResumeRef.current) {
      const bound = boundResumeRef.current;
      const usesBoundResume = !selectedId
        || selectedId === props.resumeId
        || selectedId === bound.id;
      if (usesBoundResume) {
        return {
          resume: bound,
          resumeId: props.resumeId || bound.id || 'local',
          resumeTitle: props.resumeTitle || bound.name || '未命名简历',
        };
      }
    }

    const options = resumeOptions.length > 0 ? resumeOptions : await loadResumeOptions();
    if (options.length === 0) return 'empty';

    let targetId = selectedId;
    if (!targetId && options.length === 1) targetId = options[0].id;
    if (!targetId) return 'pick';

    const option = options.find((item) => item.id === targetId);
    if (!option) {
      return options.length === 1 ? {
        ...(await fetchInterviewPrepResume(options[0].id)),
        resumeId: options[0].id,
        resumeTitle: options[0].title,
      } : 'pick';
    }

    if (boundResumeRef.current && boundResumeRef.current.id === targetId) {
      return {
        resume: boundResumeRef.current,
        resumeId: targetId,
        resumeTitle: option.title,
      };
    }

    const fetched = await fetchInterviewPrepResume(targetId);
    return {
      resume: fetched.resume,
      resumeId: targetId,
      resumeTitle: fetched.title || option.title,
    };
  }, [loadResumeOptions, props.resumeId, props.resumeTitle, resumeOptions]);

  const runGenerate = useCallback(async (forcedResumeId?: string): Promise<void> => {
    const draft = loadInterviewPrepDraft();
    const jd = draft?.jobDescription ?? jobDescriptionRef.current;
    if (forcedResumeId) setSelectedResumeId(forcedResumeId);
    if (forcedResumeId) selectedResumeIdRef.current = forcedResumeId;
    else if (draft?.resumeId && !selectedResumeIdRef.current) {
      setSelectedResumeId(draft.resumeId);
      selectedResumeIdRef.current = draft.resumeId;
    }
    setJobDescription(jd);

    await refreshQuota();
    if (!requireAiFeature('aiEditorAssist')) {
      trackAssistBlocked('interview-prep');
      return;
    }

    const resolved = await resolveResumeForGenerate();
    if (resolved === 'empty') {
      setEmptyResumeHint(true);
      setNeedsResumePick(false);
      setIsGenerating(false);
      void loadHistory();
      return;
    }
    if (resolved === 'pick') {
      setNeedsResumePick(true);
      setEmptyResumeHint(false);
      setIsGenerating(false);
      void loadHistory();
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsGenerating(true);
    setNeedsResumePick(false);
    setEmptyResumeHint(false);
    setError('');
    try {
      trackAssistStart('interview-prep');
      const response = await fetch('/next-api/ai/interview-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData: resolved.resume, jobDescription: jd }),
        signal: controller.signal,
      });
      const data = await response.json() as InterviewPrepOutput & {
        error?: string;
        quotaExceeded?: boolean;
      };
      if (!response.ok) {
        const payload = parseAssistErrorPayload(data);
        if (!handleAssistQuotaError('interview-prep', payload)) {
          trackAssistFailed('interview-prep', data.error || '生成失败');
        }
        throw new Error(data.error || '生成失败');
      }
      setResult(data);
      trackAssistSuccess('interview-prep');
      refreshEditorAssistQuota();
      const wxId = resolveInterviewPrepAccountId();
      if (wxId) {
        const saved = await saveInterviewPrepHistory(wxId, {
          id: createInterviewPrepHistoryId(),
          createdAt: Date.now(),
          result: data,
          jobDescription: jd,
          resumeId: resolved.resumeId,
          resumeTitle: resolved.resumeTitle,
        });
        setHistory(saved);
        props.onHistoryChange?.();
      }
      clearInterviewPrepDraft();
    } catch (err) {
      if (isAbortError(err)) return;
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsGenerating(false);
    }
  }, [loadHistory, props, refreshQuota, requireAiFeature, resolveResumeForGenerate]);

  const handleGenerateClick = (): void => {
    saveInterviewPrepDraft({
      jobDescription: jobDescriptionRef.current,
      resumeId: selectedResumeIdRef.current || props.resumeId,
      savedAt: Date.now(),
    });
    setError('');
    requireAuth(() => {
      void runGenerate();
    });
  };

  const handlePickResume = (resumeId: string): void => {
    setSelectedResumeId(resumeId);
    selectedResumeIdRef.current = resumeId;
    saveInterviewPrepDraft({
      jobDescription: jobDescriptionRef.current,
      resumeId,
      savedAt: Date.now(),
    });
    setNeedsResumePick(false);
    requireAuth(() => {
      void runGenerate(resumeId);
    });
  };

  const handleCopyAll = async (): Promise<void> => {
    if (!result) return;
    await navigator.clipboard.writeText(formatInterviewPrepText(result, jobDescription));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (): void => {
    if (!result) return;
    const blob = new Blob([formatInterviewPrepText(result, jobDescription)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${result.jobTitle || '面试准备'}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const header = props.embedded ? null : (
    <DialogHeader className="px-6 pb-0 pt-6">
      <DialogTitle className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-violet-600" />
        面试准备
      </DialogTitle>
      <DialogDescription>
        根据当前简历生成打招呼语、自我介绍和面试题。粘贴 JD 会更针对目标岗位。
      </DialogDescription>
    </DialogHeader>
  );

  const body = (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'new' | 'history')} className="flex min-h-0 flex-1 flex-col gap-0">
      <div className={props.embedded ? 'px-6 pt-4' : 'px-6 pt-3'}>
        <TabsList className="w-full">
          <TabsTrigger value="new" className="flex-1" disabled={isGenerating}>新准备</TabsTrigger>
          <TabsTrigger value="history" className="flex-1 gap-1.5" disabled={isGenerating}>
            历史
            {history.length > 0 ? (
              <Badge className="ml-1 h-5 min-w-5 bg-violet-600 px-1 text-xs text-white">{history.length}</Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="new" className="flex min-h-0 flex-col">
        {isGenerating ? (
          <AiWaitingState
            messages={WAITING_MESSAGES}
            hint="通常需要 15–30 秒，请稍候"
            onCancel={handleCancel}
          />
        ) : !result ? (
          <div className="space-y-4 px-6 py-4">
            {resumeOptions.length > 0 && !emptyResumeHint ? (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">使用哪份简历</label>
                <select
                  value={selectedResumeId}
                  onChange={(event) => setSelectedResumeId(event.target.value)}
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
                >
                  {resumeOptions.length > 1 && !resumeOptions.some((option) => option.id === selectedResumeId) ? (
                    <option value="">请选择简历</option>
                  ) : null}
                  {resumeOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.title}</option>
                  ))}
                </select>
              </div>
            ) : null}
            <textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value.slice(0, MAX_INTERVIEW_PREP_JD_LENGTH))}
              rows={6}
              placeholder="选填。粘贴目标岗位 JD，打招呼和面试题会更准…"
              className="h-[160px] max-h-[160px] w-full resize-none overflow-y-auto rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
            {!hasJd ? (
              <p className="text-xs leading-5 text-slate-500">
                {intendedPosition
                  ? `未粘贴 JD，将按求职意向「${intendedPosition}」生成通用准备，打招呼和缺口会弱一些。`
                  : '未粘贴 JD，也未填写求职意向，将按当前简历做通用准备。贴上 JD 后会更针对岗位。'}
              </p>
            ) : null}
            {emptyResumeHint ? (
              <div className="space-y-3 rounded-lg border border-amber-100 bg-amber-50/70 px-3.5 py-3">
                <p className="text-sm text-slate-700">还没有简历，无法生成面试准备。职位描述已为你保留。</p>
                <div className="flex flex-wrap gap-2">
                  <Link href="/ai" className="inline-flex h-8 items-center rounded-md bg-violet-600 px-3 text-xs font-medium text-white hover:bg-violet-700">
                    AI 生成简历
                  </Link>
                  <Link href="/import" className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:border-violet-200 hover:text-violet-600">
                    导入简历
                  </Link>
                </div>
              </div>
            ) : null}
            {needsResumePick ? (
              <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3.5">
                <p className="text-sm font-medium text-slate-800">你有多份简历，请选择一份再生成</p>
                <div className="space-y-1.5">
                  {resumeOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-md border border-slate-100 px-3 py-2 text-left text-sm hover:border-violet-200 hover:bg-violet-50/50"
                      onClick={() => handlePickResume(option.id)}
                    >
                      <span className="truncate text-slate-800">{option.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {error ? (
              <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            ) : null}
            <div className="space-y-2">
              <div className="flex justify-end gap-2">
                {props.embedded ? null : <Button variant="outline" onClick={handleClose}>关闭</Button>}
                <Button
                  className="bg-violet-600 text-white hover:bg-violet-700"
                  onClick={handleGenerateClick}
                >
                  生成面试准备
                </Button>
              </div>
              <EditorAssistQuotaHint />
            </div>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <InterviewPrepResultView result={result} jobDescription={jobDescription} />
            </div>
            <div className="space-y-2 border-t border-slate-100 px-6 py-4">
              <div className="flex flex-wrap justify-end gap-2">
                {props.embedded ? null : <Button variant="outline" onClick={handleClose}>关闭</Button>}
                <Button variant="outline" className="gap-1.5" onClick={() => { setResult(null); setError(''); }}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  再生成
                </Button>
                <Button variant="outline" className="gap-1.5" onClick={() => void handleCopyAll()}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? '已复制' : '复制全文'}
                </Button>
                <Button className="gap-1.5 bg-violet-600 text-white hover:bg-violet-700" onClick={handleDownload}>
                  <Download className="h-3.5 w-3.5" />
                  下载 TXT
                </Button>
              </div>
              <EditorAssistQuotaHint />
            </div>
          </>
        )}
      </TabsContent>

      <TabsContent value="history" className="flex min-h-0 flex-col">
        {historyDetail ? (
          <>
            <div className="px-6 pt-2">
              <Button variant="ghost" size="sm" className="-ml-2 gap-1 text-slate-500" onClick={() => setHistoryDetail(null)}>
                <ChevronLeft className="h-4 w-4" />
                历史
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <InterviewPrepResultView result={historyDetail.result} jobDescription={historyDetail.jobDescription} />
            </div>
          </>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12">
            <ClipboardList className="mb-3 h-12 w-12 text-slate-300" />
            <p className="text-sm text-slate-500">还没有面试准备记录</p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-6 py-4">
            {historyFilterOptions.length > 1 ? (
              <div className="flex flex-wrap gap-1.5 pb-1">
                <button
                  type="button"
                  className={`rounded-full px-2.5 py-1 text-xs ${historyResumeFilter === 'all' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                  onClick={() => setHistoryResumeFilter('all')}
                >
                  全部
                </button>
                {historyFilterOptions.map(([id, title]) => (
                  <button
                    key={id}
                    type="button"
                    className={`max-w-[140px] truncate rounded-full px-2.5 py-1 text-xs ${historyResumeFilter === id ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                    onClick={() => setHistoryResumeFilter(id)}
                  >
                    {title}
                  </button>
                ))}
              </div>
            ) : null}
            {visibleHistory.map((item) => (
              <div
                key={item.id}
                className="group flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 bg-white p-3 hover:border-slate-200"
                onClick={() => setHistoryDetail(item)}
              >
                <ClipboardList className="h-4 w-4 shrink-0 text-violet-500" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{formatDate(item.createdAt)}</span>
                    {item.resumeTitle ? (
                      <Badge variant="secondary" className="max-w-[120px] truncate text-xs">{item.resumeTitle}</Badge>
                    ) : null}
                    {item.result.jobTitle ? (
                      <Badge variant="secondary" className="text-xs">{item.result.jobTitle}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-600">
                    {item.jobDescription?.trim() || item.result.jobTitle || '按简历生成的通用准备'}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-md p-1.5 text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    setDeleteId(item.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );

  const overlays = (
    <>
      <WxLoginDialog
        isOpen={isLoginOpen}
        onClose={handleLoginClose}
        onSuccess={() => {
          handleLoginSuccess();
          void loadResumeOptions().catch(() => undefined);
        }}
        subtitle={LOGIN_SUBTITLE}
      />
      <VipUpgradeDialog open={showUpgrade} onOpenChange={setShowUpgrade} />
      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(next) => { if (!next) setDeleteId(null); }}
        title="删除这条记录？"
        description="删除后无法恢复。"
        confirmText="删除"
        variant="destructive"
        onConfirm={() => {
          if (!deleteId) return;
          const wxId = resolveInterviewPrepAccountId();
          if (!wxId) return;
          void deleteInterviewPrepHistory(wxId, deleteId).then((next) => {
            setHistory(next);
            props.onHistoryChange?.();
          });
          if (historyDetail?.id === deleteId) setHistoryDetail(null);
          setDeleteId(null);
        }}
      />
    </>
  );

  if (props.embedded) {
    return (
      <>
        <section className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
          {header}
          {body}
        </section>
        {overlays}
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => { if (!next) handleClose(); }}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          {header}
          {body}
        </DialogContent>
      </Dialog>
      {overlays}
    </>
  );
}
