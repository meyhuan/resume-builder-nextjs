import type { UUID } from '@/entities/common/uuid';
import type { ResumeBlock } from '@/entities/blocks/resume-block';

/**
 * Section groups blocks and defines column count for layout.
 */
export interface Section {
  id: UUID;
  title: string;
  columns: number; // 1 or 2
  blocks: ResumeBlock[];
}
