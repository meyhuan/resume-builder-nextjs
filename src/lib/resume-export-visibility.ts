import type { ResumeBlock } from '@/entities/blocks/resume-block'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { Section } from '@/entities/resume/section'
import { hasMeaningfulHtml, hasMeaningfulText } from '@/lib/resume-placeholders'

/**
 * Export is read-only output. Empty editor scaffolding should stay editable in
 * the app, but it must not appear as blank modules in PDF/image exports.
 */
export function prepareResumeForExport(resume: ResumeData): ResumeData {
  return {
    ...resume,
    sections: resume.sections
      .map((section) => ({
        ...section,
        blocks: section.blocks.filter(isExportVisibleBlock),
      }))
      .filter(isExportVisibleSection),
  }
}

function isExportVisibleSection(section: Section): boolean {
  return section.blocks.length > 0
}

export function hasSectionContent(section: Section): boolean {
  return section.blocks.some(isExportVisibleBlock)
}

function isExportVisibleBlock(block: ResumeBlock): boolean {
  switch (block.type) {
    case 'text':
      return hasMeaningfulHtml(block.html)
    case 'list':
      return block.items.some((item) => hasMeaningfulHtml(item.html))
    case 'experience':
      return hasMeaningfulText(block.company)
        || hasMeaningfulText(block.position)
        || hasMeaningfulText(block.industry)
        || hasMeaningfulText(block.startDate)
        || hasMeaningfulText(block.endDate)
        || hasMeaningfulHtml(block.contentHtml)
    case 'education':
      return hasMeaningfulText(block.school)
        || hasMeaningfulText(block.major)
        || hasMeaningfulText(block.degree)
        || hasMeaningfulText(block.startDate)
        || hasMeaningfulText(block.endDate)
        || hasMeaningfulHtml(block.courseHtml)
    case 'project':
      return hasMeaningfulText(block.name)
        || hasMeaningfulText(block.role)
        || hasMeaningfulText(block.startDate)
        || hasMeaningfulText(block.endDate)
        || hasMeaningfulHtml(block.contentHtml)
    case 'campus':
      return hasMeaningfulText(block.organization)
        || hasMeaningfulText(block.position)
        || hasMeaningfulText(block.startDate)
        || hasMeaningfulText(block.endDate)
        || hasMeaningfulHtml(block.contentHtml)
    default:
      return true
  }
}

/** Keep source block indexes for editor reorder/drop actions and active inputs. */
export function prepareResumeForDisplay(resume: ResumeData, editingBlockIds: readonly string[]): ResumeData {
  return {
    ...resume,
    sections: resume.sections.filter((section) => hasSectionContent(section)
      || section.blocks.some((block) => editingBlockIds.includes(block.id))),
  }
}
