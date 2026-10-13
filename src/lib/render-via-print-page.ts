/**
 * Shared Puppeteer renderer that navigates to the SSR `/print/[id]` page
 * to produce PDF or image exports.
 *
 * Used by `/next-api/exports/mini` which serves both the H5 mobile
 * and mini-program export flows (dual-auth: cookie or HMAC sign).
 */
import type { Page } from 'puppeteer-core'
import { mintPrintToken } from '@/lib/print-token'
import { rasterizePdfToPngs } from '@/lib/pdf-to-png'
import { closeSharedPuppeteerPage, newSharedPuppeteerPage } from '@/lib/puppeteer-browser'
import { getPrintLayoutDiagnostics, type PrintLayoutDiagnostics } from '@/lib/print-pagination'

export interface RenderResult {
  readonly buffer: Buffer
  /** Per-page PNG screenshots (PDF only, empty for image exports). */
  readonly pageScreenshots: readonly Buffer[]
  readonly diagnostics: RenderDiagnostics
}

export interface RenderDiagnostics {
  readonly traceId?: string
  readonly renderDurationMs: number
  readonly printableContent?: PrintableContentSnapshot
  readonly pdfBytes?: number
  readonly previewPageCount?: number
  readonly printLayout?: PrintLayoutDiagnostics
}

export interface PrintableContentSnapshot {
  readonly hasRoot: boolean
  readonly hasLoading: boolean
  readonly hasContainer: boolean
  readonly width: number
  readonly height: number
  readonly textLength: number
  readonly mediaCount: number
}

export interface RenderViaPrintPageOpts {
  readonly baseUrl: string
  readonly resumeId: string
  readonly templateId?: string
  readonly type: 'pdf' | 'image'
  /** Reject the export if the saved one-page layout produces anything but one PDF page. */
  readonly requireOnePage?: boolean
  /** Print token TTL in ms. Defaults to 5 minutes. */
  readonly tokenTtlMs?: number
  readonly traceId?: string
}

const PRINT_PAGE_NAVIGATION_TIMEOUT_MS = 45_000
const PRINT_PAGE_ASSET_READY_TIMEOUT_MS = 8_000
const PRINT_PAGE_CONTENT_READY_TIMEOUT_MS = 20_000

export type ExportRenderErrorCode = 'PRINT_NOT_READY' | 'RASTERIZE_FAILED' | 'ONE_PAGE_FAILED'

export class ExportRenderError extends Error {
  readonly code: ExportRenderErrorCode
  readonly details: Record<string, unknown>

  constructor(code: ExportRenderErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message)
    this.name = 'ExportRenderError'
    this.code = code
    this.details = details
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function waitForDocumentAssets(page: Page): Promise<void> {
  const failedImages = await page.evaluate(async (timeoutMs: number): Promise<string[]> => {
    const wait = (ms: number): Promise<void> => new Promise((resolve) => {
      window.setTimeout(resolve, ms)
    })
    const fontsReady = document.fonts?.ready?.catch(() => undefined) ?? Promise.resolve()
    const imagesReady = Promise.all(Array.from(document.images).map((image): Promise<void> => {
      if (image.complete) return Promise.resolve()
      return new Promise((resolve) => {
        image.addEventListener('load', () => resolve(), { once: true })
        image.addEventListener('error', () => resolve(), { once: true })
      })
    }))
    await Promise.race([Promise.all([fontsReady, imagesReady]), wait(timeoutMs)])
    // An avatar is part of the resume header, so it must be validated too.
    // Previously only portfolio images were checked; a failed avatar request
    // therefore silently produced the gray placeholder in exported files.
    return Array.from(document.querySelectorAll<HTMLImageElement>('[data-resume-avatar] img, .portfolio-appendix img'))
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src)
  }, PRINT_PAGE_ASSET_READY_TIMEOUT_MS)
  if (failedImages.length > 0) {
    throw new ExportRenderError('PRINT_NOT_READY', 'Resume images failed to load', {
      failedImageCount: failedImages.length,
      failedImages: failedImages.slice(0, 5),
    })
  }
}

async function readPrintableContentSnapshot(page: Page): Promise<PrintableContentSnapshot> {
  return page.evaluate(() => {
    const root = document.querySelector('#print-root')
    const loading = root?.querySelector('[data-print-loading="1"]')
    const container = root?.querySelector('.resume-container') as HTMLElement | null
    const rect = container?.getBoundingClientRect()
    return {
      hasRoot: Boolean(root),
      hasLoading: Boolean(loading),
      hasContainer: Boolean(container),
      width: rect?.width ?? 0,
      height: rect?.height ?? 0,
      textLength: container?.textContent?.trim().length ?? 0,
      mediaCount: container?.querySelectorAll('img, svg, canvas').length ?? 0,
    }
  })
}

async function waitForPrintableContent(page: Page, traceId?: string): Promise<PrintableContentSnapshot> {
  try {
    await page.waitForFunction(() => {
      const root = document.querySelector('#print-root')
      const loading = root?.querySelector('[data-print-loading="1"]')
      const container = root?.querySelector('.resume-container') as HTMLElement | null
      if (!root || loading || !container) return false

      const rect = container.getBoundingClientRect()
      const hasSize = rect.width > 0 && rect.height > 20
      const hasVisibleContent =
        Boolean(container.textContent?.trim()) ||
        container.querySelector('img, svg, canvas') !== null

      return hasSize && hasVisibleContent
    }, { timeout: PRINT_PAGE_CONTENT_READY_TIMEOUT_MS })
    return await readPrintableContentSnapshot(page)
  } catch (error) {
    let snapshot: PrintableContentSnapshot | undefined
    try {
      snapshot = await readPrintableContentSnapshot(page)
    } catch {
      snapshot = undefined
    }
    throw new ExportRenderError('PRINT_NOT_READY', 'Print page did not become printable', {
      traceId,
      timeoutMs: PRINT_PAGE_CONTENT_READY_TIMEOUT_MS,
      snapshot,
      causeMessage: errorMessage(error),
    })
  }
}

