import type { ResumeData } from '@/entities/resume/resume-data'
import type { JobFitClaim, SubmissionReadiness } from '@meyhuan/job-fit-engine/contracts'

export const JOB_FIT_FOCUS_AREAS = [
  'keywords',
  'achievements',
  'concise',
  'structure',
] as const

export type JobFitFocusArea = (typeof JOB_FIT_FOCUS_AREAS)[number]
export const JOB_FIT_OPTIMIZATION_MODES = ['PROFESSIONAL', 'SPRINT'] as const
export type JobFitOptimizationMode = (typeof JOB_FIT_OPTIMIZATION_MODES)[number]
export type JobFitChangeCategory = 'KEYWORD' | 'CAPABILITY' | 'EXPERIENCE'

export interface JobFitRequirement {
  readonly id: string
  readonly label: string
  readonly category: JobFitChangeCategory
  readonly keywords: readonly string[]
  readonly weight: number
}

export interface JobFitPatch {
  readonly sectionId: string
  readonly blockId: string
  readonly field: 'contentHtml' | 'courseHtml' | 'html'
  readonly itemId?: string
  readonly optimizedHtml: string
  readonly category: JobFitChangeCategory
  readonly reason: string
  readonly requirementId?: string
  readonly evidence: string
}

export interface JobFitChange extends JobFitPatch {
  readonly id: string
  readonly originalHtml: string
  readonly originalText: string
  readonly optimizedText: string
  readonly originalStart: number
  readonly originalEnd: number
  readonly optimizedStart: number
  readonly optimizedEnd: number
  readonly contextHash: string
  readonly claimStatus?: JobFitClaim['status']
  readonly claimId?: string
}

export interface JobFitDimensionScore {
  readonly original: number
  readonly optimized: number
  readonly improvement: number
  readonly changeCount: number
  readonly summary: string
}

export interface JobFitScoring {
  readonly version: 'job-fit-score-v1' | 'job-fit-score-v2'
  readonly original: number
  readonly optimized: number
  readonly improvement: number
  readonly keyword: JobFitDimensionScore
  readonly capability: JobFitDimensionScore
  readonly experience: JobFitDimensionScore
}

export interface JobFitSummary {
  readonly completed: readonly string[]
  readonly suggestions: readonly string[]
  readonly requirements: readonly JobFitRequirement[]
}

export interface JobFitGenerationResult {
  readonly optimizedResume: ResumeData
  readonly scoring: JobFitScoring
  readonly changes: readonly JobFitChange[]
  readonly summary: JobFitSummary
  readonly modelName: string
  readonly factGuardRejectCount: number
  readonly resultSchemaVersion?: string
  readonly engineVersion?: string
  readonly readiness?: SubmissionReadiness
  readonly claims?: readonly JobFitClaim[]
  readonly evidenceSummary?: {
    readonly sourceBacked: number
    readonly transferred: number
    readonly inferred: number
    readonly estimated: number
  }
  readonly promptVersion?: string
}

export interface JobFitErrorPayload {
  readonly error: string
  readonly code: string
  readonly retryable: boolean
  readonly taskId?: string
  readonly stage?: string
}
