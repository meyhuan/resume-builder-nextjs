import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ApplicationNotFoundError } from '@/lib/applications/application-service'
import type { CreateInterviewInput, OutcomeInput, UpdateInterviewInput } from '@/lib/interviews/interview-contracts'

export class InterviewNotFoundError extends Error {}

async function getApplicationForUser(userId: string, applicationId: string) {
  const application = await prisma.application.findFirst({ where: { id: applicationId, job: { userId } } })
  if (!application) throw new ApplicationNotFoundError('Application not found')
  return application
}

export async function createInterview(userId: string, applicationId: string, input: CreateInterviewInput) {
  const application = await getApplicationForUser(userId, applicationId)
  const occurredAt = input.scheduledAt ? new Date(input.scheduledAt) : new Date()
  return prisma.$transaction(async (tx) => {
    const interview = await tx.interview.create({
      data: {
        jobId: application.jobId,
        applicationId,
        round: input.round,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        interviewer: input.interviewer,
        questions: input.questions,
        answers: input.answers,
        review: input.review,
        nextActions: input.nextActions,
        result: input.result,
      },
    })
    await tx.jobActivity.create({ data: { jobId: application.jobId, applicationId, type: 'INTERVIEW', occurredAt, note: `${input.round}${input.interviewer ? ` · ${input.interviewer}` : ''}`, metadata: { interviewId: interview.id } as Prisma.InputJsonValue } })
    if (application.status !== 'OFFER') {
      await tx.application.update({ where: { id: applicationId }, data: { status: 'INTERVIEWING' } })
      await tx.job.update({ where: { id: application.jobId }, data: { status: 'INTERVIEWING' } })
      if (application.status !== 'INTERVIEWING') await tx.jobActivity.create({ data: { jobId: application.jobId, applicationId, type: 'STATUS_CHANGE', fromStatus: application.status, toStatus: 'INTERVIEWING', occurredAt: new Date() } })
    }
    return interview
  })
}

export async function updateInterview(userId: string, interviewId: string, input: UpdateInterviewInput) {
  const interview = await prisma.interview.findFirst({ where: { id: interviewId, job: { userId } } })
  if (!interview) throw new InterviewNotFoundError('Interview not found')
  return prisma.interview.update({
    where: { id: interview.id },
    data: {
      round: input.round,
      scheduledAt: input.scheduledAt === '' || input.scheduledAt === null ? null : input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      interviewer: input.interviewer,
      questions: input.questions,
      answers: input.answers,
      review: input.review,
      nextActions: input.nextActions,
      result: input.result,
    },
  })
}

export async function deleteInterview(userId: string, interviewId: string): Promise<void> {
  const deleted = await prisma.interview.deleteMany({ where: { id: interviewId, job: { userId } } })
  if (deleted.count === 0) throw new InterviewNotFoundError('Interview not found')
}

function outcomeApplicationStatus(input: OutcomeInput): 'OFFER' | 'REJECTED' | 'WITHDRAWN' | null {
  if (input.result === 'OFFER' || input.offerReceived) return 'OFFER'
  if (input.result === 'REJECTED') return 'REJECTED'
  if (input.result === 'WITHDRAWN') return 'WITHDRAWN'
  return null
}

export async function saveOutcome(userId: string, applicationId: string, input: OutcomeInput) {
  const application = await getApplicationForUser(userId, applicationId)
  return prisma.$transaction(async (tx) => {
    const outcome = await tx.outcome.upsert({
      where: { applicationId },
      create: { jobId: application.jobId, applicationId, ...input, reasonCodes: input.reasonCodes },
      update: { ...input, reasonCodes: input.reasonCodes, submittedAt: new Date() },
    })
    const nextStatus = outcomeApplicationStatus(input)
    if (nextStatus && nextStatus !== application.status) {
      await tx.application.update({ where: { id: applicationId }, data: { status: nextStatus } })
      await tx.job.update({ where: { id: application.jobId }, data: { status: nextStatus } })
      await tx.jobActivity.create({ data: { jobId: application.jobId, applicationId, type: 'STATUS_CHANGE', fromStatus: application.status, toStatus: nextStatus, occurredAt: new Date(), note: input.note } })
    }
    await tx.jobActivity.create({ data: { jobId: application.jobId, applicationId, type: 'OUTCOME', occurredAt: new Date(), note: input.note, metadata: { result: input.result, outcomeId: outcome.id } as Prisma.InputJsonValue } })
    return outcome
  })
}
