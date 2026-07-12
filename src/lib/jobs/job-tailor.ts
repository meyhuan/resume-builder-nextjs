import 'server-only'

import { createHash, randomUUID } from 'node:crypto'
import OpenAI from 'openai'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import type { ResumeData } from '@/entities/resume/resume-data'
import { normalizeResumeContent } from '@/entities/resume/normalize-resume-content'
import { getDefaultModel, resolveApiKey } from '@/lib/ai/ai-runtime-config'
import { extractResumeFacts, parseResumeFacts, type ResumeFact } from '@/lib/jobs/fact-extractor'
import { JobNotFoundError } from '@/lib/jobs/job-service'
import { prisma } from '@/lib/prisma'
import { checkQuota, peekQuota } from '@/lib/quota/quota-checker'
import { analyzeJdMatch } from '@/lib/seo/jd-match'

export interface JobTailorSuggestion {
  readonly id: string
  readonly blockId: string
  readonly label: string
  readonly originalHtml: string
  readonly proposedHtml: string
  readonly reason: string
  readonly matchedKeywords: readonly string[]
  readonly sourceFactIds: readonly string[]
}

export interface JobSuggestionSet {
  readonly schemaVersion: 1
  readonly id: string
  readonly requestId: string
  readonly inputHash: string
  readonly factSetRevision: number
  readonly generatedAt: string
  readonly model: string
  readonly suggestions: readonly JobTailorSuggestion[]
  readonly appliedSuggestionIds?: readonly string[]
  readonly appliedAt?: string
}

interface OptimizableBlock {
  readonly blockId: string
  readonly type: 'experience' | 'project' | 'campus' | 'text'
  readonly label: string
  readonly originalHtml: string
}

const modelResponseSchema = z.object({
  suggestions: z.array(z.object({
    blockId: z.string().min(1),
    proposedHtml: z.string().min(1),
    reason: z.string().trim().min(1).max(400),
    matchedKeywords: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
    sourceFactIds: z.array(z.string().min(1)).min(1),
  })).max(30),
})

export class TailorInputStaleError extends Error {}
export class TailorNoContentError extends Error {}
export class TailorQuotaExceededError extends Error {}
export class SuggestionSetNotFoundError extends Error {}
export class SuggestionConflictError extends Error {
  constructor(readonly conflictIds: readonly string[]) { super('Tailored resume content changed') }
}

function getBlockHtml(block: ResumeBlock): string {
  if ('contentHtml' in block) return block.contentHtml || ''
  if ('html' in block) return block.html || ''
  return ''
}

function getBlockLabel(block: ResumeBlock, sectionTitle: string): string {
  if (block.type === 'experience') return [block.company, block.position].filter(Boolean).join(' · ') || sectionTitle
  if (block.type === 'project') return [block.name, block.role].filter(Boolean).join(' · ') || sectionTitle
  if (block.type === 'campus') return [block.organization, block.position].filter(Boolean).join(' · ') || sectionTitle
  return sectionTitle
}

function extractOptimizableBlocks(content: Prisma.JsonValue, resumeId: string, confirmedFacts: readonly ResumeFact[]): OptimizableBlock[] {
  const confirmedBlockIds = new Set(confirmedFacts.map((fact) => fact.blockId))
  const resume = normalizeResumeContent(content as unknown as Partial<ResumeData> & Record<string, unknown>, { fallbackId: resumeId })
  return resume.sections.flatMap((section) => section.blocks.flatMap((block) => {
    if (!['experience', 'project', 'campus', 'text'].includes(block.type) || !confirmedBlockIds.has(block.id)) return []
    const originalHtml = getBlockHtml(block)
    if (originalHtml.replace(/<[^>]*>/g, '').trim().length < 12) return []
    return [{
      blockId: block.id,
      type: block.type as OptimizableBlock['type'],
      label: getBlockLabel(block, section.title),
      originalHtml,
    }]
  }))
}

function sanitizeHtml(value: string): string {
  const allowed = new Set(['p', 'ul', 'ol', 'li', 'strong', 'em', 'br'])
  return value
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/?([a-z0-9]+)(?:\s[^>]*)?>/gi, (tag, rawName: string) => {
      const name = rawName.toLowerCase()
      if (!allowed.has(name)) return ''
      const closing = /^<\//.test(tag)
      if (name === 'br') return '<br>'
      return closing ? `</${name}>` : `<${name}>`
    })
    .trim()
}

