import { z } from 'zod'

export const APPLICATION_STATUSES = ['APPLIED', 'CONTACTING', 'INTERVIEWING', 'OFFER', 'REJECTED', 'WITHDRAWN'] as const
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

export const APPLICATION_STATUS_META: Record<ApplicationStatus, { label: string; className: string }> = {
  APPLIED: { label: '已投递', className: 'border-blue-100 bg-blue-50 text-blue-700' },
  CONTACTING: { label: '沟通中', className: 'border-violet-100 bg-violet-50 text-violet-700' },
  INTERVIEWING: { label: '面试中', className: 'border-amber-100 bg-amber-50 text-amber-700' },
  OFFER: { label: 'Offer', className: 'border-emerald-100 bg-emerald-50 text-emerald-700' },
  REJECTED: { label: '已拒绝', className: 'border-rose-100 bg-rose-50 text-rose-700' },
  WITHDRAWN: { label: '已放弃', className: 'border-slate-200 bg-slate-100 text-slate-600' },
}

export const createApplicationSchema = z.object({
  channel: z.string().trim().min(1, '请填写投递渠道').max(80),
  appliedAt: z.string().datetime({ offset: true }),
  resumeId: z.string().trim().min(1).nullable().optional(),
  materialIds: z.array(z.string().trim().min(1)).max(10).default([]),
  contactName: z.string().trim().max(80).optional().transform((value) => value || undefined),
  contactInfo: z.string().trim().max(160).optional().transform((value) => value || undefined),
  nextActionAt: z.union([z.string().datetime({ offset: true }), z.literal('')]).optional().transform((value) => value || undefined),
  note: z.string().trim().max(4000).optional().transform((value) => value || undefined),
})

export const updateApplicationSchema = z.object({
  channel: z.string().trim().min(1).max(80).optional(),
  appliedAt: z.string().datetime({ offset: true }).optional(),
  status: z.enum(APPLICATION_STATUSES).optional(),
  contactName: z.string().trim().max(80).nullable().optional(),
  contactInfo: z.string().trim().max(160).nullable().optional(),
  nextActionAt: z.union([z.string().datetime({ offset: true }), z.literal(''), z.null()]).optional(),
  note: z.string().trim().max(4000).nullable().optional(),
})

export const addActivitySchema = z.object({
  type: z.enum(['NOTE', 'FOLLOW_UP']),
  note: z.string().trim().min(1).max(4000),
  occurredAt: z.string().datetime({ offset: true }).optional(),
})

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>
export type AddActivityInput = z.infer<typeof addActivitySchema>

export function isApplicationStatus(value: string): value is ApplicationStatus {
  return APPLICATION_STATUSES.includes(value as ApplicationStatus)
}

const STATUS_PRIORITY: Record<ApplicationStatus, number> = {
  OFFER: 6,
  INTERVIEWING: 5,
  CONTACTING: 4,
  APPLIED: 3,
  REJECTED: 2,
  WITHDRAWN: 1,
}

export function deriveJobApplicationStatus(statuses: readonly string[]): ApplicationStatus | null {
  return statuses
    .filter(isApplicationStatus)
    .sort((left, right) => STATUS_PRIORITY[right] - STATUS_PRIORITY[left])[0] ?? null
}

