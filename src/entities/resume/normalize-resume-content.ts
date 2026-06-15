import type { ResumeBlock } from '@/entities/blocks/resume-block'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { Section } from '@/entities/resume/section'

interface NormalizeResumeOptions {
  readonly fallbackId?: string
}

type RawRecord = Record<string, unknown>

const ZERO_WIDTH_PATTERN = /[\u200B-\u200D\uFEFF]/g
const HTML_TAG_PATTERN = /<[a-z][\s\S]*>/i

/**
 * Normalizes persisted/imported resume JSON into the stricter runtime shape
 * expected by the editor. This is intentionally narrow: valid modern data is
 * kept as-is, while legacy defects are fixed at the data boundary.
 */
export function normalizeResumeContent(
  resume: Partial<ResumeData>,
  options: NormalizeResumeOptions = {},
): ResumeData {
  const rawResume = resume as Partial<ResumeData> & RawRecord
  const usedSectionIds = new Set<string>()
  const usedBlockIds = new Set<string>()
  const rawSections = Array.isArray(rawResume.sections) ? rawResume.sections : []

  return {
    ...rawResume,
    id: normalizeString(rawResume.id) || options.fallbackId || 'resume-imported',
    name: normalizeString(rawResume.name),
    sections: rawSections.map((section, sectionIndex) =>
      normalizeSection(section as Partial<Section> & RawRecord, sectionIndex, usedSectionIds, usedBlockIds),
    ),
  } as ResumeData
}

function normalizeSection(
  section: Partial<Section> & RawRecord,
  sectionIndex: number,
  usedSectionIds: Set<string>,
  usedBlockIds: Set<string>,
): Section {
  const rawBlocks = Array.isArray(section.blocks) ? section.blocks : []
  const sectionId = makeUniqueId(
    normalizeString(section.id),
    `section-${sectionIndex + 1}`,
    usedSectionIds,
  )

  return {
    ...section,
    id: sectionId,
    title: normalizeString(section.title),
    columns: section.columns === 2 ? 2 : 1,
    blocks: rawBlocks.map((block, blockIndex) =>
      normalizeBlock(block as ResumeBlock & RawRecord, sectionIndex, blockIndex, usedBlockIds),
    ),
  } as Section
}

function normalizeBlock(
  block: ResumeBlock & RawRecord,
  sectionIndex: number,
  blockIndex: number,
  usedBlockIds: Set<string>,
): ResumeBlock {
  const type = typeof block.type === 'string' ? block.type : 'block'
  const id = makeUniqueId(
    normalizeString(block.id),
    `${type}-${sectionIndex + 1}-${blockIndex + 1}`,
    usedBlockIds,
  )

  if (block.type === 'experience') {
    return {
      ...block,
      id,
      contentHtml: normalizeHtmlContent(block.contentHtml),
    }
  }

  if (block.type === 'project') {
    return {
      ...block,
      id,
      contentHtml: normalizeHtmlContent(block.contentHtml),
    }
  }

  if (block.type === 'campus') {
    return {
      ...block,
      id,
      contentHtml: normalizeHtmlContent(block.contentHtml),
    }
  }

  if (block.type === 'education') {
    const { contentHtml: legacyContentHtml, ...rest } = block
    return {
      ...rest,
      id,
      courseHtml: normalizeHtmlContent(block.courseHtml ?? legacyContentHtml),
    } as ResumeBlock
  }

  if (block.type === 'text') {
    return {
      ...block,
      id,
      html: normalizeHtmlContent(block.html),
    }
  }

  return { ...block, id } as ResumeBlock
}

function makeUniqueId(rawId: string, fallback: string, used: Set<string>): string {
  const base = rawId || fallback
  if (!used.has(base)) {
    used.add(base)
    return base
  }

  let next = `${base}-${fallback}`
  let suffix = 2
  while (used.has(next)) {
    next = `${base}-${fallback}-${suffix}`
    suffix += 1
  }
  used.add(next)
  return next
}

function normalizeHtmlContent(value: unknown): string {
  const text = normalizeString(value)
  if (!text) return ''
  if (HTML_TAG_PATTERN.test(text)) return text

  const plain = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/\r\n?/g, '\n')
  const lines = plain
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return ''
  return lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('')
}

function normalizeString(value: unknown): string {
  if (typeof value === 'string') return value.replace(ZERO_WIDTH_PATTERN, '').trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
