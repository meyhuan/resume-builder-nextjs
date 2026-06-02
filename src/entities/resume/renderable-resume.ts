import type { ResumeData } from '@/entities/resume/resume-data'

/**
 * Apply display-only preferences before passing resume data into templates.
 * Hidden fields are masked for rendering without deleting the user's data.
 */
export function getRenderableResume(resume: ResumeData): ResumeData {
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