function plainText(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&')
}

function comparableText(value: string): string {
  return plainText(value).replace(/[\s，。；：、！？,.!?:;()（）【】\x5B\x5D“”'"-]/g, '')
}

function claimTokens(value: string): Set<string> {
  const text = plainText(value)
  const tokens = text.match(/\d+(?:\.\d+)?%?|[A-Za-z][A-Za-z0-9+.-]*/g) ?? []
  return new Set(tokens.map((token) => token.toLowerCase()))
}

/** Reject the most dangerous hallucinations: new metrics, counts, acronyms, tools or audience labels. */
function hasOnlySupportedClaimTokens(proposedHtml: string, sourceFacts: readonly ResumeFact[]): boolean {
  const supported = claimTokens(sourceFacts.map((fact) => fact.text).join('\n'))
  return [...claimTokens(proposedHtml)].every((token) => supported.has(token))
}

function groundedFallbackSuggestions(input: Awaited<ReturnType<typeof loadTailorInput>>, requestId: string): JobTailorSuggestion[] {
  const candidates = ['AI', '用户研究', '需求分析', '原型设计', '数据分析', '企业服务', '招聘', '从 0 到 1']
  return input.blocks.flatMap((block, index) => {
    const keyword = candidates.find((item) => input.job.jd.includes(item) && plainText(block.originalHtml).includes(item))
    const sourceFact = input.confirmedFacts.find((fact) => fact.blockId === block.blockId)
    if (!keyword || !sourceFact) return []
    const proposedHtml = block.originalHtml.replace(keyword, `<strong>${keyword}</strong>`)
    if (proposedHtml === block.originalHtml) return []
    return [{
      id: `${requestId}:fallback:${index + 1}`,
      blockId: block.blockId,
      label: block.label,
      originalHtml: block.originalHtml,
      proposedHtml,
      reason: `突出原文中已经存在且与岗位相关的“${keyword}”，不增加任何新事实。`,
      matchedKeywords: [keyword],
      sourceFactIds: [sourceFact.id],
    }]
  })
}

function redactJd(value: string): string {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[邮箱已隐藏]')
    .replace(/(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d{9}(?!\d)/g, '[手机号已隐藏]')
    .slice(0, 5000)
}

function createInputHash(job: { jd: string; role: string; identity: string }, revision: number, confirmedIds: readonly string[], blocks: readonly OptimizableBlock[]): string {
  return createHash('sha256').update(JSON.stringify({
    role: job.role,
    jd: job.jd,
    identity: job.identity,
    revision,
    confirmedIds: [...confirmedIds].sort(),
    blocks,
  })).digest('hex')
}

export function parseSuggestionSet(value: Prisma.JsonValue | null): JobSuggestionSet | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  if (record.schemaVersion !== 1 || typeof record.id !== 'string' || typeof record.inputHash !== 'string' || !Array.isArray(record.suggestions)) return null
  return value as unknown as JobSuggestionSet
}

async function loadTailorInput(userId: string, jobId: string) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, userId },
    include: { factSet: true, tailoredResume: true },
  })
  if (!job || !job.tailoredResume) throw new JobNotFoundError('Job workspace not found')
  const tailoredResume = job.tailoredResume
  const allFacts = parseResumeFacts(job.factSet.facts)
  const confirmedIds = Array.isArray(job.factSet.confirmedFactIds)
    ? job.factSet.confirmedFactIds.filter((value): value is string => typeof value === 'string')
    : []
  if (!job.factSet.confirmedAt || confirmedIds.length === 0) throw new TailorInputStaleError('Facts are not confirmed')
  const confirmedSet = new Set(confirmedIds)
  const confirmedFacts = allFacts.filter((fact) => confirmedSet.has(fact.id))
  const blocks = extractOptimizableBlocks(tailoredResume.content, tailoredResume.id, confirmedFacts)
  if (blocks.length === 0) throw new TailorNoContentError('No optimizable content')
  const inputHash = createInputHash(job, job.factSet.revision, confirmedIds, blocks)
  return { job, tailoredResume, confirmedIds, confirmedFacts, blocks, inputHash }
}

