'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InterviewPrepDialog } from '@/components/interview-prep/interview-prep-dialog';
import {
  listInterviewPrepHistory,
  resolveInterviewPrepAccountId,
  type InterviewPrepHistoryItem,
} from '@/lib/ai/interview-prep-history';
import type { InterviewPrepResumeOption } from '@/lib/ai/interview-prep-resume';

interface InterviewPrepDashboardContextValue {
  hasHistory: (resumeId: string) => boolean;
  openGenerate: (resumeId: string, resumeTitle: string) => void;
  openView: (resumeId: string, resumeTitle: string) => void;
}

const InterviewPrepDashboardContext = createContext<InterviewPrepDashboardContextValue | null>(null);

export function useInterviewPrepDashboard(): InterviewPrepDashboardContextValue {
  const value = useContext(InterviewPrepDashboardContext);
  if (!value) {
    throw new Error('useInterviewPrepDashboard must be used within InterviewPrepDashboardProvider');
  }
  return value;
}

interface InterviewPrepDashboardProviderProps {
  readonly resumes: InterviewPrepResumeOption[];
  readonly children: ReactNode;
}

async function loadCurrentInterviewPrepHistory(): Promise<InterviewPrepHistoryItem[]> {
  const wxId = resolveInterviewPrepAccountId();
  return wxId ? listInterviewPrepHistory(wxId) : [];
}

export function InterviewPrepDashboardProvider(
  props: InterviewPrepDashboardProviderProps,
): ReactElement {
  const [history, setHistory] = useState<InterviewPrepHistoryItem[]>([]);
  const [open, setOpen] = useState(false);
  const [resumeId, setResumeId] = useState<string | undefined>();
  const [resumeTitle, setResumeTitle] = useState<string | undefined>();
  const [lockResume, setLockResume] = useState(false);
  const [initialTab, setInitialTab] = useState<'new' | 'history'>('new');
  const [initialHistoryId, setInitialHistoryId] = useState<string | undefined>();

  const reloadHistory = useCallback(async () => {
    setHistory(await loadCurrentInterviewPrepHistory());
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadCurrentInterviewPrepHistory().then((items) => {
      if (!cancelled) setHistory(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasHistory = useCallback((id: string): boolean => {
    return history.some((item) => item.resumeId === id);
  }, [history]);

  const openGenerate = useCallback((id: string, title: string): void => {
    setResumeId(id);
    setResumeTitle(title);
    setLockResume(true);
    setInitialTab('new');
    setInitialHistoryId(undefined);
    setOpen(true);
  }, []);

  const openView = useCallback((id: string, title: string): void => {
    const latest = history.find((item) => item.resumeId === id);
    setResumeId(id);
    setResumeTitle(title);
    setLockResume(true);
    setInitialTab('history');
    setInitialHistoryId(latest?.id);
    setOpen(true);
  }, [history]);

  const value = useMemo<InterviewPrepDashboardContextValue>(() => ({
    hasHistory,
    openGenerate,
    openView,
  }), [hasHistory, openGenerate, openView]);

  return (
    <InterviewPrepDashboardContext.Provider value={value}>
      {props.children}
      <InterviewPrepDialog
        key={open ? `${resumeId ?? 'none'}-${initialTab}-${initialHistoryId ?? 'none'}` : 'closed'}
        open={open}
        onOpenChange={setOpen}
        resumeId={resumeId}
        resumeTitle={resumeTitle}
        lockResume={lockResume}
        resumeOptions={props.resumes}
        initialTab={initialTab}
        initialHistoryId={initialHistoryId}
        onHistoryChange={() => { void reloadHistory(); }}
      />
    </InterviewPrepDashboardContext.Provider>
  );
}

export function InterviewPrepCardButton(props: {
  readonly resumeId: string;
  readonly resumeTitle: string;
}): ReactElement {
  const { hasHistory, openGenerate, openView } = useInterviewPrepDashboard();
  const viewed = hasHistory(props.resumeId);
  const label = viewed ? '查看面试准备' : '面试准备';
  return (
    <Button
      type="button"
      variant="outline"
      title={label}
      aria-label={label}
      className={
        viewed
          ? 'h-8 w-full gap-1.5 rounded-md border-violet-200 bg-violet-50/70 text-xs font-medium text-violet-700 shadow-none hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800'
          : 'h-8 w-full gap-1.5 rounded-md border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 shadow-none hover:border-violet-200 hover:bg-violet-50/60 hover:text-violet-700'
      }
      onClick={() => {
        if (viewed) openView(props.resumeId, props.resumeTitle);
        else openGenerate(props.resumeId, props.resumeTitle);
      }}
    >
      <ClipboardList className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
