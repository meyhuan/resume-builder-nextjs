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
}

export interface RenderViaPrintPageOpts {
  readonly baseUrl: string
  readonly resumeId: string
  readonly templateId?: string
  readonly type: 'pdf' | 'image'
  /** Print token TTL in ms. Defaults to 5 minutes. */
  readonly tokenTtlMs?: number
}

const PRINT_PAGE_NAVIGATION_TIMEOUT_MS = 45_000
const PRINT_PAGE_ASSET_READY_TIMEOUT_MS = 8_000

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
  const isLocal: boolean = process.env.NODE_ENV === 'development'
  const executablePath: string = isLocal
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : await chromium.executablePath()

  const printToken: string = mintPrintToken(opts.resumeId, opts.tokenTtlMs ?? 5 * 60 * 1000)
  const params = new URLSearchParams({ token: printToken })
  if (opts.templateId) params.set('tpl', opts.templateId)
  const printUrl: string = `${opts.baseUrl}/print/${encodeURIComponent(opts.resumeId)}?${params.toString()}`

  console.log('[render-via-print-page] puppeteer goto', { printUrl, type: opts.type })

  let browser
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
      console.warn('[render-via-print-page] print-ready timed out, continuing')
    })

    if (opts.type !== 'pdf') {
      const target = await page.$('#print-root')
      if (!target) throw new Error('print-root selector missing')
      const png = await target.screenshot({ type: 'png', omitBackground: false })
      console.log('[render-via-print-page] image bytes', { size: png.length })
      return { buffer: Buffer.from(png), pageScreenshots: [] }
    }

    // Generate the PDF
    const pdfBuffer = Buffer.from(
      await page.pdf({ printBackground: true, displayHeaderFooter: false, preferCSSPageSize: true })
    )
    console.log('[render-via-print-page] pdf bytes', { size: pdfBuffer.length })

    // Rasterize PDF pages into PNG previews using the browser's Canvas API
    let pageScreenshots: Buffer[] = []
    try {
      pageScreenshots = await rasterizePdfToPngs(page, pdfBuffer)
    } catch (err) {
      console.error('[render-via-print-page] pdf rasterization failed:', err)
    }

    return { buffer: pdfBuffer, pageScreenshots }
  } finally {
    if (browser) await browser.close()
  }
}