function buildPrompt(input: Awaited<ReturnType<typeof loadTailorInput>>): { system: string; user: string } {
  const system = [
    '你是严谨的中文求职材料编辑，只能基于用户已确认的真实事实调整简历表达。',
    '禁止新增公司、职位、项目、学历、日期、职责、工具、指标或成果。禁止把“参与/协助”升级成“主导/负责”。',
    '禁止推断原文未写明的用户身份、访谈数量、团队角色、方法、指标或百分比；即使可以计算，也不得新增派生数字。',
    'JD 中出现但确认事实中没有明确出现的关键词，只能在 reason 中说明缺口，不能写进 proposedHtml。',
    '只能修改收到的正文 block，不修改标题字段，不增加、删除或排序 block。',
    '每条建议必须引用至少一个 sourceFactId；如果事实不足则不要输出该 block 的建议。',
    '建议应自然匹配 JD，不要机械堆砌关键词。',
    'proposedHtml 只允许 p、ul、ol、li、strong、em、br 标签，不允许任何属性。',
    '仅输出合法 JSON：{"suggestions":[{"blockId":"...","proposedHtml":"...","reason":"...","matchedKeywords":[],"sourceFactIds":[]}]}。',
  ].join('\n')
  const user = JSON.stringify({
    targetRole: input.job.role,
    identity: input.job.identity,
    jobDescription: redactJd(input.job.jd),
    confirmedFacts: input.confirmedFacts,
    editableBlocks: input.blocks,
  })
  return { system, user }
}

export async function generateJobSuggestions(userId: string, jobId: string, regenerate = false) {
  const input = await loadTailorInput(userId, jobId)
  const cached = parseSuggestionSet(input.job.suggestionSet)
  const cachedIsGrounded = cached?.suggestions.every((suggestion) => {
    const sourceFacts = suggestion.sourceFactIds.map((id) => input.confirmedFacts.find((fact) => fact.id === id)).filter((fact): fact is ResumeFact => Boolean(fact))
    return sourceFacts.length > 0 && hasOnlySupportedClaimTokens(suggestion.proposedHtml, sourceFacts)
  })
  if (!regenerate && cached?.inputHash === input.inputHash && cached.suggestions.length > 0 && cachedIsGrounded) {
    return { suggestionSet: cached, cached: true, remaining: null }
  }

  const quota = await peekQuota('ai:optimize-resume')
  if (!quota.allowed) throw new TailorQuotaExceededError(quota.message)

  const model = getDefaultModel()
  const client = new OpenAI({ apiKey: resolveApiKey(model), baseURL: model.baseUrl })
  const prompt = buildPrompt(input)
  const completion = await client.chat.completions.create({
    model: model.name,
    messages: [{ role: 'system', content: prompt.system }, { role: 'user', content: prompt.user }],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 8192,
  })
  const raw = completion.choices[0]?.message?.content
  if (!raw) throw new TailorNoContentError('AI returned no content')
  const parsed = modelResponseSchema.parse(JSON.parse(raw))

  const requestId = randomUUID()
  const blockMap = new Map(input.blocks.map((block) => [block.blockId, block]))
  const factMap = new Map(input.confirmedFacts.map((fact) => [fact.id, fact]))
  const suggestedBlockIds = new Set<string>()
  let suggestions: JobTailorSuggestion[] = parsed.suggestions.flatMap((item, index) => {
    const block = blockMap.get(item.blockId)
    const sourceFacts = [...new Set(item.sourceFactIds)].map((id) => factMap.get(id)).filter((fact): fact is ResumeFact => Boolean(fact))
    if (!block || suggestedBlockIds.has(item.blockId) || sourceFacts.length === 0 || !sourceFacts.some((fact) => fact.blockId === block.blockId)) return []
    const proposedHtml = sanitizeHtml(item.proposedHtml)
    if (!proposedHtml || proposedHtml === block.originalHtml || !hasOnlySupportedClaimTokens(proposedHtml, sourceFacts) || comparableText(proposedHtml) !== comparableText(block.originalHtml)) return []
    suggestedBlockIds.add(item.blockId)
    return [{
      id: `${requestId}:${index + 1}`,
      blockId: block.blockId,
      label: block.label,
      originalHtml: block.originalHtml,
      proposedHtml,
      reason: item.reason,
      matchedKeywords: [...new Set(item.matchedKeywords)],
      sourceFactIds: sourceFacts.map((fact) => fact.id),
    }]
  })
  if (suggestions.length === 0) suggestions = groundedFallbackSuggestions(input, requestId)
  if (suggestions.length === 0) throw new TailorNoContentError('No valid suggestions')

  const suggestionSet: JobSuggestionSet = {
    schemaVersion: 1,
    id: randomUUID(),
    requestId,
    inputHash: input.inputHash,
    factSetRevision: input.job.factSet.revision,
    generatedAt: new Date().toISOString(),
    model: model.name,
    suggestions,
  }
  await prisma.job.update({ where: { id: input.job.id }, data: { suggestionSet: suggestionSet as unknown as Prisma.InputJsonValue } })
  const consumed = await checkQuota('ai:optimize-resume')
  return { suggestionSet, cached: false, remaining: consumed.remaining }
}

