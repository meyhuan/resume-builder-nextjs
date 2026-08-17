import { get, set } from 'idb-keyval';

const MAX_ITEMS = 20;

export interface AnalysisHistoryItem<T> {
  id: string;
  createdAt: number;
  result: T;
  jobDescription?: string;
  overallScore?: number;
  atsScore?: number;
  score?: number;
  issueCount?: number;
}

function storageKey(kind: string, resumeId: string): string {
  return `${kind}-history:${resumeId}`;
}

export async function listAnalysisHistory<T>(
  kind: string,
  resumeId: string,
): Promise<AnalysisHistoryItem<T>[]> {
  const raw = await get(storageKey(kind, resumeId));
  return Array.isArray(raw) ? (raw as AnalysisHistoryItem<T>[]) : [];
}

export async function saveAnalysisHistory<T>(
  kind: string,
  resumeId: string,
  item: AnalysisHistoryItem<T>,
): Promise<AnalysisHistoryItem<T>[]> {
  const current = await listAnalysisHistory<T>(kind, resumeId);
  const next = [item, ...current.filter((entry) => entry.id !== item.id)].slice(0, MAX_ITEMS);
  await set(storageKey(kind, resumeId), next);
  return next;
}

export async function deleteAnalysisHistory<T>(
  kind: string,
  resumeId: string,
  id: string,
): Promise<AnalysisHistoryItem<T>[]> {
  const current = await listAnalysisHistory<T>(kind, resumeId);
  const next = current.filter((entry) => entry.id !== id);
  await set(storageKey(kind, resumeId), next);
  return next;
}

export function createHistoryId(): string {
  return crypto.randomUUID();
}
