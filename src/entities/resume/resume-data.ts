import type { UUID } from '@/entities/common/uuid';
import type { Section } from '@/entities/resume/section';
import type { BaseInfo } from '@/entities/user/base-info';
import type { JobIntention } from '@/entities/user/job-intention';
import type { ResumePortfolio } from '@/entities/resume/portfolio';

/**
 * Root resume data model.
 */
export interface ResumeData {
  id: UUID;
  name: string;
  contactHtml?: string;
  /** Resume content language after translation (zh/en/…). Defaults to zh. */
  language?: string;
  /** Optional structured base info for header. */
  baseInfo?: BaseInfo;
  /** Optional job intention. */
  jobIntention?: JobIntention;
  jobIntentionVisible?: boolean;
  /** Controls only the job-intention text rendered in template headers. */
  headerJobIntentionVisible?: boolean;
  /** Optional image portfolio rendered as PDF appendix pages. */
  portfolio?: ResumePortfolio;
  sections: Section[];
}
