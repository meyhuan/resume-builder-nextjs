/**
 * Shared Puppeteer renderer that navigates to the SSR `/print/[id]` page
 * to produce PDF or image exports.
 *
 * Used by `/next-api/exports/mini` which serves both the H5 mobile
 * and mini-program export flows (dual-auth: cookie or HMAC sign).
 */
import puppeteerCore from 'puppeteer-core'
import type { Page } from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import { mintPrintToken } from '@/lib/print-token'
import { rasterizePdfToPngs } from '@/lib/pdf-to-png'

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
  /** Print token TTL in ms. Defaults to 5 minutes. */
  readonly tokenTtlMs?: number
  readonly traceId?: string
}

const PRINT_PAGE_NAVIGATION_TIMEOUT_MS = 45_000
const PRINT_PAGE_ASSET_READY_TIMEOUT_MS = 8_000
const PRINT_PAGE_CONTENT_READY_TIMEOUT_MS = 20_000

export type ExportRenderErrorCode = 'PRINT_NOT_READY' | 'RASTERIZE_FAILED'

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
  await page.evaluate(async (timeoutMs: number) => {
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
  }, PRINT_PAGE_ASSET_READY_TIMEOUT_MS)
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
  const isLocal: boolean = process.env.NODE_ENV === 'development'
  const executablePath: string = isLocal
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : await chromium.executablePath()

  const printToken: string = mintPrintToken(opts.resumeId, opts.tokenTtlMs ?? 5 * 60 * 1000)
  const params = new URLSearchParams({ token: printToken })
  if (opts.templateId) params.set('tpl', opts.templateId)
  const printUrl: string = `${opts.baseUrl}/print/${encodeURIComponent(opts.resumeId)}?${params.toString()}`

  console.log('[render-via-print-page] puppeteer goto', { traceId: opts.traceId, printUrl, type: opts.type })

  let browser
  let printableContent: PrintableContentSnapshot | undefined
  try {
    browser = await puppeteerCore.launch({
      args: isLocal ? [] : chromium.args,
      executablePath,
      headless: true,
    })
    const page = await browser.newPage()
    page.setDefaultNavigationTimeout(PRINT_PAGE_NAVIGATION_TIMEOUT_MS)
    page.setDefaultTimeout(PRINT_PAGE_NAVIGATION_TIMEOUT_MS)
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 })
    await page.goto(printUrl, { waitUntil: ['domcontentloaded', 'load'], timeout: PRINT_PAGE_NAVIGATION_TIMEOUT_MS })
    await waitForDocumentAssets(page)

    // Wait for the client renderer to flag readiness, but tolerate timeouts.
    await page.waitForSelector('[data-print-ready="1"]', { timeout: 15_000 }).catch(() => {
      console.warn('[render-via-print-page] print-ready timed out, continuing', { traceId: opts.traceId })
    })
    printableContent = await waitForPrintableContent(page, opts.traceId)
    await waitForDocumentAssets(page)

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
        },
      }
    }

    // Generate the PDF
    const pdfBuffer = Buffer.from(
      await page.pdf({ printBackground: true, displayHeaderFooter: false, preferCSSPageSize: true })
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

    return {
      buffer: pdfBuffer,
      pageScreenshots,
      diagnostics: {
        traceId: opts.traceId,
        renderDurationMs: Date.now() - startedAt,
        printableContent,
        pdfBytes: pdfBuffer.length,
        previewPageCount: pageScreenshots.length,
      },
    }
  } finally {
    if (browser) await browser.close()
  }
}
