/**
 * 导出路由 — 微信小程序原生导出专用
 *
 * 调用方：miniprogram/utils/exportManager.js → createMiniExport() / confirmMiniExport()
 * 认证：HMAC-MD5 签名（wxId + timestamp + sign），无 cookie
 * 配额：mode=preview 不消耗；用户点「确认导出」后调 confirm 路由才消耗
 * 特点：小程序 webview 无法序列化 DOM，因此 puppeteer 直接
 *       page.goto(/print/[resumeId]?token=...) 访问 SSR 打印页渲染，
 *       结果存入 export-temp-store（confirmed:false），
 *       confirm 后置为 confirmed:true，小程序再用 wx.downloadFile 下载。
 *
 * 与其他导出路由的区别：
 *   - /next-api/generate-pdf   PC 编辑器预览，setContent(html)，不存文件，PDF 直接返回
 *   - /next-api/exports        H5 移动端，setContent(html)，存 temp-store，返回 token
 *
 * 子路由：
 *   - POST /next-api/exports/mini          创建导出任务（preview 阶段）
 *   - POST /next-api/exports/mini/[id]/confirm  确认导出（消耗配额）
 */
import { NextResponse } from 'next/server'
import puppeteerCore from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import { prisma } from '@/lib/prisma'
import { verifyMiniSign } from '@/lib/verify-mini-sign'
import { mintPrintToken } from '@/lib/print-token'
import { saveExportTemp, type ExportAssetType } from '@/lib/export-temp-store'
import { peekQuotaForUser, checkQuotaForUser } from '@/lib/quota/quota-checker'

/**
 * POST /next-api/exports/mini
 *
 * Creates an export asset (PDF or image) for a resume the WeChat mini-program
 * has access to. The mini-program authenticates via the standard buildSign
 * scheme (mirrors `/next-api/resumes/mini`).
 *
 * Request body:
 *   {
 *     wxId, timestamp, sign,             // auth (HMAC-MD5)
 *     resumeId,
 *     templateId?,                       // override resume.template
 *     type: 'pdf' | 'image',
 *     mode: 'preview' | 'final',         // preview = no quota, final = consume
 *     fileName?
 *   }
 *
 * Returns: { id, type, fileName, downloadUrl, expiresAt, confirmed }
 *   downloadUrl: relative path to /next-api/export-file/{token}
 *
 * Quota:
 *   - mode=preview: skip both peek and consume; asset confirmed=false.
 *   - mode=final: peek before render, consume after save; asset confirmed=true.
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

function getInternalBaseUrl(req: Request): string {
  const override = process.env.INTERNAL_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL
  if (override) return override.replace(/\/$/, '')
  const url = new URL(req.url)
  return `${url.protocol}//${url.host}`
}

interface RenderResult {
  readonly buffer: Buffer
  /** Per-page PNG screenshots (PDF only, empty for image exports). */
  readonly pageScreenshots: readonly Buffer[]
}

