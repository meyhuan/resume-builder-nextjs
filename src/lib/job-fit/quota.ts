import 'server-only'

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { checkVipStatusForWxId } from '@/lib/api/vip-api'
import { DEFAULT_QUOTA_LIMITS } from '@/lib/quota/quota-config'

const FEATURE = 'ai:job-fit'

interface QuotaItem {
  used: number
  date: string
}

type QuotaJson = Record<string, QuotaItem>

export class JobFitQuotaExceededError extends Error {
  readonly code = 'JOB_FIT_QUOTA_EXCEEDED'
  constructor(readonly limit = DEFAULT_QUOTA_LIMITS.aiJobFit) {
    super(`今日岗位定制次数已用完（${limit}次/天），升级 VIP 可无限使用`)
  }
}

export async function reserveJobFitQuota(taskId: string, userId: string, wxId: string): Promise<void> {
  const current = await prisma.jobFitTask.findFirst({ where: { id: taskId, userId }, select: { quotaState: true } })
  if (!current) throw new Error('JOB_FIT_TASK_NOT_FOUND')
  if (current.quotaState === 'RESERVED' || current.quotaState === 'COMMITTED') return

  const { isVip } = await checkVipStatusForWxId(wxId)
  if (isVip) {
    await prisma.jobFitTask.updateMany({
      where: { id: taskId, userId, quotaState: { in: ['NONE', 'RELEASED'] } },
      data: { quotaState: 'RESERVED', quotaDate: 'vip' },
    })
    return
  }

  const today = dateKey(new Date())
  await prisma.userQuota.upsert({ where: { userId }, update: {}, create: { userId, quotas: {} } })
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "userId" FROM "UserQuota" WHERE "userId" = ${userId} FOR UPDATE`
    const lockedTask = await tx.jobFitTask.findFirst({ where: { id: taskId, userId }, select: { quotaState: true } })
    if (!lockedTask) throw new Error('JOB_FIT_TASK_NOT_FOUND')
    if (lockedTask.quotaState === 'RESERVED' || lockedTask.quotaState === 'COMMITTED') return
    const record = await tx.userQuota.findUniqueOrThrow({ where: { userId } })
    const quotas = ((record.quotas as unknown as QuotaJson) ?? {})
    const item = quotas[FEATURE]
    const used = item?.date === today ? item.used : 0
    if (used >= DEFAULT_QUOTA_LIMITS.aiJobFit) throw new JobFitQuotaExceededError()
    quotas[FEATURE] = { used: used + 1, date: today }
    await tx.userQuota.update({ where: { userId }, data: { quotas: quotas as unknown as Prisma.InputJsonValue } })
    await tx.jobFitTask.update({ where: { id: taskId }, data: { quotaState: 'RESERVED', quotaDate: today } })
  })
}

export async function commitJobFitQuota(taskId: string): Promise<void> {
  await prisma.jobFitTask.updateMany({
    where: { id: taskId, quotaState: 'RESERVED' },
    data: { quotaState: 'COMMITTED' },
  })
}

export async function releaseJobFitQuota(taskId: string): Promise<void> {
  const task = await prisma.jobFitTask.findUnique({ where: { id: taskId }, select: { userId: true, quotaState: true, quotaDate: true } })
  if (!task || task.quotaState !== 'RESERVED') return
  if (task.quotaDate === 'vip') {
    await prisma.jobFitTask.updateMany({ where: { id: taskId, quotaState: 'RESERVED' }, data: { quotaState: 'RELEASED' } })
    return
  }
  await prisma.userQuota.upsert({ where: { userId: task.userId }, update: {}, create: { userId: task.userId, quotas: {} } })
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "userId" FROM "UserQuota" WHERE "userId" = ${task.userId} FOR UPDATE`
    const lockedTask = await tx.jobFitTask.findUnique({ where: { id: taskId }, select: { quotaState: true, quotaDate: true } })
    if (!lockedTask || lockedTask.quotaState !== 'RESERVED') return
    const record = await tx.userQuota.findUniqueOrThrow({ where: { userId: task.userId } })
    const quotas = ((record.quotas as unknown as QuotaJson) ?? {})
    const item = quotas[FEATURE]
    if (item && item.date === lockedTask.quotaDate) {
      quotas[FEATURE] = { ...item, used: Math.max(0, item.used - 1) }
      await tx.userQuota.update({ where: { userId: task.userId }, data: { quotas: quotas as unknown as Prisma.InputJsonValue } })
    }
    await tx.jobFitTask.update({ where: { id: taskId }, data: { quotaState: 'RELEASED' } })
  })
}

function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
