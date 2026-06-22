/**
 * 统一导出路由 — 同时服务 H5 移动端和微信小程序
 *
 * 调用方：
 *   - H5: src/app/m/preview/preview-client.tsx → createExportJob() (cookie 认证)
 *   - 小程序: miniprogram/utils/exportManager.js → createMiniExport() (HMAC 认证)
 *
 * 双重认证：
 *   1. HMAC-MD5 签名（wxId + timestamp + sign）— 小程序
 *   2. Cookie（auth_uid）— H5 移动端
 *
 * 配额：mode=preview 不消耗；mode=final 消耗；Markdown 作为免费导出例外
 * 特点：puppeteer page.goto(/print/[resumeId]?token=...) 访问 SSR 打印页渲染，
 *       结果存入 export-temp-store。
 *
 * 与其他导出路由的区别：
 *   - /next-api/generate-pdf   PC 编辑器预览，setContent(html)，不存文件，PDF 直接返回
 *
 * 子路由：
 *   - POST /next-api/exports/mini              创建导出任务
 *   - POST /next-api/exports/mini/[id]/confirm  确认导出（小程序 preview 流程用）
 */
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyMiniSign } from '@/lib/verify-mini-sign'
import { EXPORT_TEMP_TTL_MS, saveExportTemp } from '@/lib/export-temp-store'
import { uploadExportAsset } from '@/lib/upload-export-asset'
import { peekQuotaForUser, checkQuotaForUser } from '@/lib/quota/quota-checker'
import { renderViaPrintPage, getInternalBaseUrl, type RenderResult } from '@/lib/render-via-print-page'
import { sanitizeExportFileName } from '@/lib/export-file-name'
import { extractEditorMeta } from '@/entities/editor/editor-meta'
import { normalizeResumeContent } from '@/entities/resume/normalize-resume-content'
import type { ResumeData } from '@/entities/resume/resume-data'
import { exportResumeToMarkdown } from '@/io/export-markdown'

/**
 * POST /next-api/exports/mini
 *
 * Creates an export asset (PDF, image, or Markdown) for a resume.
 *
 * Dual auth:
 *   1. HMAC sign (mini-program): wxId + timestamp + sign fields in body
 *   2. Cookie (H5 mobile): auth_uid cookie (value = wxId/unionid)
 *
 * Request body:
 *   {
 *     wxId?, timestamp?, sign?,           // auth option 1 (HMAC-MD5)
 *     resumeId,
 *     templateId?,                        // override resume.template
 *     type: 'pdf' | 'image' | 'markdown',
 *     mode: 'preview' | 'final',          // preview = no quota; final consumes except Markdown
 *     fileName?
 *   }
 *
 * Returns: { id, type, fileName, downloadUrl, expiresAt, confirmed, previewImages }
 *   downloadUrl: relative path to /next-api/export-file/{token}
 *
 * Quota:
 *   - mode=preview: skip both peek and consume; asset confirmed=false.
 *   - mode=final: peek before render, consume after save; asset confirmed=true.
 *   - type=markdown: generate confirmed UTF-8 Markdown, skip quota entirely.
 */

interface CreateMiniExportRequest {
  readonly wxId?: unknown
  readonly timestamp?: unknown
  readonly sign?: unknown
  readonly resumeId?: unknown
  readonly templateId?: unknown
  readonly type?: unknown
  readonly mode?: unknown
  readonly fileName?: unknown
}

type ExportMode = 'preview' | 'final'
type MiniExportType = 'pdf' | 'image' | 'markdown'

