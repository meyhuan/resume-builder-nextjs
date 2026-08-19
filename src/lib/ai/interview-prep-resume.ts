import { extractEditorMeta } from '@/entities/editor/editor-meta';
import type { ResumeData } from '@/entities/resume/resume-data';
import { normalizeResumeContent } from '@/entities/resume/normalize-resume-content';
import { toExternalResume } from '@/features/migration/java-resume-converter';
import { mapExternalResume } from '@/io/external-resume-importer';

export interface InterviewPrepResumeOption {
  id: string;
  title: string;
}

interface ResumeListRow {
  id?: unknown;
  title?: unknown;
}

interface ResumeDetailRow {
  id?: unknown;
  title?: unknown;
  content?: unknown;
}

export function parseStoredResumeContent(raw: unknown, fallbackId: string): ResumeData {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return normalizeResumeContent({}, { fallbackId });
  }
  const obj = raw as Record<string, unknown>;
  const isJavaFormat = obj.base_info !== undefined || !Array.isArray(obj.sections);
  if (isJavaFormat) {
    return mapExternalResume(toExternalResume(obj));
  }
  const { content } = extractEditorMeta(obj);
  return normalizeResumeContent(content as Partial<ResumeData>, { fallbackId });
}

export async function listInterviewPrepResumes(): Promise<InterviewPrepResumeOption[]> {
  const response = await fetch('/next-api/resumes');
  if (response.status === 401) return [];
  if (!response.ok) throw new Error('无法加载简历列表');
  const data = await response.json() as unknown;
  if (!Array.isArray(data)) return [];
  return data.flatMap((row: ResumeListRow): InterviewPrepResumeOption[] => {
    if (typeof row.id !== 'string' || !row.id) return [];
    return [{
      id: row.id,
      title: typeof row.title === 'string' && row.title.trim() ? row.title.trim() : '未命名简历',
    }];
  });
}

export async function fetchInterviewPrepResume(
  resumeId: string,
): Promise<{ resume: ResumeData; title: string }> {
  const response = await fetch(`/next-api/resumes/${resumeId}`);
  if (response.status === 401) throw new Error('请先登录');
  if (response.status === 404) throw new Error('简历不存在或已删除');
  if (!response.ok) throw new Error('无法加载简历');
  const data = await response.json() as ResumeDetailRow;
  const id = typeof data.id === 'string' && data.id ? data.id : resumeId;
  const title = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : '未命名简历';
  return {
    resume: parseStoredResumeContent(data.content, id),
    title,
  };
}
