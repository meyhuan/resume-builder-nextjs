import type { ResumeData } from '@/entities/resume/resume-data'

type HeaderJobIntentionSource = Pick<
  ResumeData,
  'baseInfo' | 'jobIntention' | 'jobIntentionVisible' | 'headerJobIntentionVisible'
>

export function isHeaderJobIntentionVisible(resume: HeaderJobIntentionSource): boolean {
  return resume.jobIntentionVisible !== false && resume.headerJobIntentionVisible !== false
}

export function getHeaderJobIntentionText(resume: HeaderJobIntentionSource): string {
  if (!isHeaderJobIntentionVisible(resume)) return ''

  return (
    resume.baseInfo?.title?.trim() ||
    resume.jobIntention?.position?.trim() ||
    ''
  )
}
