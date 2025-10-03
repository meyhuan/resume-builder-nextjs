import type { UUID } from '@/entities/common/uuid';

/**
 * ProjectBlock represents a single project experience entry.
 */
export interface ProjectBlock {
  readonly id: UUID;
  readonly type: 'project';
  readonly name: string;
  readonly role?: string;
  readonly startDate: string;
  readonly endDate: string;
  /** HTML for project description and responsibilities. */
  readonly contentHtml: string;
}
