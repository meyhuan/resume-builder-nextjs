import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { JobNotFoundError } from '@/lib/jobs/job-service'
import { deriveJobApplicationStatus, type AddActivityInput, type CreateApplicationInput, type UpdateApplicationInput } from '@/lib/applications/application-contracts'

export class ApplicationNotFoundError extends Error {}
export class InvalidApplicationAssetError extends Error {}

async function validateJobAssets(userId: string, jobId: string, resumeId: string | null | undefined, materialIds: readonly string[]) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, userId },
    include: { tailoredResume: { select: { id: true } }, materials: { select: { id: true } } },
  })
  if (!job) throw new JobNotFoundError('Job not found')
  if (resumeId && resumeId !== job.tailoredResume?.id) throw new InvalidApplicationAssetError('Resume does not belong to this Job')
  const validMaterialIds = new Set(job.materials.map((material) => material.id))
  if (materialIds.some((id) => !validMaterialIds.has(id))) throw new InvalidApplicationAssetError('Material does not belong to this Job')
  return job
}

export async function createApplication(userId: string, jobId: string, input: CreateApplicationInput) {
  const job = await validateJobAssets(userId, jobId, input.resumeId, input.materialIds)
  const appliedAt = new Date(input.appliedAt)
  return prisma.$transaction(async (tx) => {
    const application = await tx.application.create({
      data: {
        jobId,
        channel: input.channel,
        appliedAt,
        resumeId: input.resumeId || job.tailoredResume?.id,
        materialIds: input.materialIds,
        contactName: input.contactName,
        contactInfo: input.contactInfo,
        nextActionAt: input.nextActionAt ? new Date(input.nextActionAt) : null,
        note: input.note,
      },
    })
    await tx.jobActivity.create({
      data: {
        jobId,
        applicationId: application.id,
        type: 'STATUS_CHANGE',
        toStatus: 'APPLIED',
        occurredAt: appliedAt,
        note: input.note,
        metadata: { channel: input.channel } as Prisma.InputJsonValue,
      },
    })
    await tx.job.update({ where: { id: jobId }, data: { status: 'APPLIED' } })
    return application
  })
}

export async function updateApplication(userId: string, applicationId: string, input: UpdateApplicationInput) {
  const existing = await prisma.application.findFirst({
    where: { id: applicationId, job: { userId } },
    include: { job: { select: { id: true, status: true } } },
  })
  if (!existing) throw new ApplicationNotFoundError('Application not found')
  const statusChanged = Boolean(input.status && input.status !== existing.status)

  return prisma.$transaction(async (tx) => {
    const application = await tx.application.update({
      where: { id: existing.id },
      data: {
        channel: input.channel,
        appliedAt: input.appliedAt ? new Date(input.appliedAt) : undefined,
        status: input.status,
        contactName: input.contactName,
        contactInfo: input.contactInfo,
        nextActionAt: input.nextActionAt === '' || input.nextActionAt === null ? null : input.nextActionAt ? new Date(input.nextActionAt) : undefined,
        note: input.note,
      },
    })
    if (statusChanged && input.status) {
      await tx.jobActivity.create({
        data: {
          jobId: existing.job.id,
          applicationId: existing.id,
          type: 'STATUS_CHANGE',
          fromStatus: existing.status,
          toStatus: input.status,
          occurredAt: new Date(),
          note: input.note ?? undefined,
        },
      })
      const otherStatuses = await tx.application.findMany({ where: { jobId: existing.job.id }, select: { status: true } })
      const nextJobStatus = deriveJobApplicationStatus(otherStatuses.map((item) => item.status))
      if (nextJobStatus) await tx.job.update({ where: { id: existing.job.id }, data: { status: nextJobStatus } })
    }
    return application
  })
}

export async function addApplicationActivity(userId: string, applicationId: string, input: AddActivityInput) {
  const application = await prisma.application.findFirst({ where: { id: applicationId, job: { userId } }, select: { id: true, jobId: true } })
  if (!application) throw new ApplicationNotFoundError('Application not found')
  return prisma.jobActivity.create({
    data: {
      jobId: application.jobId,
      applicationId: application.id,
      type: input.type,
      note: input.note,
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
    },
  })
}

export async function deleteApplication(userId: string, applicationId: string): Promise<void> {
  const existing = await prisma.application.findFirst({
    where: { id: applicationId, job: { userId } },
    include: { job: { select: { id: true, lastExportedAt: true } } },
  })
  if (!existing) throw new ApplicationNotFoundError('Application not found')
  await prisma.$transaction(async (tx) => {
    await tx.application.delete({ where: { id: existing.id } })
    const remaining = await tx.application.findMany({ where: { jobId: existing.job.id }, select: { status: true } })
    const status = deriveJobApplicationStatus(remaining.map((item) => item.status)) ?? (existing.job.lastExportedAt ? 'EXPORTED' : 'READY')
    await tx.job.update({ where: { id: existing.job.id }, data: { status } })
  })
}

