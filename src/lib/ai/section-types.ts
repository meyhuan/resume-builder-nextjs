/**
 * Types and constants for AI section-level polish & generation.
 * Central definitions consumed by prompt builders, API routes, hooks, and UI.
 */

// ---------------------------------------------------------------------------
// User Identity (求职身份)
// ---------------------------------------------------------------------------

/** The three target user groups for resume content adaptation. */
export type SectionIdentity = 'student' | 'graduate' | 'professional';

export interface SectionIdentityOption {
  readonly id: SectionIdentity;
  readonly label: string;
  readonly description: string;
}

export const SECTION_IDENTITY_OPTIONS: readonly SectionIdentityOption[] = [
  { id: 'student', label: '大学生实习', description: '在校学生，寻找日常/寒暑假实习' },
  { id: 'graduate', label: '应届生校招', description: '应届毕业生，有少量实习或项目经验' },
  { id: 'professional', label: '初入职场社招', description: '1-3年工作经验，寻求同岗进阶或跨岗跳槽' },
] as const;

// ---------------------------------------------------------------------------
// Polish Level (润色档位)
// ---------------------------------------------------------------------------

/** Three compliance-safe polish tiers. */
export type PolishLevel = 'basic' | 'professional' | 'jd-match';

export interface PolishLevelOption {
  readonly id: PolishLevel;
  readonly label: string;
  readonly description: string;
  readonly exampleBefore: string;
  readonly exampleAfter: string;
}

export const POLISH_LEVEL_OPTIONS: readonly PolishLevelOption[] = [
  {
    id: 'basic',
    label: '基础纠错',
    description: '修正错别字与语病，保持原文原意',
    exampleBefore: '我做了一个活动，带了100个用户',
    exampleAfter: '负责策划线上活动，累计吸引100名用户参与。',
  },
  {
    id: 'professional',
    label: '专业表达',
    description: '转化为职场术语，展开完整工作流（数据待您确认）',
    exampleBefore: '给老板写PPT，总结了上个月的数据',
    exampleAfter: '数据复盘汇报：负责部门月度经营数据归集与多维分析，输出可视化复盘报告，支撑业务决策。',
  },
  {
    id: 'jd-match',
    label: 'JD匹配',
    description: '贴合目标岗位JD，突出相关能力',
    exampleBefore: '负责小红书账号运营，发日常笔记',
    exampleAfter: '内容矩阵运营：负责小红书官方账号选题策划与图文排版发布，累计产出原创笔记 [X] 篇。',
  },
] as const;

// ---------------------------------------------------------------------------
// Section Module Type (简历模块类型)
// ---------------------------------------------------------------------------

/** Resume module types that support AI polish/generation. */
export type SectionModuleType =
  | 'education'
  | 'experience'
  | 'internship'
  | 'project'
  | 'campus'
  | 'self-evaluation'
  | 'skills'
  | 'honors'
  | 'generic';

export interface SectionModuleOption {
  readonly id: SectionModuleType;
  readonly label: string;
}

export const SECTION_MODULE_OPTIONS: readonly SectionModuleOption[] = [
  { id: 'education', label: '教育背景' },
  { id: 'experience', label: '工作经历' },
  { id: 'internship', label: '实习经历' },
  { id: 'project', label: '项目经历' },
  { id: 'campus', label: '校园经历' },
  { id: 'self-evaluation', label: '自我评价' },
  { id: 'skills', label: '专业技能' },
] as const;

// ---------------------------------------------------------------------------
// Job Category (求职岗位类型) — for self-evaluation tailoring
// ---------------------------------------------------------------------------

/** Job category types that affect self-evaluation tone and keywords. */
export type JobCategory = 'functional' | 'business' | 'technical' | 'state-owned';

export interface JobCategoryOption {
  readonly id: JobCategory;
  readonly label: string;
  readonly description: string;
}

export const JOB_CATEGORY_OPTIONS: readonly JobCategoryOption[] = [
  { id: 'functional', label: '职能岗', description: '行政、人事、财务、法务等' },
  { id: 'business', label: '业务岗', description: '运营、市场、产品、销售等' },
  { id: 'technical', label: '技术岗', description: '前端、后端、算法、测试等' },
  { id: 'state-owned', label: '国企体制内', description: '央企、国企、事业单位等' },
] as const;

// ---------------------------------------------------------------------------
// Action Verb Whitelist (per identity)
// ---------------------------------------------------------------------------

/** Allowed action verbs per identity to enforce tone compliance. */
export const ACTION_VERB_WHITELIST: Record<SectionIdentity, readonly string[]> = {
  student: ['协助', '参与', '执行', '配合', '整理', '完成', '支持', '核对', '记录', '跟进'],
  graduate: ['负责', '参与', '协助', '执行', '完成', '跟进', '梳理', '整理', '配合', '核验'],
  professional: ['负责', '推进', '搭建', '优化', '执行', '落地', '梳理', '协同', '跟进', '复盘'],
} as const;

/** Forbidden action verbs per identity to prevent tone escalation. */
export const ACTION_VERB_BLACKLIST: Record<SectionIdentity, readonly string[]> = {
  student: ['主导', '统筹', '全链路负责', '核心决策', '操盘', '战略'],
  graduate: ['主导', '操盘', '核心战略制定', '公司级决策'],
  professional: ['非自身负责的公司级成果'],
} as const;

// ---------------------------------------------------------------------------
// API Request / Response Types
// ---------------------------------------------------------------------------

/** Request body for POST /next-api/ai/polish-section */
export interface PolishSectionRequest {
  readonly content: string;
  readonly identity: SectionIdentity;
  readonly moduleType: SectionModuleType;
  readonly polishLevel: PolishLevel;
  readonly jobDescription?: string;
  readonly realisticMode?: boolean;
  readonly model?: string;
}

/** Request body for POST /next-api/ai/generate-section */
export interface GenerateSectionRequest {
  readonly identity: SectionIdentity;
  readonly moduleType: SectionModuleType;
  readonly answers: Record<string, string>;
  readonly jobDescription?: string;
  readonly jobCategory?: JobCategory;
  readonly realisticMode?: boolean;
  readonly model?: string;
}

/** Minimum content length (characters) required for polish. */
export const MIN_POLISH_CONTENT_LENGTH = 10;

/** Maximum JD input length (characters). */
export const MAX_JD_LENGTH = 2000;
