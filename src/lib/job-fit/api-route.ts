import 'server-only'

import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireJobFitUser, JobFitAuthError } from './auth'
import { JobFitQuotaExceededError } from './quota'

interface JobFitApiUser {
  readonly id: string
  readonly wxId: string
}

export function withJobFitApi<TContext>(
  handler: (request: Request, context: TContext, user: JobFitApiUser) => Promise<Response>,
): (request: Request, context: TContext) => Promise<Response> {
  return async (request, context) => {
    try {
      const user = await requireJobFitUser()
      return await handler(request, context, user)
    } catch (error) {
      return jobFitApiError(error)
    }
  }
}

export function jobFitApiError(error: unknown): NextResponse {
  if (error instanceof JobFitAuthError) return NextResponse.json({ error: error.message, code: error.code, retryable: false }, { status: error.status })
  if (error instanceof JobFitQuotaExceededError) return NextResponse.json({ error: error.message, code: error.code, retryable: false }, { status: 429 })
  if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? '提交内容不完整', code: 'INVALID_INPUT', retryable: false }, { status: 400 })
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return NextResponse.json({ error: '重复提交，请继续查看已有任务', code: 'DUPLICATE_TASK', retryable: true }, { status: 409 })
  console.error('[job-fit-api]', error)
  return NextResponse.json({ error: '岗位定制服务暂时不可用', code: 'INTERNAL_ERROR', retryable: true }, { status: 500 })
}
