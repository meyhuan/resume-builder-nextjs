import type { UUID } from '@/entities/common/uuid';

/**
 * ExperienceBlock represents a single work experience entry.
 */
export interface ExperienceBlock {
  readonly id: UUID;
  readonly type: 'experience';
  readonly company: string;
  readonly position: string;
  readonly industry?: string;
  readonly startDate: string;
  readonly endDate: string;
  /** HTML content for job responsibilities. */
  readonly contentHtml: string;
}
