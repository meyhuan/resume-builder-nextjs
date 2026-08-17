import { useAppStore } from '@/state/store';
import { sanitizeResumeHtml } from '@/lib/ai/html-sanitize';
import type { ResumeBlock } from '@/entities/blocks/resume-block';
import type { ResumeData } from '@/entities/resume/resume-data';
import type { BaseInfo } from '@/entities/user/base-info';
import type { JobIntention } from '@/entities/user/job-intention';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function sanitizeBlock(block: ResumeBlock, incoming: unknown): ResumeBlock {
  const record = asRecord(incoming);
  if (!record) return block;
  const next = { ...block } as ResumeBlock & Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    if (key === 'id' || key === 'type') continue;
    if (typeof value === 'string') {
      next[key] = key.toLowerCase().includes('html') ? sanitizeResumeHtml(value) : value;
    }
  }
  const incomingItems = record.items;
  if (block.type === 'list' && Array.isArray(incomingItems)) {
    next.items = block.items.map((item, index) => {
      const translated = asRecord(incomingItems[index]);
      const html = typeof translated?.html === 'string' ? sanitizeResumeHtml(translated.html) : item.html;
      return { ...item, html };
    });
  }
  return next as ResumeBlock;
}

export function applyTranslatedHeader(payload: {
  name?: string;
  baseInfo?: Record<string, unknown>;
  jobIntention?: Record<string, unknown>;
  language?: string;
}): void {
  useAppStore.getState().setResume((draft) => {
    if (payload.language) draft.language = payload.language;
    if (payload.name) draft.name = payload.name;
    if (payload.baseInfo && draft.baseInfo) {
      draft.baseInfo = {
        ...draft.baseInfo,
        ...(payload.baseInfo as Partial<BaseInfo>),
        avatarUrl: draft.baseInfo.avatarUrl,
      };
    }
    if (payload.jobIntention && draft.jobIntention) {
      draft.jobIntention = {
        ...draft.jobIntention,
        ...(payload.jobIntention as Partial<JobIntention>),
      };
    }
  });
}

export function applyTranslatedSection(payload: {
  sectionId: string;
  title?: string;
  blocks?: unknown[];
}): void {
  useAppStore.getState().setResume((draft) => {
    const section = draft.sections.find((item) => item.id === payload.sectionId);
    if (!section) return;
    if (payload.title) section.title = payload.title;
    if (!payload.blocks) return;
    const byId = new Map<string, unknown>();
    for (const item of payload.blocks) {
      const record = asRecord(item);
      const id = typeof record?.id === 'string' ? record.id : typeof record?.blockId === 'string' ? record.blockId : '';
      if (id) byId.set(id, item);
    }
    section.blocks = section.blocks.map((block) => sanitizeBlock(block, byId.get(block.id)));
  });
}

export function cloneResumeData(resume: ResumeData): ResumeData {
  return JSON.parse(JSON.stringify(resume)) as ResumeData;
}

export function applyTranslatedSectionToClone(
  resume: ResumeData,
  payload: { sectionId: string; title?: string; blocks?: unknown[] },
): ResumeData {
  const next = cloneResumeData(resume);
  const section = next.sections.find((item) => item.id === payload.sectionId);
  if (!section) return next;
  if (payload.title) section.title = payload.title;
  if (!payload.blocks) return next;
  const byId = new Map<string, unknown>();
  for (const item of payload.blocks) {
    const record = asRecord(item);
    const id = typeof record?.id === 'string' ? record.id : typeof record?.blockId === 'string' ? record.blockId : '';
    if (id) byId.set(id, item);
  }
  section.blocks = section.blocks.map((block) => sanitizeBlock(block, byId.get(block.id)));
  return next;
}

export function applyTranslatedHeaderToClone(
  resume: ResumeData,
  payload: { name?: string; baseInfo?: Record<string, unknown>; jobIntention?: Record<string, unknown>; language?: string },
): ResumeData {
  const next = cloneResumeData(resume);
  if (payload.language) next.language = payload.language;
  if (payload.name) next.name = payload.name;
  if (payload.baseInfo && next.baseInfo) {
    next.baseInfo = {
      ...next.baseInfo,
      ...(payload.baseInfo as Partial<BaseInfo>),
      avatarUrl: next.baseInfo.avatarUrl,
    };
  }
  if (payload.jobIntention && next.jobIntention) {
    next.jobIntention = {
      ...next.jobIntention,
      ...(payload.jobIntention as Partial<JobIntention>),
    };
  }
  return next;
}
