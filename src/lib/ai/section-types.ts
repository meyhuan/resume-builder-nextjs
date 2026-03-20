/**
 * Types and constants for AI section-level polish & generation.
 * Central definitions consumed by prompt builders, API routes, hooks, and UI.
 */

// ---------------------------------------------------------------------------
// User Identity
// ---------------------------------------------------------------------------

/** The three target user groups for resume content adaptation. */
export type SectionIdentity = 'student' | 'graduate' | 'professional';

export interface SectionIdentityOption {
  readonly id: SectionIdentity;
  readonly label: string;
  readonly description: string;
}

export const SECTION_IDENTITY_OPTIONS: readonly SectionIdentityOption[] = [
  { id: 'student', label: 'Student Intern', description: 'Current student seeking internships' },
  { id: 'graduate', label: 'Recent Graduate', description: 'New grad with limited internship or project experience' },
  { id: 'professional', label: 'Working Professional', description: '1-3+ years of experience, seeking career advancement' },
] as const;

// ---------------------------------------------------------------------------
// Polish Level
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
    label: 'Light Edit',
    description: 'Fix typos and grammar while preserving original meaning',
    exampleBefore: 'I did an event and got 100 users',
    exampleAfter: 'Organized an online event that attracted 100 participants.',
  },
  {
    id: 'professional',
    label: 'Professional Polish',
    description: 'Transform into professional workplace language',
    exampleBefore: 'Made a PPT for my boss summarizing last month data',
    exampleAfter: 'Compiled and analyzed monthly business performance data, delivering executive summary reports.',
  },
  {
    id: 'jd-match',
    label: 'JD Match',
    description: 'Align with target job description, highlight relevant skills',
    exampleBefore: 'Managed Instagram account, gained 500 followers',
    exampleAfter: '[JD: content marketing expertise] Independently managed social media presence, growing follower base by 500+ through data-driven content strategy.',
  },
] as const;

// ---------------------------------------------------------------------------
// Section Module Type
// ---------------------------------------------------------------------------

/** Resume module types that support AI polish/generation. */
export type SectionModuleType =
  | 'experience'
  | 'project'
  | 'campus'
  | 'self-evaluation'
  | 'skills';

export interface SectionModuleOption {
  readonly id: SectionModuleType;
  readonly label: string;
}

export const SECTION_MODULE_OPTIONS: readonly SectionModuleOption[] = [
  { id: 'experience', label: 'Work Experience' },
  { id: 'project', label: 'Projects' },
  { id: 'campus', label: 'Campus Experience' },
  { id: 'self-evaluation', label: 'Professional Summary' },
  { id: 'skills', label: 'Skills' },
] as const;

// ---------------------------------------------------------------------------
// Job Category — for self-evaluation tailoring
// ---------------------------------------------------------------------------

/** Job category types that affect self-evaluation tone and keywords. */
export type JobCategory = 'functional' | 'business' | 'technical' | 'state-owned';

export interface JobCategoryOption {
  readonly id: JobCategory;
  readonly label: string;
  readonly description: string;
}

export const JOB_CATEGORY_OPTIONS: readonly JobCategoryOption[] = [
  { id: 'functional', label: 'Administrative', description: 'HR, Finance, Legal, Admin, etc.' },
  { id: 'business', label: 'Business', description: 'Operations, Marketing, Product, Sales, etc.' },
  { id: 'technical', label: 'Technical', description: 'Frontend, Backend, ML/AI, QA, etc.' },
  { id: 'state-owned', label: 'Public Sector', description: 'Government, public institutions, etc.' },
] as const;

// ---------------------------------------------------------------------------
// Action Verb Whitelist (per identity)
// ---------------------------------------------------------------------------

/** Allowed action verbs per identity to enforce tone compliance. */
export const ACTION_VERB_WHITELIST: Record<SectionIdentity, readonly string[]> = {
  student: ['Assisted', 'Participated', 'Executed', 'Supported', 'Organized', 'Completed', 'Learned', 'Contributed', 'Documented', 'Coordinated'],
  graduate: ['Owned', 'Implemented', 'Optimized', 'Drove', 'Built', 'Participated', 'Executed', 'Analyzed', 'Streamlined', 'Organized'],
  professional: ['Led', 'Managed', 'Architected', 'Optimized', 'Drove', 'Resolved', 'Delivered', 'Owned', 'Analyzed', 'Spearheaded'],
} as const;

/** Forbidden action verbs per identity to prevent tone escalation. */
export const ACTION_VERB_BLACKLIST: Record<SectionIdentity, readonly string[]> = {
  student: ['Led', 'Managed', 'Owned end-to-end', 'Made strategic decisions', 'Directed', 'Oversaw'],
  graduate: ['Directed company-wide', 'Set corporate strategy', 'Made C-level decisions'],
  professional: ['Claimed company-level results not personally owned'],
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
