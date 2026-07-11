import { z } from 'zod'

export const INTERVIEW_RESULTS = ['PENDING', 'PASSED', 'FAILED', 'CANCELLED'] as const
export type InterviewResult = (typeof INTERVIEW_RESULTS)[number]
export const INTERVIEW_RESULT_LABEL: Record<InterviewResult, string> = { PENDING: '待进行/待确认', PASSED: '已通过', FAILED: '未通过', CANCELLED: '已取消' }

const stringArray = z.array(z.string().trim().min(1).max(2000)).max(50)
export const createInterviewSchema = z.object({
  round: z.string().trim().min(1, '请填写面试轮次').max(80),
  scheduledAt: z.union([z.string().datetime({ offset: true }), z.literal('')]).optional().transform((value) => value || undefined),
  interviewer: z.string().trim().max(120).optional().transform((value) => value || undefined),
  questions: stringArray.default([]),
  answers: stringArray.default([]),
  review: z.string().trim().max(10000).optional().transform((value) => value || undefined),
  nextActions: stringArray.default([]),
  result: z.enum(INTERVIEW_RESULTS).default('PENDING'),
})
export const updateInterviewSchema = z.object({
  round: z.string().trim().min(1).max(80).optional(),
  scheduledAt: z.union([z.string().datetime({ offset: true }), z.literal(''), z.null()]).optional(),
  interviewer: z.string().trim().max(120).nullable().optional(),
  questions: stringArray.optional(),
  answers: stringArray.optional(),
  review: z.string().trim().max(10000).nullable().optional(),
  nextActions: stringArray.optional(),
  result: z.enum(INTERVIEW_RESULTS).optional(),
})

export const OUTCOME_RESULTS = ['ONGOING', 'OFFER', 'REJECTED', 'WITHDRAWN', 'NO_RESPONSE'] as const
export type OutcomeResult = (typeof OUTCOME_RESULTS)[number]
export const OUTCOME_RESULT_LABEL: Record<OutcomeResult, string> = { ONGOING: '仍在进行', OFFER: '获得 Offer', REJECTED: '未通过', WITHDRAWN: '主动放弃', NO_RESPONSE: '暂无回复' }

export const OUTCOME_REASON_CODES = ['ROLE_MISMATCH', 'EXPERIENCE_GAP', 'SKILL_GAP', 'SALARY', 'LOCATION', 'TIMING', 'PERSONAL_CHOICE', 'UNKNOWN'] as const
export const OUTCOME_REASON_LABEL: Record<(typeof OUTCOME_REASON_CODES)[number], string> = { ROLE_MISMATCH: '岗位匹配不足', EXPERIENCE_GAP: '经验年限', SKILL_GAP: '技能要求', SALARY: '薪资原因', LOCATION: '地点原因', TIMING: '招聘时间变化', PERSONAL_CHOICE: '个人选择', UNKNOWN: '原因不明确' }

export const outcomeSchema = z.object({
  result: z.enum(OUTCOME_RESULTS),
  replyReceived: z.boolean(),
  interviewReached: z.number().int().min(0).max(20),
  offerReceived: z.boolean(),
  reasonCodes: z.array(z.enum(OUTCOME_REASON_CODES)).max(8).default([]),
  note: z.string().trim().max(6000).optional().transform((value) => value || undefined),
})

export type CreateInterviewInput = z.infer<typeof createInterviewSchema>
export type UpdateInterviewInput = z.infer<typeof updateInterviewSchema>
export type OutcomeInput = z.infer<typeof outcomeSchema>
