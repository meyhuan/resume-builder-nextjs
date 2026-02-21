/**
 * Extracts structured resume sections from streaming AI JSON output
 * for real-time display. Returns data ready for direct JSX rendering.
 *
 * Handles partial/incomplete JSON gracefully.
 */

export interface FieldItem {
  readonly label: string;
  readonly value: string;
}

export interface ExperienceItem {
  readonly name: string;
  readonly subtitle: string;
  readonly period: string;
  readonly lines: readonly string[];
}

export interface DisplaySection {
  readonly title: string;
  readonly type: 'fields' | 'text' | 'experience';
  readonly fields?: readonly FieldItem[];
  readonly text?: string;
  readonly items?: readonly ExperienceItem[];
}

const SECTION_TITLES: Record<string, string> = {
  base_info: '基本信息',
  job_intention: '求职意向',
  self_evaluation: '自我评价',
  experience: '工作经历',
  intern: '实习经历',
  education: '教育背景',
  program_experience: '项目经历',
  school_exps: '校园经历',
  skills: '专业技能',
  qualifications: '资质证书',
};

/**
 * Parse raw streaming JSON text into structured display sections.
 */
export function parseStreamSections(raw: string): readonly DisplaySection[] {
  const trimmed: string = raw.trim();
  if (!trimmed) return [];
  const sections: DisplaySection[] = [];
  for (const [key, title] of Object.entries(SECTION_TITLES)) {
    const section: DisplaySection | null = extractSection(trimmed, key, title);
    if (section) sections.push(section);
  }
  return sections;
}

function extractSection(raw: string, key: string, title: string): DisplaySection | null {
  const keyPattern = new RegExp(`"${key}"\\s*:\\s*`);
  const match: RegExpExecArray | null = keyPattern.exec(raw);
  if (!match) return null;
  const remaining: string = raw.slice(match.index + match[0].length);
  if (key === 'base_info') return buildFieldsSection(title, remaining, BASE_INFO_FIELDS);
  if (key === 'job_intention') return buildFieldsSection(title, remaining, JOB_INTENTION_FIELDS);
  if (key === 'self_evaluation' || key === 'skills' || key === 'qualifications') {
    return buildTextSection(title, remaining);
  }
  if (['experience', 'intern', 'education', 'program_experience', 'school_exps'].includes(key)) {
    return buildExperienceSection(title, remaining, key);
  }
  return null;
}

const BASE_INFO_FIELDS: Record<string, string> = {
  name: '姓名', gender: '性别', age: '年龄', phone: '手机', mail: '邮箱',
};

const JOB_INTENTION_FIELDS: Record<string, string> = {
  objective: '求职岗位', city: '意向城市', salary: '期望薪资', type: '求职类型',
};

function buildFieldsSection(
  title: string,
  raw: string,
  fieldMap: Record<string, string>,
): DisplaySection | null {
  const fields: FieldItem[] = [];
  for (const [jsonKey, label] of Object.entries(fieldMap)) {
    const value: string | null = extractStringField(raw, jsonKey);
    if (value) fields.push({ label, value });
  }
  return fields.length > 0 ? { title, type: 'fields', fields } : null;
}

function buildTextSection(title: string, raw: string): DisplaySection | null {
  const content: string | null = extractStringField(raw, 'content');
  if (!content) return null;
  return { title, type: 'text', text: stripHtml(content) };
}

function buildExperienceSection(
  title: string,
  raw: string,
  key: string,
): DisplaySection | null {
  const posField: string = key === 'education' ? 'major' : (key === 'school_exps' ? 'position' : 'position');
  const items: ExperienceItem[] = [];
  const itemPattern = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
  let itemMatch: RegExpExecArray | null = itemPattern.exec(raw);
  while (itemMatch) {
    const s: string = itemMatch[0];
    const name: string | null = extractStringField(s, 'name');
    const pos: string | null = extractStringField(s, posField);
    const content: string | null = extractStringField(s, key === 'education' ? 'course' : 'content');
    const period: string = formatPeriod(s);
    if (name) {
      items.push({
        name,
        subtitle: pos ?? '',
        period,
        lines: content ? splitLines(stripHtml(content)) : [],
      });
    }
    itemMatch = itemPattern.exec(raw);
  }
  return items.length > 0 ? { title, type: 'experience', items } : null;
}

function extractStringField(raw: string, field: string): string | null {
  const pattern = new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`);
  const match: RegExpExecArray | null = pattern.exec(raw);
  if (!match) return null;
  return match[1]
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function formatPeriod(raw: string): string {
  const start: string | null = extractStringField(raw, 'start');
  const end: string | null = extractStringField(raw, 'end');
  if (!start) return '';
  return `${start} - ${end ?? '至今'}`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<ul>/gi, '')
    .replace(/<\/ul>/gi, '')
    .replace(/<li>/gi, '')
    .replace(/<\/li>/gi, '\n')
    .replace(/<p>/gi, '')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitLines(text: string): readonly string[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean);
}