function replaceBlockHtml(content: Prisma.JsonValue, resumeId: string, replacements: ReadonlyMap<string, string>): Prisma.InputJsonValue {
  const resume = normalizeResumeContent(content as unknown as Partial<ResumeData> & Record<string, unknown>, { fallbackId: resumeId })
  for (const section of resume.sections) {
    for (const block of section.blocks) {
      const replacement = replacements.get(block.id)
      if (!replacement) continue
      if ('contentHtml' in block) (block as { contentHtml: string }).contentHtml = replacement
      else if ('html' in block) (block as { html: string }).html = replacement
    }
  }
  return resume as unknown as Prisma.InputJsonValue
}

export async function applyJobSuggestions(userId: string, jobId: string, suggestionSetId: string, acceptedSuggestionIds: readonly string[]) {
  const input = await loadTailorInput(userId, jobId)
  const set = parseSuggestionSet(input.job.suggestionSet)
  if (!set || set.id !== suggestionSetId || set.inputHash !== input.inputHash) throw new SuggestionSetNotFoundError('Suggestion set is stale')
  const acceptedSet = new Set(acceptedSuggestionIds)
  const accepted = set.suggestions.filter((suggestion) => acceptedSet.has(suggestion.id))
  if (accepted.length === 0 || accepted.length !== acceptedSet.size) throw new SuggestionSetNotFoundError('Invalid suggestion selection')

  const currentBlocks = new Map(input.blocks.map((block) => [block.blockId, block.originalHtml]))
  const conflicts = accepted.filter((suggestion) => currentBlocks.get(suggestion.blockId) !== suggestion.originalHtml).map((suggestion) => suggestion.id)
  if (conflicts.length > 0) throw new SuggestionConflictError(conflicts)

  const replacements = new Map(accepted.map((suggestion) => [suggestion.blockId, suggestion.proposedHtml]))
  const nextContent = replaceBlockHtml(input.tailoredResume.content, input.tailoredResume.id, replacements)
  const nextFacts = extractResumeFacts(nextContent as unknown as Prisma.JsonValue, input.tailoredResume.id)
  const analysis = analyzeJdMatch({ jobDescription: input.job.jd, targetRole: input.job.role, resumeText: nextFacts.map((fact) => fact.text).join('\n') })
  const previousMatch = input.job.matchSnapshot && typeof input.job.matchSnapshot === 'object' && !Array.isArray(input.job.matchSnapshot)
    ? input.job.matchSnapshot as Record<string, Prisma.JsonValue>
    : {}
  const appliedSuggestionSet: JobSuggestionSet = { ...set, appliedSuggestionIds: accepted.map((suggestion) => suggestion.id), appliedAt: new Date().toISOString() }

  await prisma.$transaction([
    prisma.resume.update({ where: { id: input.tailoredResume.id }, data: { content: nextContent } }),
    prisma.job.update({
      where: { id: input.job.id },
      data: {
        status: ['PREPARING', 'READY', 'EXPORTED'].includes(input.job.status) ? 'READY' : undefined,
        suggestionSet: appliedSuggestionSet as unknown as Prisma.InputJsonValue,
        matchSnapshot: {
          ...previousMatch,
          ...analysis,
          baselineScore: typeof previousMatch.baselineScore === 'number' ? previousMatch.baselineScore : analysis.score,
          currentScore: analysis.score,
          analyzedAt: new Date().toISOString(),
        } as unknown as Prisma.InputJsonValue,
      },
    }),
  ])
  return { appliedCount: accepted.length, currentScore: analysis.score, resumeId: input.tailoredResume.id }
}
