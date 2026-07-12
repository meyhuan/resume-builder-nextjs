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

function groundedFallbackMaterial(context: Awaited<ReturnType<typeof loadMaterialContext>>, type: JobMaterialType): string {
  const factLines = context.facts.map((fact) => `- ${fact.label}：${fact.text.replace(/\n+/g, '；')}`).join('\n')
  const target = `${context.job.company ? `${context.job.company}的` : ''}${context.job.role}`
  const shared = `以下内容仅整理自已确认事实：\n${factLines}`
  switch (type) {
    case 'SELF_INTRO':
      return `## 简短版本\n我正在应聘${target}。${shared}\n\n## 标准版本\n我正在应聘${target}。${shared}\n\n## 详细版本\n我正在应聘${target}。${shared}`
    case 'COVER_LETTER':
      return `您好：\n\n我希望应聘${target}。\n\n${shared}\n\n这些是我希望在后续沟通中进一步介绍的真实经历。感谢阅读。`
    case 'OUTREACH':
      return `## 招聘平台首句\n您好，我希望应聘${target}。\n\n## 经历摘要\n${shared}\n\n## 跟进话术\n您好，想跟进${target}的投递进展。如需补充材料，我会及时提供。`
    case 'PROJECT_STORY':
      return `## 可讲述的真实经历\n${shared}\n\n## 待补充\n- [待补充：项目背景]\n- [待补充：个人行动的更多细节]\n- [待补充：面试官追问与回答]`
    case 'INTERVIEW_PREP':
      return `## 已确认经历\n${shared}\n\n## 建议准备的问题\n- 请介绍与${context.job.role}相关的一段真实经历。\n- 这段经历中你采取了哪些行动？\n- 哪些结果能够由现有事实直接证明？\n\n## 待补充\n- [待补充：为什么选择该岗位]\n- [待补充：希望向面试官了解的问题]`
  }
}

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
          '不得把岗位 JD 的要求写成候选人已经具备的经历或能力。不得推断用户类型、访谈对象、团队角色、测试方法、指标、迭代次数或持续周期。',
          '不得新增派生百分比或根据已有数字计算新数字。事实只写了“用户”时，不得改写成 HR、求职者、猎头等具体身份。',
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
  materialResponseSchema.parse(JSON.parse(raw))
  const sourceFactIds = context.facts.map((fact) => fact.id)
  // Candidate-facing prose must be auditable. Until claim-level verification can
  // prove every generated Chinese assertion, publish the deterministic rendering
  // of confirmed facts and treat the model response as an untrusted draft.
  const materialText = groundedFallbackMaterial(context, type)

  const content: JobMaterialContent = { format: 'markdown', text: materialText }
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
