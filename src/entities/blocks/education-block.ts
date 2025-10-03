import type { UUID } from '@/entities/common/uuid';

/**
 * EducationBlock represents a single education entry.
 */
export interface EducationBlock {
  readonly id: UUID;
  readonly type: 'education';
  readonly school: string;
  readonly major?: string;
  readonly degree?: string;
  readonly startDate: string;
  readonly endDate: string;
  /** HTML for courses or achievements. */
  readonly courseHtml?: string;
}
