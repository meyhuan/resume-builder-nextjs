import type { SectionModuleType } from '@/lib/ai/section-types';

/**
 * Resolves the canonical module kind from block type and section title.
 * Used by both Unified Assistant chat and Section Polish / Generate drawers.
 */
export function resolveModuleKind(
  blockType: string,
  sectionTitle: string = '',
): SectionModuleType {
  const normalizedTitle = (sectionTitle || '').trim().toLowerCase();

  // 1. Experience blocks can be full-time work or internship
  if (blockType === 'experience') {
    if (/实习|intern/i.test(normalizedTitle)) {
      return 'internship';
    }
    return 'experience';
  }

  // 2. Specific block types
  if (blockType === 'education') return 'education';
  if (blockType === 'project') return 'project';
  if (blockType === 'campus') return 'campus';

  // 3. Title-based classification (typically blockType === 'text' | 'list')
  if (/教育|学历|学业|主修|education/i.test(normalizedTitle)) {
    return 'education';
  }
  if (/评价|总结|优势|简介|summary|profile|about/i.test(normalizedTitle)) {
    return 'self-evaluation';
  }
  if (/技能|skill/i.test(normalizedTitle)) {
    return 'skills';
  }
  if (/荣誉|证书|资质|奖项|honor|cert|award/i.test(normalizedTitle)) {
    return 'honors';
  }

  return 'generic';
}