/**
 * Derive the internal base URL from either env vars or the incoming request.
 */
export function getInternalBaseUrl(req: Request): string {
  const override = process.env.INTERNAL_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL
  if (override) return override.replace(/\/$/, '')
  const url = new URL(req.url)
  const isLocalHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1'
  const protocol = isLocalHost ? 'http:' : url.protocol
  return `${protocol}//${url.host}`
}

export async function renderViaPrintPage(opts: RenderViaPrintPageOpts): Promise<RenderResult> {
  const startedAt = Date.now()
  const printToken: string = mintPrintToken(opts.resumeId, opts.tokenTtlMs ?? 5 * 60 * 1000)
  const params = new URLSearchParams({ token: printToken })
  if (opts.templateId) params.set('tpl', opts.templateId)
  const printUrl: string = `${opts.baseUrl}/print/${encodeURIComponent(opts.resumeId)}?${params.toString()}`

  console.log('[render-via-print-page] puppeteer goto', { traceId: opts.traceId, printUrl, type: opts.type })

  let page: Page | undefined
  let printableContent: PrintableContentSnapshot | undefined
  try {
    page = await newSharedPuppeteerPage()
    page.setDefaultNavigationTimeout(PRINT_PAGE_NAVIGATION_TIMEOUT_MS)
    page.setDefaultTimeout(PRINT_PAGE_NAVIGATION_TIMEOUT_MS)
    // Use the desktop breakpoint for responsive templates while the print
    // stage keeps the actual A4 width. This matches the editor's page layout.
    await page.setViewport({ width: 1280, height: 1123, deviceScaleFactor: 2 })
    await page.emulateMediaType('print')
    await page.goto(printUrl, { waitUntil: ['domcontentloaded', 'load'], timeout: PRINT_PAGE_NAVIGATION_TIMEOUT_MS })
    await waitForDocumentAssets(page)

    // The renderer marks readiness only after fonts, layout compaction and two
    // animation frames. Capturing before that marker creates preview/export
    // drift, so a timeout is a real render failure.
    try {
      await page.waitForSelector('[data-print-ready="1"]', { timeout: 15_000 })
    } catch (error) {
      throw new ExportRenderError('PRINT_NOT_READY', 'Print page did not signal layout readiness', {
        traceId: opts.traceId,
        causeMessage: errorMessage(error),
      })
    }
    printableContent = await waitForPrintableContent(page, opts.traceId)
    await waitForDocumentAssets(page)
    await page.evaluate(async () => {
      await document.fonts?.ready?.catch(() => undefined)
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    })
    const printLayout = await page.evaluate(getPrintLayoutDiagnostics)
    if (printLayout.hiddenOverflowAncestors > 0 || printLayout.transformedRoot) {
      throw new ExportRenderError('PRINT_NOT_READY', 'Print layout contains clipped or transformed content', {
        traceId: opts.traceId,
        printLayout,
      })
    }

    if (opts.requireOnePage) {
      const onePageMarker = await page.$('.resume-document-main[data-one-page="true"]')
      if (!onePageMarker) {
        throw new ExportRenderError('ONE_PAGE_FAILED', '单页导出失败：当前内容尚未完成一页适配', {
          traceId: opts.traceId,
          reason: 'one_page_marker_missing',
        })
      }
    }

    if (opts.type !== 'pdf') {
      const target = await page.$('#print-root')
      if (!target) throw new Error('print-root selector missing')
      const png = await target.screenshot({ type: 'png', omitBackground: false })
      console.log('[render-via-print-page] image bytes', { traceId: opts.traceId, size: png.length })
      return {
        buffer: Buffer.from(png),
        pageScreenshots: [],
        diagnostics: {
          traceId: opts.traceId,
          renderDurationMs: Date.now() - startedAt,
          printableContent,
          printLayout,
        },
      }
    }

    // Generate the PDF
    const pdfBuffer = Buffer.from(
      await page.pdf({ printBackground: true, displayHeaderFooter: false, preferCSSPageSize: true, waitForFonts: true })
    )
    console.log('[render-via-print-page] pdf bytes', { traceId: opts.traceId, size: pdfBuffer.length })

    // Rasterize PDF pages into PNG previews using the browser's Canvas API
    let pageScreenshots: Buffer[] = []
    try {
      pageScreenshots = await rasterizePdfToPngs(page, pdfBuffer)
    } catch (err) {
      console.error('[render-via-print-page] pdf rasterization failed:', { traceId: opts.traceId, error: err })
      throw new ExportRenderError('RASTERIZE_FAILED', 'PDF rasterization failed', {
        traceId: opts.traceId,
        pdfBytes: pdfBuffer.length,
        renderDurationMs: Date.now() - startedAt,
        causeMessage: errorMessage(err),
      })
    }

    if (opts.requireOnePage && pageScreenshots.length !== 1) {
      throw new ExportRenderError('ONE_PAGE_FAILED', '单页导出失败：内容无法在一页内完整呈现', {
        traceId: opts.traceId,
        pdfBytes: pdfBuffer.length,
        previewPageCount: pageScreenshots.length,
      })
    }

    return {
      buffer: pdfBuffer,
      pageScreenshots,
      diagnostics: {
        traceId: opts.traceId,
        renderDurationMs: Date.now() - startedAt,
        printableContent,
        printLayout,
        pdfBytes: pdfBuffer.length,
        previewPageCount: pageScreenshots.length,
      },
    }
  } finally {
    await closeSharedPuppeteerPage(page)
  }
}