async function renderViaPrintPage(opts: {
  readonly baseUrl: string
  readonly resumeId: string
  readonly token: string
  readonly templateId?: string
  readonly type: ExportAssetType
}): Promise<RenderResult> {
  const isLocal: boolean = process.env.NODE_ENV === 'development'
  const executablePath: string = isLocal
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : await chromium.executablePath()
  const params = new URLSearchParams({ token: opts.token })
  if (opts.templateId) params.set('tpl', opts.templateId)
  const printUrl: string = `${opts.baseUrl}/print/${encodeURIComponent(opts.resumeId)}?${params.toString()}`
  console.log('[exports/mini] puppeteer goto', { printUrl, type: opts.type })
  let browser
  try {
    browser = await puppeteerCore.launch({
      args: isLocal ? [] : chromium.args,
      executablePath,
      headless: true,
    })
    const page = await browser.newPage()
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 })
    await page.goto(printUrl, { waitUntil: ['networkidle0', 'domcontentloaded', 'load'], timeout: 60_000 })
    await page.evaluateHandle('document.fonts.ready')
    // Wait for the client renderer to flag readiness, but tolerate timeouts.
    await page.waitForSelector('[data-print-ready="1"]', { timeout: 15_000 }).catch(() => {
      console.warn('[exports/mini] print-ready selector timed out, continuing')
    })

    if (opts.type !== 'pdf') {
      const target = await page.$('#print-root')
      if (!target) throw new Error('print-root selector missing')
      const png = await target.screenshot({ type: 'png', omitBackground: false })
      console.log('[exports/mini] image bytes', { size: png.length })
      return { buffer: Buffer.from(png), pageScreenshots: [] }
    }

    // Generate the PDF
    const pdfBuffer = Buffer.from(await page.pdf({ printBackground: true, displayHeaderFooter: false, preferCSSPageSize: true }))
    console.log('[exports/mini] pdf bytes', { size: pdfBuffer.length })

    // Inject CSS that simulates @page { margin: 22mm 0 } so screenshots match the PDF layout.
    // A4 at 96dpi: 297mm = 1123px, 22mm ≈ 83px.
    // We pad the .resume-container so each page gets the same top/bottom whitespace as the PDF.
    const PAGE_MARGIN_PX = Math.round(22 * 3.7795)  // 22mm in px at 96dpi ≈ 83px
    await page.evaluate((margin: number) => {
      const style = document.createElement('style')
      style.id = '__screenshot-margin-fix'
      style.textContent = `.resume-container { padding-top: ${margin}px !important; padding-bottom: ${margin}px !important; }`
      document.head.appendChild(style)
    }, PAGE_MARGIN_PX)

    const pageScreenshots: Buffer[] = []
    const PAGE_H = 1123
    const totalHeight: number = await page.evaluate(() => document.documentElement.scrollHeight)
    const pageCount = Math.max(1, Math.ceil(totalHeight / PAGE_H))
    console.log('[exports/mini] capturing html screenshots', { pageCount, totalHeight, PAGE_MARGIN_PX })
    for (let i = 0; i < pageCount; i++) {
      const png = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: i * PAGE_H, width: 794, height: PAGE_H },
        omitBackground: false,
      })
      pageScreenshots.push(Buffer.from(png))
    }
    console.log('[exports/mini] page screenshots done', { count: pageScreenshots.length })

    return { buffer: pdfBuffer, pageScreenshots }
  } finally {
    if (browser) await browser.close()
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: CreateMiniExportRequest
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
    console.warn('[exports/mini] sign error', { wxId, signError })
    return NextResponse.json({ error: signError }, { status: 403 })
  }

  const resumeId: string = String(body.resumeId ?? '')
  const type = body.type === 'pdf' ? 'pdf' : body.type === 'image' ? 'image' : null
  const mode: ExportMode = body.mode === 'preview' ? 'preview' : 'final'
  const explicitTemplateId: string | undefined = typeof body.templateId === 'string' && body.templateId
    ? body.templateId
    : undefined
  const requestedFileName: string = typeof body.fileName === 'string' && body.fileName
    ? body.fileName
    : 'resume'

  if (!resumeId) return NextResponse.json({ error: 'Missing resumeId' }, { status: 400 })
  if (!type) return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })

  console.log('[exports/mini] create requested', { wxId, resumeId, type, mode, templateId: explicitTemplateId, requestedFileName })

  // Verify resume ownership
  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, user: { wxId } },
    select: { id: true, title: true, template: true },
  })
  if (!resume) {
    console.warn('[exports/mini] resume not found or not owned', { wxId, resumeId })
    return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
  }

  // Pre-render quota check for `final` mode (preview is free)
  if (mode === 'final') {
    const quotaPeek = await peekQuotaForUser(wxId, 'pdf:export')
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

  // Render via internal SSR print page
  const baseUrl: string = getInternalBaseUrl(req)
  const printToken: string = mintPrintToken(resume.id, 5 * 60 * 1000)
  let renderResult: RenderResult
  try {
    renderResult = await renderViaPrintPage({
      baseUrl,
      resumeId: resume.id,
      token: printToken,
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
  const fileName: string = (requestedFileName || resume.title || 'resume').replace(/[\/:*?"<>|]/g, '_')
  const isPdf: boolean = type === 'pdf'

  // Save per-page PNG previews (PDF only) so the mini-program can display them
  // as an inline scrollable preview without needing a web-view.
  const previewTokens: string[] = []
  if (isPdf && pageScreenshots.length > 0) {
    const expiresAt = Date.now() + 10 * 60 * 1000
    for (const png of pageScreenshots) {
      const pg = await saveExportTemp({
        buffer: png,
        fileName: `${fileName}-preview`,
        contentType: 'image/png',
        extension: 'png',
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
    contentType: isPdf ? 'application/pdf' : 'image/png',
    extension: isPdf ? 'pdf' : 'png',
    type,
    confirmed: mode === 'final',
    previewTokens,
  })

  // Consume quota AFTER successful render+save when mode=final
  if (mode === 'final') {
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
    previewImages,
  })
}
