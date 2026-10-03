import type { ResumeData } from '@/entities/resume/resume-data'
import { prepareResumeForDisplay, prepareResumeForExport } from '@/lib/resume-export-visibility'

/**
 * Apply display-only preferences before passing resume data into templates.
 * Hidden fields are masked for rendering without deleting the user's data.
 */
export function getRenderableResume(resume: ResumeData, editingBlockIds?: readonly string[]): ResumeData {
  // Filter before layout so previews, auto-fit, thumbnails and DOM exports
  // share the same content as the server print renderer. Keep the draft intact.
  resume = editingBlockIds ? prepareResumeForDisplay(resume, editingBlockIds) : prepareResumeForExport(resume)
  if (resume.jobIntentionVisible !== false) return resume

  return {
    ...resume,
    baseInfo: resume.baseInfo
      ? { ...resume.baseInfo, title: undefined }
      : resume.baseInfo,
    jobIntention: resume.jobIntention
      ? { ...resume.jobIntention, position: undefined }
      : resume.jobIntention,
  }
}
