import type { UUID } from '@/entities/common/uuid';

/**
 * An item in a bulleted list.
 */
export interface ListItem {
  id: UUID;
  html: string;
}
