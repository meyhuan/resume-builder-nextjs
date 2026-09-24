import type { Section } from './section'

export const MAX_SECTION_DISPLAY_TITLE_LENGTH = 40

/** Reading persisted data must not truncate legacy names. */
export function normalizeSectionDisplayTitle(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const title = value.trim()
  return title && !/[\r\n\u2028\u2029]/u.test(title) ? title : undefined
}

export function getSectionDisplayTitle(section: Pick<Section, 'title' | 'displayTitle'>, fallback = section.title): string {
  return normalizeSectionDisplayTitle(section.displayTitle) ?? fallback
}

export function validateSectionDisplayTitle(value: string): string | undefined {
  if (!value.trim()) return '请输入模块名称'
  if (/[\r\n\u2028\u2029]/u.test(value)) return '模块名称不能包含换行'
  if (Array.from(value.trim()).length > MAX_SECTION_DISPLAY_TITLE_LENGTH) return '模块名称最多 40 个字符'
  return undefined
}

/** undefined explicitly resets the override; invalid input never changes data. */
export function setSectionDisplayTitle(section: Section, value: string | undefined): void {
  if (value === undefined) delete section.displayTitle
  else if (!validateSectionDisplayTitle(value)) section.displayTitle = value.trim()
}
