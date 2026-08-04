import type { ResumeData } from '@/entities/resume/resume-data'
import { analyzeJdMatch } from '@/lib/seo/jd-match'
import { extractOptimizableFields, resumeToPlainText } from './resume-content'
import type { JobFitChange, JobFitDimensionScore, JobFitScoring } from './types'

interface DimensionValues {
  keyword: number
  capability: number
  experience: number
  overall: number
}

function scoreResume(resume: ResumeData, jobDescription: string, jobTitle: string): DimensionValues {
  // Job intention is deliberately excluded: Job Fit is allowed to update it
  // to the target role, but that label alone is not proof that the user's
  // experience is a better match.
  const plainText = resumeToPlainText({ ...resume, jobIntention: undefined })
  const match = analyzeJdMatch({ jobDescription, resumeText: plainText, targetRole: jobTitle })
  const fields = extractOptimizableFields(resume)
  const evidenceFields = fields.filter((field) => match.matchedKeywords.some((keyword) => field.text.toLowerCase().includes(keyword.toLowerCase())))
  const quantifiedFields = fields.filter((field) => /\d+(?:\.\d+)?\s*(?:%|万|亿|人|次|个|天|月|年|元|k|w)?/i.test(field.text))
  const keyword = match.score
  const capability = clamp(Math.round(keyword * 0.72 + Math.min(28, evidenceFields.length * 4)))
  const experience = clamp(Math.round(keyword * 0.62 + Math.min(38, quantifiedFields.length * 7)))
  const overall = clamp(Math.round(keyword * 0.4 + capability * 0.35 + experience * 0.25))
  return { keyword, capability, experience, overall }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value))
}

function dimension(
  original: number,
  optimized: number,
  changeCount: number,
  summary: string,
): JobFitDimensionScore {
  return { original, optimized, improvement: optimized - original, changeCount, summary }
}

export function calculateJobFitScoring(
  originalResume: ResumeData,
  optimizedResume: ResumeData,
  jobDescription: string,
  jobTitle: string,
  changes: readonly JobFitChange[],
): JobFitScoring {
  const before = scoreResume(originalResume, jobDescription, jobTitle)
  const after = scoreResume(optimizedResume, jobDescription, jobTitle)
  const count = (category: JobFitChange['category']): number => changes.filter((change) => change.category === category).length
  return {
    version: 'job-fit-score-v1',
    original: before.overall,
    optimized: after.overall,
    improvement: after.overall - before.overall,
    keyword: dimension(before.keyword, after.keyword, count('KEYWORD'), '让岗位关键词自然出现在已有经历证据中'),
    capability: dimension(before.capability, after.capability, count('CAPABILITY'), '明确连接岗位能力与已有职责、技能'),
    experience: dimension(before.experience, after.experience, count('EXPERIENCE'), '强化已有成果和职责的表达重点'),
  }
}
