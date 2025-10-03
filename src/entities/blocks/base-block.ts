import type { UUID } from '@/entities/common/uuid';
import type { BlockType } from '@/entities/blocks/block-type';

/**
 * Base shape for all resume blocks.
 */
export interface BaseBlock {
  id: UUID;
  type: BlockType;
}
