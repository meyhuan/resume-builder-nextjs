import type { ResumeData } from '@/entities/resume/resume-data';
import { toResumeContext } from '@/lib/ai/resume-context';
import {
  getBaseInfoFieldLabel,
  getJobIntentionFieldLabel,
  getJobIntentionSectionTitle,
} from '@/lib/resume-ui-labels';

type ParsedPath =
  | { readonly kind: 'name' }
  | { readonly kind: 'jobIntention'; readonly field?: string }
  | { readonly kind: 'baseInfo'; readonly field?: string }
  | { readonly kind: 'section'; readonly sectionIndex: number; readonly blockIndex?: number };

const SECTION_ALIASES: Record<string, string> = {
  jobintention: 'jobIntention',
  job_intention: 'jobIntention',
  baseinfo: 'baseInfo',
  base_info: 'baseInfo',
  personalinfo: 'baseInfo',
  personal_info: 'baseInfo',
  workexperience: 'experience',
  work_experience: 'experience',
  experience: 'experience',
  project: 'project',
  projects: 'project',
  education: 'education',
  skills: 'skills',
  summary: 'summary',
  selfevaluation: 'summary',
  self_evaluation: 'summary',
  campus: 'campus',
};

const TYPE_LABELS: Record<string, string> = {
  experience: '工作经历',
  project: '项目经历',
  education: '教育经历',
  campus: '校园经历',
  skills: '专业技能',
  summary: '自我评价',
};

function parseResumePath(value: string): ParsedPath | null {
  if (/^name$/i.test(value)) return { kind: 'name' };

  const job = value.match(/^jobIntention(?:\.(\w+))?$/i);
  if (job) return { kind: 'jobIntention', field: job[1] };

  const base = value.match(/^baseInfo(?:\.(\w+))?$/i);
  if (base) return { kind: 'baseInfo', field: base[1] };

  const indexed = value.match(/^sections\[(\d+)\](?:\.blocks\[(\d+)\])?(?:\.\w+)?$/i);
  if (indexed) {
    return {
      kind: 'section',
      sectionIndex: Number(indexed[1]),
      blockIndex: indexed[2] == null ? undefined : Number(indexed[2]),
    };
  }

  const dotted = value.match(/^sections\.(\d+)(?:\.blocks\.(\d+))?(?:\.\w+)?$/i);
  if (dotted) {
    return {
      kind: 'section',
      sectionIndex: Number(dotted[1]),
      blockIndex: dotted[2] == null ? undefined : Number(dotted[2]),
    };
  }

  return null;
}

function looksLikeCodePath(value: string): boolean {
  if (/[\u4e00-\u9fff]/.test(value)) return false;
  return /[.\[]/.test(value)
    || /^(jobIntention|baseInfo|sections)\b/i.test(value)
    || /^[a-z]+(?:[A-Z][a-z]+)+$/.test(value);
}

/**
 * Turn model-emitted JSON paths / field keys into human-readable section labels.
 */
export function formatJdSuggestionSection(
  section: string,
  resume: ResumeData,
  blockId?: string,
): string {
  const trimmed = section.trim();
  if (!trimmed) return '简历内容';

  const ctx = toResumeContext(resume);
  const language = resume.language;

  if (blockId) {
    for (const sec of ctx.sections) {
      const block = sec.blocks.find((item) => item.blockId === blockId);
      if (!block) continue;
      return block.label && block.label !== sec.title
        ? `${sec.title} · ${block.label}`
        : sec.title;
    }
  }

  const path = parseResumePath(trimmed);
  if (path?.kind === 'name') return '姓名';
  if (path?.kind === 'jobIntention') {
    const title = getJobIntentionSectionTitle(language);
    if (!path.field) return title;
    const field = getJobIntentionFieldLabel(path.field, language);
    return field !== path.field ? `${title} · ${field}` : title;
  }
  if (path?.kind === 'baseInfo') {
    if (!path.field) return '个人信息';
    const field = getBaseInfoFieldLabel(path.field, language);
    return field !== path.field ? `个人信息 · ${field}` : '个人信息';
  }
  if (path?.kind === 'section') {
    const sec = ctx.sections[path.sectionIndex];
    if (!sec) return '简历内容';
    if (path.blockIndex == null) return sec.title || '简历内容';
    const block = sec.blocks[path.blockIndex];
    if (!block) return sec.title || '简历内容';
    return block.label ? `${sec.title} · ${block.label}` : sec.title;
  }

  const alias = SECTION_ALIASES[trimmed.toLowerCase().replace(/[\s-]/g, '_')];
  if (alias === 'jobIntention') return getJobIntentionSectionTitle(language);
  if (alias === 'baseInfo') return '个人信息';
  if (alias && TYPE_LABELS[alias]) {
    const found = ctx.sections.find((sec) => (
      sec.blocks.some((block) => block.type === alias)
      || sec.title.includes(TYPE_LABELS[alias])
    ));
    return found?.title || TYPE_LABELS[alias];
  }

  if (!looksLikeCodePath(trimmed)) return trimmed;

  const last = trimmed.split(/[.\[\]]+/).filter((part) => part && !/^\d+$/.test(part)).pop() ?? trimmed;
  if (last === 'content' || last === 'label' || last === 'title' || last === 'html') {
    return '简历内容';
  }
  const lastAlias = SECTION_ALIASES[last.toLowerCase()];
  if (lastAlias === 'jobIntention') return getJobIntentionSectionTitle(language);
  if (lastAlias === 'baseInfo') return '个人信息';
  if (lastAlias && TYPE_LABELS[lastAlias]) return TYPE_LABELS[lastAlias];

  return trimmed;
}
