/**
 * Utilities for mapping block types to AI section module types,
 * and extracting content HTML from blocks.
 */
import type { ResumeBlock } from '@/entities/blocks/resume-block';
import type { SectionModuleType } from '@/lib/ai/section-types';

/**
 * Maps a block's type string to the corresponding SectionModuleType.
 * Returns undefined for block types that don't support AI polish/generate (e.g. education).
 */
export function blockTypeToModuleType(blockType: string): SectionModuleType | undefined {
  switch (blockType) {
    case 'experience':
      return 'experience';
    case 'project':
      return 'project';
    case 'campus':
      return 'campus';
    case 'text':
      return 'self-evaluation';
    default:
      return undefined;
  }
}

/**
 * Extracts the primary content HTML from a block for AI polishing.
 */
export function extractBlockContentHtml(block: ResumeBlock): string {
  if ('contentHtml' in block) return block.contentHtml || '';
  if ('html' in block) return block.html || '';
  if ('courseHtml' in block) return block.courseHtml || '';
  return '';
}

/**
 * Formats a date string (e.g. "2024-01" or "2024.01") to "YYYY.MM" style.
 * Returns empty string for falsy/placeholder values.
 */
function formatDate(date: string | undefined): string {
  if (!date || date === '至今') return date ?? '';
  return date.replace(/-/g, '.');
}

/**
 * Extracts structured data from a block and returns a Record<autoFillKey, value>
 * that can pre-fill guided questions automatically.
 */
export function extractBlockPrefill(block: ResumeBlock): Record<string, string> {
  const prefill: Record<string, string> = {};
  if (block.type === 'experience') {
    const company: string = block.company ?? '';
    const position: string = block.position ?? '';
    const start: string = formatDate(block.startDate);
    const end: string = formatDate(block.endDate) || '至今';
    if (company || position) {
      prefill['companyAndRole'] = [company, position, start && end ? `${start}-${end}` : ''].filter(Boolean).join(' ');
    }
  } else if (block.type === 'project') {
    const name: string = block.name ?? '';
    const role: string = ('role' in block ? block.role : '') ?? '';
    const start: string = formatDate(block.startDate);
    const end: string = formatDate(block.endDate) || '至今';
    if (name || role) {
      prefill['projectNameAndRole'] = [name, role, start && end ? `${start}-${end}` : ''].filter(Boolean).join(' ');
    }
  } else if (block.type === 'campus') {
    const org: string = block.organization ?? '';
    const position: string = block.position ?? '';
    const start: string = formatDate(block.startDate);
    const end: string = formatDate(block.endDate) || '至今';
    if (org || position) {
      prefill['orgAndRole'] = [org, position, start && end ? `${start}-${end}` : ''].filter(Boolean).join(' ');
    }
  }
  return prefill;
}

/**
 * Returns the label for a block type (Chinese).
 */
export function getBlockTypeLabel(blockType: string): string {
  switch (blockType) {
    case 'experience':
      return '工作经历';
    case 'project':
      return '项目经历';
    case 'education':
      return '教育经历';
    case 'campus':
      return '校园经历';
    case 'text':
      return '内容';
    default:
      return '内容';
  }
}
