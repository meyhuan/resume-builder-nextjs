import type { UUID } from '@/entities/common/uuid';
import type { Section } from '@/entities/resume/section';
import type { BaseInfo } from '@/entities/user/base-info';
import type { JobIntention } from '@/entities/user/job-intention';

/**
 * Root resume data model.
 */
export interface ResumeData {
  id: UUID;
  name: string;
  contactHtml?: string;
  /** Optional structured base info for header. */
  baseInfo?: BaseInfo;
  /** Optional job intention. */
  jobIntention?: JobIntention;
  jobIntentionVisible?: boolean;
  /** Controls only the job-intention text rendered in template headers. */
  headerJobIntentionVisible?: boolean;
  sections: Section[];
}
