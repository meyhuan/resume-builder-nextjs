import { prisma } from '@/lib/prisma'

export const MAX_RESUME_COUNT = 50
export const RESUME_LIMIT_EXCEEDED_CODE = 'RESUME_LIMIT_EXCEEDED'
export const RESUME_LIMIT_EXCEEDED_MESSAGE = `您创建的简历数量已达到上限（${MAX_RESUME_COUNT}份），请删除不需要的简历后再创建新的简历`

export class ResumeLimitExceededError extends Error {
  readonly code = RESUME_LIMIT_EXCEEDED_CODE
  readonly limit = MAX_RESUME_COUNT
  readonly count: number

  constructor(count: number) {
    super(RESUME_LIMIT_EXCEEDED_MESSAGE)
    this.name = 'ResumeLimitExceededError'
    this.count = count
  }
}

export function isResumeLimitExceededError(error: unknown): error is ResumeLimitExceededError {
  return error instanceof ResumeLimitExceededError
}

export async function assertCanCreateResumeForUserId(userId: string): Promise<void> {
  const count = await prisma.resume.count({ where: { userId } })
  if (count >= MAX_RESUME_COUNT) {
    throw new ResumeLimitExceededError(count)
  }
}

export async function assertCanCreateResumeForWxId(wxId: string): Promise<void> {
  const count = await prisma.resume.count({ where: { user: { wxId } } })
  if (count >= MAX_RESUME_COUNT) {
    throw new ResumeLimitExceededError(count)
  }
}
