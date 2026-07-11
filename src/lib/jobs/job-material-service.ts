import 'server-only'

import { createHash } from 'node:crypto'
import OpenAI from 'openai'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { getDefaultModel, resolveApiKey } from '@/lib/ai/ai-runtime-config'
import { parseResumeFacts } from '@/lib/jobs/fact-extractor'
import { isJobMaterialType, JOB_MATERIAL_META, type JobMaterialContent, type JobMaterialType } from '@/lib/jobs/job-material-contracts'
import { JobNotFoundError } from '@/lib/jobs/job-service'
import { prisma } from '@/lib/prisma'
import { checkQuota, peekQuota } from '@/lib/quota/quota-checker'

const materialResponseSchema = z.object({
  content: z.string().trim().min(20).max(12000),
  sourceFactIds: z.array(z.string().min(1)).min(1),
})

export class MaterialFactsNotConfirmedError extends Error {}
export class MaterialQuotaExceededError extends Error {}
export class MaterialNotFoundError extends Error {}

function redactJd(value: string): string {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[邮箱已隐藏]')
    .replace(/(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d{9}(?!\d)/g, '[手机号已隐藏]')
    .slice(0, 5000)
}

async function loadMaterialContext(userId: string, jobId: string) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, userId },
    include: { factSet: true, materials: true },
  })
  if (!job) throw new JobNotFoundError('Job not found')
  const confirmedIds = Array.isArray(job.factSet.confirmedFactIds)
    ? job.factSet.confirmedFactIds.filter((value): value is string => typeof value === 'string')
    : []
  if (!job.factSet.confirmedAt || confirmedIds.length === 0) throw new MaterialFactsNotConfirmedError('Facts are not confirmed')
  const idSet = new Set(confirmedIds)
  const facts = parseResumeFacts(job.factSet.facts).filter((fact) => idSet.has(fact.id))
  if (facts.length === 0) throw new MaterialFactsNotConfirmedError('No confirmed facts')
  return { job, facts, confirmedIds }
}

function createMaterialInputHash(context: Awaited<ReturnType<typeof loadMaterialContext>>, type: JobMaterialType): string {
  return createHash('sha256').update(JSON.stringify({
    type,
    role: context.job.role,
    company: context.job.company,
    jd: context.job.jd,
    identity: context.job.identity,
    revision: context.job.factSet.revision,
    confirmedIds: [...context.confirmedIds].sort(),
  })).digest('hex')
}

function parseGenerationInputHash(value: Prisma.JsonValue | null): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return typeof (value as Record<string, unknown>).inputHash === 'string'
    ? (value as Record<string, unknown>).inputHash as string
    : null
}

export async function generateJobMaterial(userId: string, jobId: string, type: JobMaterialType, regenerate = false) {
  const context = await loadMaterialContext(userId, jobId)
  const existing = context.job.materials.find((material) => material.type === type)
  const inputHash = createMaterialInputHash(context, type)
  if (!regenerate && existing && parseGenerationInputHash(existing.generationMeta) === inputHash) return { material: existing, cached: true, remaining: null }

  const quota = await peekQuota('ai:generate-section')
  if (!quota.allowed) throw new MaterialQuotaExceededError(quota.message)

  const meta = JOB_MATERIAL_META[type]
  const model = getDefaultModel()
  const client = new OpenAI({ apiKey: resolveApiKey(model), baseURL: model.baseUrl })
  const response = await client.chat.completions.create({
    model: model.name,
    messages: [
      {
        role: 'system',
        content: [
          '你是严谨的中文求职材料编辑。只能使用用户确认的事实，不得新增经历、职责、技能、工具、数字、奖项或公司信息。',
          '如果材料需要的信息在事实中不存在，使用“[待补充：具体信息]”标注，绝不自行补齐。',
          '输出自然、克制、可直接由用户继续编辑的中文 Markdown，不使用 HTML。',
          `当前材料要求：${meta.outputGuide}`,
          '仅输出合法 JSON：{"content":"Markdown 文本","sourceFactIds":["事实ID"]}。sourceFactIds 只能引用输入事实。',
        ].join('\n'),
      },
      {
        role: 'user',
        content: JSON.stringify({
          materialType: type,
          company: context.job.company,
          role: context.job.role,
          identity: context.job.identity,
          jobDescription: redactJd(context.job.jd),
          confirmedFacts: context.facts,
        }),
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.25,
    max_tokens: 6000,
  })
  const raw = response.choices[0]?.message?.content
  if (!raw) throw new Error('AI returned empty material')
  const parsed = materialResponseSchema.parse(JSON.parse(raw))
  const validIds = new Set(context.facts.map((fact) => fact.id))
  const sourceFactIds = [...new Set(parsed.sourceFactIds)].filter((id) => validIds.has(id))
  if (sourceFactIds.length === 0) throw new Error('AI material has no valid fact source')

  const content: JobMaterialContent = { format: 'markdown', text: parsed.content }
  const material = await prisma.jobMaterial.upsert({
    where: { jobId_type: { jobId, type } },
    create: {
      jobId,
      type,
      title: meta.title,
      content: content as unknown as Prisma.InputJsonValue,
      sourceFactIds,
      generationMeta: {
        inputHash,
        factSetRevision: context.job.factSet.revision,
        model: model.name,
        generatedAt: new Date().toISOString(),
        userEdited: false,
      },
    },
    update: {
      title: meta.title,
      content: content as unknown as Prisma.InputJsonValue,
      sourceFactIds,
      generationMeta: {
        inputHash,
        factSetRevision: context.job.factSet.revision,
        model: model.name,
        generatedAt: new Date().toISOString(),
        userEdited: false,
      },
    },
  })
  const consumed = await checkQuota('ai:generate-section')
  return { material, cached: false, remaining: consumed.remaining }
}

export async function updateJobMaterial(userId: string, jobId: string, materialId: string, input: { title?: string; text: string }) {
  const material = await prisma.jobMaterial.findFirst({ where: { id: materialId, jobId, job: { userId } } })
  if (!material) throw new MaterialNotFoundError('Material not found')
  const currentMeta = material.generationMeta && typeof material.generationMeta === 'object' && !Array.isArray(material.generationMeta)
    ? material.generationMeta as Record<string, Prisma.JsonValue>
    : {}
  const content: JobMaterialContent = { format: 'markdown', text: input.text }
  return prisma.jobMaterial.update({
    where: { id: material.id },
    data: {
      title: input.title?.trim() || material.title,
      content: content as unknown as Prisma.InputJsonValue,
      generationMeta: { ...currentMeta, userEdited: true, editedAt: new Date().toISOString() } as Prisma.InputJsonValue,
    },
  })
}

export async function deleteJobMaterial(userId: string, jobId: string, materialId: string): Promise<void> {
  const deleted = await prisma.jobMaterial.deleteMany({ where: { id: materialId, jobId, job: { userId } } })
  if (deleted.count === 0) throw new MaterialNotFoundError('Material not found')
}

export function parseMaterialTypeOrThrow(value: string): JobMaterialType {
  if (!isJobMaterialType(value)) throw new MaterialNotFoundError('Unknown material type')
  return value
}

