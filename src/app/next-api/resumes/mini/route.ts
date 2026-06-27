import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyMiniSign } from '@/lib/verify-mini-sign'
import { computeProgress } from '@/features/edit/progress/module-completeness'
import type { ResumeData } from '@/entities/resume/resume-data'
import { mapExternalResume } from '@/io/external-resume-importer'
import DocmindApi, {
  SubmitDocParserJobAdvanceRequest,
  QueryDocParserStatusRequest,
  GetDocParserResultRequest,
} from '@alicloud/docmind-api20220711'
import { Readable } from 'stream'
import OpenAI from 'openai'
import { getDefaultModel, resolveApiKey } from '@/lib/ai/ai-runtime-config'
import { buildImportSystemPrompt, buildImportUserPrompt } from '@/lib/ai/import-prompt-builder'
import { createDefaultResume } from '@/lib/default-resume'
import { buildImportResumeTitle } from '@/lib/import-resume-title'
import { normalizeResumeContent } from '@/entities/resume/normalize-resume-content'
import {
  assertCanCreateResumeForUserId,
  isResumeLimitExceededError,
  MAX_RESUME_COUNT,
  RESUME_LIMIT_EXCEEDED_CODE,
  RESUME_LIMIT_EXCEEDED_MESSAGE,
} from '@/lib/resume-limits'

/**
 * POST /next-api/resumes/mini
 *
 * Unified resume management endpoint for the WeChat mini-program.
 * All actions share the same HMAC-MD5 signature scheme.
 *
 * Request body:
 *   { action, sid, timestamp, sign, ...actionFields }
 *
 * Actions:
 *   list                               → returns resume list with progress
 *   create   { title, template }       → creates empty resume
 *   copy     { resumeId }              → copies a resume
 *   rename   { resumeId, title }       → renames a resume
 *   delete   { resumeId }              → deletes a resume
 *   import   { fileName, fileBase64 }  → AI parses file/text, saves, returns { id }
 */

type Action = 'list' | 'create' | 'copy' | 'rename' | 'delete' | 'import'

interface RequestBody {
  action: Action
  wxId: unknown
  timestamp: unknown
  sign: unknown
  resumeId?: string
  title?: string
  template?: string
  fileName?: string
  fileBase64?: string
}

