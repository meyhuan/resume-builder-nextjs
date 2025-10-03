import type { UUID } from '@/entities/common/uuid';

/**
 * CampusBlock represents a single campus activity or organization experience.
 */
export interface CampusBlock {
  readonly id: UUID;
  readonly type: 'campus';
  readonly organization: string;
  readonly position: string;
  readonly startDate: string;
  readonly endDate: string;
  /** HTML content for activity description. */
  readonly contentHtml: string;
}