export async function POST(req: Request): Promise<NextResponse> {
  let body: CreateMiniExportRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Dual auth: HMAC sign (mini-program) or cookie (H5)
  let wxId: string = ''
  const hasSign = body.wxId && body.timestamp && body.sign
  if (hasSign) {
    wxId = String(body.wxId ?? '')
    const timestamp: number = Number(body.timestamp)
    const sign: string = String(body.sign ?? '')
    const signError = verifyMiniSign({ wxId, timestamp, sign })
    if (signError) {
      console.warn('[exports/mini] sign error', { wxId, signError })
      return NextResponse.json({ error: signError }, { status: 403 })
    }
  } else {
    // H5 cookie-based auth: auth_uid cookie value IS the wxId/unionid
    const cookieStore = await cookies()
    wxId = cookieStore.get('auth_uid')?.value || ''
    if (!wxId) {
      console.warn('[exports/mini] no auth: missing sign fields and auth_uid cookie')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('[exports/mini] cookie auth', { wxId })
  }

  const resumeId: string = String(body.resumeId ?? '')
  const type: MiniExportType | null = body.type === 'pdf'
    ? 'pdf'
    : body.type === 'image'
      ? 'image'
      : body.type === 'markdown'
        ? 'markdown'
        : null
  const mode: ExportMode = body.mode === 'preview' ? 'preview' : 'final'
  const explicitTemplateId: string | undefined = typeof body.templateId === 'string' && body.templateId
    ? body.templateId
    : undefined
  const requestedFileName: string = typeof body.fileName === 'string' && body.fileName
    ? sanitizeExportFileName(body.fileName)
    : ''

  if (!resumeId) return NextResponse.json({ error: 'Missing resumeId' }, { status: 400 })
  if (!type) return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })

  console.log('[exports/mini] create requested', { wxId, resumeId, type, mode, templateId: explicitTemplateId, requestedFileName })

  // Verify resume ownership
  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, user: { wxId } },
    select: { id: true, title: true, template: true, userId: true, content: true },
  })
  if (!resume) {
    console.warn('[exports/mini] resume not found or not owned', { wxId, resumeId })
    return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
  }

  const fileName: string = requestedFileName || sanitizeExportFileName(resume.title)

  if (type === 'markdown') {
    const rawContent = resume.content && typeof resume.content === 'object' && !Array.isArray(resume.content)
      ? resume.content as Record<string, unknown>
      : {}
    const { content } = extractEditorMeta(rawContent)
    const normalizedResume: ResumeData = normalizeResumeContent(content as Partial<ResumeData>, { fallbackId: resume.id })
    const markdown = exportResumeToMarkdown(normalizedResume)
    const buffer = Buffer.from(markdown, 'utf8')
    const contentType = 'text/markdown; charset=utf-8'
    const extension = 'md'

    const saved = await saveExportTemp({
      buffer,
      fileName,
      contentType,
      extension,
      type,
      confirmed: true,
      wxId,
      userId: resume.userId,
      resumeId: resume.id,
      resumeTitle: resume.title,
      templateId: explicitTemplateId || resume.template || undefined,
    })

    const ossAsset = await uploadExportAsset({
      token: saved.token,
      buffer,
      contentType,
      extension,
    })

    await prisma.exportRecord.upsert({
      where: { token: saved.token },
      update: {
        userId: resume.userId,
        wxId,
        resumeId: resume.id,
        resumeTitle: resume.title || fileName,
        templateId: explicitTemplateId || resume.template || null,
        type,
        fileName,
        ossKey: ossAsset.key,
        ossUrl: ossAsset.url,
        expiresAt: new Date(saved.expiresAt),
        status: 'available',
        confirmedAt: new Date(),
      },
      create: {
        userId: resume.userId,
        wxId,
        resumeId: resume.id,
        resumeTitle: resume.title || fileName,
        templateId: explicitTemplateId || resume.template || null,
        type,
        fileName,
        token: saved.token,
        ossKey: ossAsset.key,
        ossUrl: ossAsset.url,
        expiresAt: new Date(saved.expiresAt),
        status: 'available',
      },
    })

    const downloadUrl = `/next-api/export-file/${saved.token}`
    console.log('[exports/mini] markdown create completed', {
      wxId,
      resumeId,
      token: saved.token,
      downloadUrl,
    })

    return NextResponse.json({
      id: saved.token,
      type,
      fileName,
      downloadUrl,
      expiresAt: new Date(saved.expiresAt).toISOString(),
      confirmed: true,
      remaining: 'unlimited',
      isVip: false,
      previewImages: [],
    })
  }

  const quotaPeek = await peekQuotaForUser(wxId, 'pdf:export')

  // Pre-render quota check for `final` mode (preview is free, but still
  // returns quota info so the mini-program can label/disable confirmation).
  if (mode === 'final') {
    console.log('[exports/mini] quota peek', { wxId, ...quotaPeek })
    if (!quotaPeek.allowed) {
      return NextResponse.json({
        error: quotaPeek.message,
        code: 'QUOTA_EXCEEDED',
        remaining: quotaPeek.remaining,
        isVip: quotaPeek.isVip,
      }, { status: 402 })
    }
  }

  // Render via internal SSR print page (shared helper)
  const baseUrl: string = getInternalBaseUrl(req)
  let renderResult: RenderResult
  try {
    renderResult = await renderViaPrintPage({
      baseUrl,
      resumeId: resume.id,
      templateId: explicitTemplateId || resume.template || undefined,
      type,
    })
  } catch (error: unknown) {
    console.error('[exports/mini] render failed', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Render failed',
    }, { status: 500 })
  }

  const { buffer, pageScreenshots } = renderResult
  const isPdf: boolean = type === 'pdf'
  const contentType: string = isPdf ? 'application/pdf' : 'image/png'
  const extension: string = isPdf ? 'pdf' : 'png'

  // Save per-page PNG previews (PDF only) so the mini-program can display them
  // as an inline scrollable preview without needing a web-view.
  const previewTokens: string[] = []
  if (isPdf && pageScreenshots.length > 0) {
    const expiresAt = Date.now() + EXPORT_TEMP_TTL_MS
    for (const png of pageScreenshots) {
      const pg = await saveExportTemp({
        buffer: png,
      fileName: `${fileName}-preview`,
      contentType: 'image/jpeg',
      extension: 'jpg',
        type: 'image',
        confirmed: true,
      })
      previewTokens.push(pg.token)
    }
    console.log('[exports/mini] preview tokens saved', { count: previewTokens.length, expiresAt })
  }

  const saved = await saveExportTemp({
    buffer,
    fileName,
    contentType,
    extension,
    type,
    confirmed: mode === 'final',
    previewTokens,
    wxId,
    userId: resume.userId,
    resumeId: resume.id,
    resumeTitle: resume.title,
    templateId: explicitTemplateId || resume.template || undefined,
  })

  // Upload and consume quota AFTER successful render+save when mode=final.
  // Upload happens first so an OSS failure does not burn the user's quota.
  if (mode === 'final') {
    const ossAsset = await uploadExportAsset({
      token: saved.token,
      buffer,
      contentType,
      extension,
    })
    const consumed = await checkQuotaForUser(wxId, 'pdf:export')
    console.log('[exports/mini] quota consumed', { wxId, ...consumed })
    if (!consumed.allowed) {
      // Should be rare since peek allowed; surface the same payload.
      return NextResponse.json({
        error: consumed.message,
        code: 'QUOTA_EXCEEDED',
        remaining: consumed.remaining,
        isVip: consumed.isVip,
      }, { status: 402 })
    }
    await prisma.exportRecord.upsert({
      where: { token: saved.token },
      update: {
        userId: resume.userId,
        wxId,
        resumeId: resume.id,
        resumeTitle: resume.title || fileName,
        templateId: explicitTemplateId || resume.template || null,
        type,
        fileName,
        ossKey: ossAsset.key,
        ossUrl: ossAsset.url,
        expiresAt: new Date(saved.expiresAt),
        status: 'available',
        confirmedAt: new Date(),
      },
      create: {
        userId: resume.userId,
        wxId,
        resumeId: resume.id,
        resumeTitle: resume.title || fileName,
        templateId: explicitTemplateId || resume.template || null,
        type,
        fileName,
        token: saved.token,
        ossKey: ossAsset.key,
        ossUrl: ossAsset.url,
        expiresAt: new Date(saved.expiresAt),
        status: 'available',
      },
    })
  }

  const downloadUrl: string = `/next-api/export-file/${saved.token}`
  const previewImages: string[] = previewTokens.map((t) => `/next-api/export-file/${t}?inline=1`)
  console.log('[exports/mini] create completed', {
    wxId,
    resumeId,
    type,
    mode,
    token: saved.token,
    downloadUrl,
    previewPageCount: previewImages.length,
  })

  return NextResponse.json({
    id: saved.token,
    type,
    fileName,
    downloadUrl,
    expiresAt: new Date(saved.expiresAt).toISOString(),
    confirmed: mode === 'final',
    remaining: quotaPeek.remaining,
    isVip: quotaPeek.isVip,
    previewImages,
  })
}
