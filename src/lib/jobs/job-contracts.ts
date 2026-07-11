import { z } from 'zod'

export const JOB_STATUSES = ['PREPARING', 'READY', 'EXPORTED', 'APPLIED', 'CONTACTING', 'INTERVIEWING', 'OFFER', 'REJECTED', 'WITHDRAWN', 'ARCHIVED'] as const
export type JobStatus = (typeof JOB_STATUSES)[number]

export const JOB_IDENTITIES = ['student', 'graduate', 'professional'] as const
export type JobIdentity = (typeof JOB_IDENTITIES)[number]

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((value) => value || undefined)

export const createJobSchema = z.object({
  baseResumeId: z.string().trim().min(1),
  company: optionalText(80),
  role: z.string().trim().min(1, '请填写职位名称').max(80, '职位名称不能超过 80 个字'),
  jd: z.string().trim().min(50, '职位描述至少需要 50 个字').max(8000, '职位描述不能超过 8000 个字'),
  source: optionalText(40),
  sourceUrl: z.union([z.literal(''), z.url('请输入有效的职位链接')]).optional().transform((value) => value || undefined),
  location: optionalText(80),
  salaryRange: optionalText(80),
  identity: z.enum(JOB_IDENTITIES).default('professional'),
})

export const updateJobSchema = z.object({
  company: optionalText(80),
  role: z.string().trim().min(1).max(80).optional(),
  jd: z.string().trim().min(50).max(8000).optional(),
  source: optionalText(40),
  sourceUrl: z.union([z.literal(''), z.url()]).optional().transform((value) => value || undefined),
  location: optionalText(80),
  salaryRange: optionalText(80),
  identity: z.enum(JOB_IDENTITIES).optional(),
  archived: z.boolean().optional(),
})

export type CreateJobInput = z.infer<typeof createJobSchema>
export type UpdateJobInput = z.infer<typeof updateJobSchema>

export const JOB_STATUS_META: Record<JobStatus, { label: string; className: string }> = {
  PREPARING: { label: '准备中', className: 'border-amber-100 bg-amber-50 text-amber-700' },
  READY: { label: '已完成', className: 'border-violet-100 bg-violet-50 text-violet-700' },
  EXPORTED: { label: '已导出', className: 'border-emerald-100 bg-emerald-50 text-emerald-700' },
  APPLIED: { label: '已投递', className: 'border-blue-100 bg-blue-50 text-blue-700' },
  CONTACTING: { label: '沟通中', className: 'border-violet-100 bg-violet-50 text-violet-700' },
  INTERVIEWING: { label: '面试中', className: 'border-amber-100 bg-amber-50 text-amber-700' },
  OFFER: { label: 'Offer', className: 'border-emerald-100 bg-emerald-50 text-emerald-700' },
  REJECTED: { label: '已拒绝', className: 'border-rose-100 bg-rose-50 text-rose-700' },
  WITHDRAWN: { label: '已放弃', className: 'border-slate-200 bg-slate-100 text-slate-600' },
  ARCHIVED: { label: '已归档', className: 'border-slate-200 bg-slate-100 text-slate-600' },
}

export function isJobStatus(value: string): value is JobStatus {
  return JOB_STATUSES.includes(value as JobStatus)
}
