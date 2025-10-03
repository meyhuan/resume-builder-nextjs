import type { BaseBlock } from '@/entities/blocks/base-block';
import type { ListItem } from '@/entities/blocks/list-item';

/**
 * A list block composed of list items.
 */
export interface ListBlock extends BaseBlock {
  type: 'list';
  items: ListItem[];
}
