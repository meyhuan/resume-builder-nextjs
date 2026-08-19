const DRAFT_KEY = 'interview-prep-draft';

export interface InterviewPrepDraft {
  jobDescription: string;
  resumeId?: string;
  savedAt: number;
}

export function saveInterviewPrepDraft(draft: InterviewPrepDraft): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Draft is best-effort; quota or private mode should not block generate.
  }
}

export function loadInterviewPrepDraft(): InterviewPrepDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<InterviewPrepDraft>;
    if (typeof parsed.jobDescription !== 'string') return null;
    return {
      jobDescription: parsed.jobDescription,
      resumeId: typeof parsed.resumeId === 'string' ? parsed.resumeId : undefined,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function clearInterviewPrepDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Ignore storage failures.
  }
}
