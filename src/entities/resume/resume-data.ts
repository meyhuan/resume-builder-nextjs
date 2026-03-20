import type { UUID } from '@/entities/common/uuid';
import type { Section } from '@/entities/resume/section';
import type { BaseInfo } from '@/entities/user/base-info';

/**
 * Root resume data model.
 */
export interface ResumeData {
  id: UUID;
  name: string;
  contactHtml?: string;
  /** Optional structured base info for header. */
  baseInfo?: BaseInfo;
  sections: Section[];
}
