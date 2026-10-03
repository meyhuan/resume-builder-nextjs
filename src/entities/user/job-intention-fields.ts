import type { JobIntention } from './job-intention'

/** Read legacy campus/social values without guessing an employment type. */
export function normalizeJobIntention(value: JobIntention): JobIntention {
  const legacyRecruitment = value.type === '校招' || value.type === '社招'
  if (legacyRecruitment) return { ...value, type: undefined, recruitmentType: value.recruitmentType || value.type }
  // Older blank resumes store the field label as a value. It is not a choice.
  if (value.type === '求职类型' || value.type === '工作性质') return { ...value, type: undefined }
  return value
}

export const JOB_INTENTION_FIELD_KEYS = ['position', 'city', 'salary', 'type', 'recruitmentType', 'industry', 'currentStatus'] as const
