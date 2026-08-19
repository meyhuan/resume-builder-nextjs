import { get, set } from 'idb-keyval';
import { getCookie } from 'cookies-next';
import { useAuthStore } from '@/store/use-auth-store';
import type { InterviewPrepOutput } from '@/lib/ai/interview-prep-schema';

const MAX_ITEMS = 20;

export interface InterviewPrepHistoryItem {
  id: string;
  createdAt: number;
  result: InterviewPrepOutput;
  jobDescription?: string;
  resumeId: string;
  resumeTitle: string;
}

function storageKey(wxId: string): string {
  return `interview-prep-history:${wxId}`;
}

export function resolveInterviewPrepAccountId(): string | null {
  if (typeof window === 'undefined') return null;
  const cookie = getCookie('auth_uid');
  if (typeof cookie === 'string' && cookie.trim()) return cookie.trim();
  const token = useAuthStore.getState().token;
  return token?.trim() ? token.trim() : null;
}

export async function listInterviewPrepHistory(
  wxId: string,
): Promise<InterviewPrepHistoryItem[]> {
  if (!wxId) return [];
  const raw = await get(storageKey(wxId));
  return Array.isArray(raw) ? (raw as InterviewPrepHistoryItem[]) : [];
}

export async function saveInterviewPrepHistory(
  wxId: string,
  item: InterviewPrepHistoryItem,
): Promise<InterviewPrepHistoryItem[]> {
  const current = await listInterviewPrepHistory(wxId);
  const next = [item, ...current.filter((entry) => entry.id !== item.id)].slice(0, MAX_ITEMS);
  await set(storageKey(wxId), next);
  return next;
}

export async function deleteInterviewPrepHistory(
  wxId: string,
  id: string,
): Promise<InterviewPrepHistoryItem[]> {
  const current = await listInterviewPrepHistory(wxId);
  const next = current.filter((entry) => entry.id !== id);
  await set(storageKey(wxId), next);
  return next;
}

export function createInterviewPrepHistoryId(): string {
  return crypto.randomUUID();
}
