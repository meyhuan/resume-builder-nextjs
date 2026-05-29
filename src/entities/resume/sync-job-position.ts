import { produce } from 'immer'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { BaseInfo } from '@/entities/user/base-info'
import type { JobIntention } from '@/entities/user/job-intention'

function normalizeText(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed || undefined
}

/**
 * Desired position is stored canonically in jobIntention.position.
 * baseInfo.title is kept in sync for legacy data and templates that render it in the header.
 */
export function syncJobPositionFromBaseInfo(draft: ResumeData, baseInfo: BaseInfo): void {
  const position = normalizeText(baseInfo.title)
  draft.baseInfo = { ...baseInfo, title: position }
  draft.jobIntention = { ...(draft.jobIntention ?? {}), position }
}

export function syncJobPositionFromJobIntention(
  draft: ResumeData,
  jobIntention: JobIntention,
): void {
  const position = normalizeText(jobIntention.position)
  draft.jobIntention = { ...jobIntention, position }
  draft.baseInfo = { ...(draft.baseInfo ?? {}), title: position }
}

export function normalizeResumeJobPosition(draft: ResumeData): void {
  const position = normalizeText(draft.jobIntention?.position) ?? normalizeText(draft.baseInfo?.title)

  if (draft.jobIntention) {
    draft.jobIntention = { ...draft.jobIntention, position }
  } else if (position) {
    draft.jobIntention = { position }
  }

  if (draft.baseInfo) {
    draft.baseInfo = { ...draft.baseInfo, title: position }
  } else if (position) {
    draft.baseInfo = { title: position }
  }
}

export function withNormalizedJobPosition(resume: ResumeData): ResumeData {
  return produce(resume, normalizeResumeJobPosition)
}