async function getResumeLimitResponse(userId: string): Promise<NextResponse | null> {
  try {
    await assertCanCreateResumeForUserId(userId)
    return null
  } catch (error) {
    if (isResumeLimitExceededError(error)) {
      return NextResponse.json(
        {
          error: RESUME_LIMIT_EXCEEDED_MESSAGE,
          code: RESUME_LIMIT_EXCEEDED_CODE,
          limit: MAX_RESUME_COUNT,
          count: error.count,
        },
        { status: 409 },
      )
    }
    throw error
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const wxId: string = String(body.wxId ?? '')
  const timestamp: number = Number(body.timestamp)
  const sign: string = String(body.sign ?? '')

  const signError = verifyMiniSign({ wxId, timestamp, sign })
  if (signError) {
    return NextResponse.json({ error: signError }, { status: 403 })
  }

  const user = await prisma.user.upsert({
    where: { wxId },
    update: {},
    create: { wxId, name: `用户_${wxId}` },
    select: { id: true },
  })

  const { action } = body

  if (action === 'list') {
    const resumes = await prisma.resume.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, thumbnail: true, updatedAt: true, template: true, content: true },
    })
    const result = resumes.map(({ content, ...r }) => ({
      ...r,
      progress: computeProgress(content as unknown as ResumeData),
    }))
    return NextResponse.json(result)
  }

  if (action === 'create') {
    const limitResponse = await getResumeLimitResponse(user.id)
    if (limitResponse) return limitResponse

    const title: string = body.title || '新简历'
    const template: string = body.template || 'simple'
    const resume = await prisma.resume.create({
      data: {
        userId: user.id,
        title,
        template,
        content: createDefaultResume() as unknown as Prisma.InputJsonValue,
      },
      select: { id: true, title: true, template: true, updatedAt: true },
    })
    return NextResponse.json(resume)
  }

  if (action === 'copy') {
    const { resumeId } = body
    if (!resumeId) return NextResponse.json({ error: 'Missing resumeId' }, { status: 400 })
    const source = await prisma.resume.findFirst({
      where: { id: resumeId, userId: user.id },
    })
    if (!source) return NextResponse.json({ error: 'Resume not found' }, { status: 404 })

    const limitResponse = await getResumeLimitResponse(user.id)
    if (limitResponse) return limitResponse

    const copy = await prisma.resume.create({
      data: {
        userId: user.id,
        title: source.title + ' (副本)',
        template: source.template ?? 'simple',
        content: normalizeResumeContent(
          source.content as unknown as Partial<ResumeData> & Record<string, unknown>,
          { fallbackId: `${resumeId}-copy` },
        ) as unknown as Prisma.InputJsonValue,
        thumbnail: source.thumbnail,
      },
      select: { id: true, title: true, template: true, updatedAt: true },
    })
    return NextResponse.json(copy)
  }

  if (action === 'rename') {
    const { resumeId, title } = body
    if (!resumeId || !title) return NextResponse.json({ error: 'Missing resumeId or title' }, { status: 400 })
    const resume = await prisma.resume.updateMany({
      where: { id: resumeId, userId: user.id },
      data: { title },
    })
    if (resume.count === 0) return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  }

  if (action === 'delete') {
    const { resumeId } = body
    if (!resumeId) return NextResponse.json({ error: 'Missing resumeId' }, { status: 400 })
    const deleted = await prisma.resume.deleteMany({
      where: { id: resumeId, userId: user.id },
    })
    if (deleted.count === 0) return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  }

  if (action === 'import') {
    const { fileName, fileBase64 } = body
    if (!fileName || !fileBase64) {
      return NextResponse.json({ error: 'Missing fileName or fileBase64' }, { status: 400 })
    }
    const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
    const ALLOWED = new Set(['doc', 'docx', 'pdf', 'jpg', 'jpeg', 'png', 'bmp', 'gif', 'txt'])
    if (!ALLOWED.has(ext)) {
      return NextResponse.json({ error: '不支持的文件格式' }, { status: 400 })
    }

    const limitResponse = await getResumeLimitResponse(user.id)
    if (limitResponse) return limitResponse

    let extractedText: string
    if (ext === 'txt') {
      extractedText = Buffer.from(fileBase64, 'base64').toString('utf8')
    } else {
      const accessKeyId = process.env.ALIYUN_DOCMIND_ACCESS_KEY_ID ?? ''
      const accessKeySecret = process.env.ALIYUN_DOCMIND_ACCESS_KEY_SECRET ?? ''
      if (!accessKeyId || !accessKeySecret) {
        return NextResponse.json({ error: '文档解析服务未配置' }, { status: 500 })
      }
      const fileBuffer = Buffer.from(fileBase64, 'base64')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const docmindConfig: any = {
        accessKeyId,
        accessKeySecret,
        endpoint: 'docmind-api.cn-hangzhou.aliyuncs.com',
      }
      const docmindClient = new DocmindApi(docmindConfig)
      const submitReq = new SubmitDocParserJobAdvanceRequest({
        fileName,
        fileUrlObject: Readable.from(fileBuffer),
        outputFormat: ['markdown'],
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const runtime: any = { connectTimeout: 60000, readTimeout: 60000 }
      const submitRes = await docmindClient.submitDocParserJobAdvance(submitReq, runtime)
      const jobId = submitRes.body?.data?.id
      if (!jobId) {
        return NextResponse.json({ error: '文档解析任务提交失败' }, { status: 500 })
      }
      extractedText = await pollMiniDocmind(docmindClient, jobId)
    }

    if (!extractedText.trim()) {
      return NextResponse.json({ error: '文件内容为空，请检查文件是否正确' }, { status: 400 })
    }

    const model = getDefaultModel()
    const apiKey = resolveApiKey(model)
    const openai = new OpenAI({ apiKey, baseURL: model.baseUrl })
    const llmRes = await openai.chat.completions.create({
      model: model.name,
      messages: [
        { role: 'system', content: buildImportSystemPrompt() },
        { role: 'user', content: buildImportUserPrompt(extractedText) },
      ],
      temperature: 0.2,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
      stream: false,
    })
    const raw = (llmRes.choices[0]?.message?.content ?? '').trim()
      .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const externalResume = JSON.parse(raw) as any
    if (externalResume?.error === 'NOT_RESUME') {
      return NextResponse.json({ error: externalResume.message || '内容不像简历，请重试' }, { status: 422 })
    }
    const resumeData: ResumeData = mapExternalResume(externalResume)
    if (externalResume?.base_info?.name) resumeData.name = externalResume.base_info.name

    const saved = await prisma.resume.create({
      data: {
        userId: user.id,
        title: buildImportResumeTitle(resumeData, fileName),
        template: 'simple',
        content: resumeData as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    })
    return NextResponse.json({ id: saved.id })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

// ---------------------------------------------------------------------------
// DocMind polling helper (shared with import action)
// ---------------------------------------------------------------------------

const MINI_POLL_INTERVAL_MS = 3000
const MINI_MAX_POLL_COUNT = 20
const MINI_LAYOUT_STEP_SIZE = 500

async function pollMiniDocmind(client: DocmindApi, jobId: string): Promise<string> {
  for (let attempt = 0; attempt < MINI_MAX_POLL_COUNT; attempt++) {
    const req = new QueryDocParserStatusRequest({ id: jobId })
    const res = await client.queryDocParserStatus(req)
    const status = (res.body?.data?.status ?? '').toLowerCase()
    if (status === 'fail') throw new Error(res.body?.message || '文档解析失败')
    if (status === 'success') return fetchMiniLayouts(client, jobId)
    await new Promise<void>((r) => setTimeout(r, MINI_POLL_INTERVAL_MS))
  }
  throw new Error('文档解析超时，请稍后重试')
}

async function fetchMiniLayouts(client: DocmindApi, jobId: string): Promise<string> {
  let layoutNum = 0
  let result = ''
  while (true) {
    const req = new GetDocParserResultRequest({ id: jobId, layoutNum, layoutStepSize: MINI_LAYOUT_STEP_SIZE })
    const res = await client.getDocParserResult(req)
    const data = res.body?.data as Record<string, unknown> | null
    const layouts = data?.layouts
    if (Array.isArray(layouts)) {
      result += (layouts as Array<{ type?: string; markdownContent?: string; text?: string }>)
        .filter((l) => l.type !== 'figure')
        .map((l) => (l.markdownContent?.trim() || l.text?.trim() || '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').trim())
        .filter((s) => s.length > 0)
        .join('\n')
      if (layouts.length < MINI_LAYOUT_STEP_SIZE) break
      layoutNum += MINI_LAYOUT_STEP_SIZE
    } else {
      break
    }
  }
  return result
}
