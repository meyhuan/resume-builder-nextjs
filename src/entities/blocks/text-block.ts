import type { BaseBlock } from '@/entities/blocks/base-block';

/**
 * Text block backed by rich-text content.
 * `html` stores sanitized HTML or serialized content suitable for rendering.
 */
export interface TextBlock extends BaseBlock {
  type: 'text';
  html: string;
}
