import type { ResumeData } from '@/entities/resume/resume-data'
import { formatJdSuggestionSection } from './jd-section-label'

/** Resolve against actual resume content; never guess a module from an AI path. */
export function resolveJdEditTarget(resume: ResumeData, section: string, blockId?: string): string | null {
  const byBlock = blockId && resume.sections.find(s => s.blocks.some(b => b.id === blockId))
  if (byBlock) return byBlock.id
  const label = formatJdSuggestionSection(section, resume, blockId).split(' · ')[0]
  const matches = resume.sections.filter(s => s.title === label || s.displayTitle === label)
  return matches.length === 1 ? matches[0].id : null
}

export function storeJdEditSuggestion(resumeId: string, sectionId: string, text: string): void {
  sessionStorage.setItem(`m-edit-home-anchor:${resumeId}`, sectionId)
  sessionStorage.setItem(`m-jd-suggestion:${resumeId}`, JSON.stringify({ sectionId, text }))
}
