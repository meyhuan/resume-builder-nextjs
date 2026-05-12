/**
 * 导出路由 — H5 移动端「导出 PDF / 图片」专用
 *
 * 调用方：src/app/m/preview/preview-client.tsx → createExportJob()
 * 认证：cookie（auth_uid）
 * 配额：消耗（内部先 peek 后 check，双重保险）
 * 特点：客户端把序列化的 HTML / dataUrl 传过来，
 *       puppeteer setContent() 渲染后存入 export-temp-store（10 分钟 TTL），
 *       返回 token 和 downloadUrl，平跳至 /m/export-result 页面供用户下载。
 *       图片导出不经过 puppeteer，直接将客户端的 dataUrl 存为文件。
 *
 * 与其他导出路由的区别：
 *   - /next-api/generate-pdf      PC 编辑器预览，不存文件，PDF 直接返回给浏览器
 *   - /next-api/exports/mini      小程序，puppeteer page.goto(SSR页) 渲染，HMAC 认证
 *
 * TODO: 若将来 H5 移动端在微信外浏览器打开的场景可以直接下载，
 *       可考虑合并进 /next-api/generate-pdf 并去掉 temp-store 步骤。
 */
import { NextResponse } from 'next/server'
import puppeteerCore from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import { checkQuota, peekQuota } from '@/lib/quota/quota-checker'
import { saveExportTemp, type ExportAssetType } from '@/lib/export-temp-store'
import { getClientPaginationScript, paginateHtml } from '@/utils/paginate-html'

interface CreateExportRequest {
  readonly type?: ExportAssetType
  readonly html?: string
  readonly dataUrl?: string
  readonly fileName?: string
}

async function renderPdf(html: string): Promise<Buffer> {
  const isOnePage = html.includes('data-one-page="true"')
  const paginatedHtml = isOnePage ? html : paginateHtml(html)
  const isLocal = process.env.NODE_ENV === 'development'
  const executablePath = isLocal ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : await chromium.executablePath()
  let browser
  try {
    browser = await puppeteerCore.launch({
      args: isLocal ? [] : chromium.args,
      executablePath,
      headless: true,
    })
    const page = await browser.newPage()
    await page.setContent(paginatedHtml, { waitUntil: ['networkidle0', 'domcontentloaded', 'load'] })
    await page.evaluateHandle('document.fonts.ready')
    if (!isOnePage) await page.evaluate(getClientPaginationScript())
    const pdf = await page.pdf({ printBackground: true, displayHeaderFooter: false, preferCSSPageSize: true })
    return Buffer.from(pdf)
  } finally {
    if (browser) await browser.close()
  }
}

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; contentType: string } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl)
  if (!match) throw new Error('Invalid image data')
  return { buffer: Buffer.from(match[2], 'base64'), contentType: match[1] }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json() as CreateExportRequest
    const type = body.type
    const fileName = body.fileName || 'resume'
    console.log('[exports] create requested', { type, fileName, hasHtml: Boolean(body.html), hasDataUrl: Boolean(body.dataUrl) })
    if (type !== 'pdf' && type !== 'image') {
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }
    if (type === 'pdf' && !body.html) {
      return NextResponse.json({ error: 'HTML content is required' }, { status: 400 })
    }
    if (type === 'image' && !body.dataUrl) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 })
    }
    const html = body.html || ''
    const dataUrl = body.dataUrl || ''
    const quota = await peekQuota('pdf:export')
    if (!quota.allowed) {
      return NextResponse.json({ error: quota.message, quotaExceeded: true, remaining: quota.remaining }, { status: 429 })
    }
    const asset = type === 'pdf'
      ? { buffer: await renderPdf(html), contentType: 'application/pdf', extension: 'pdf' }
      : { ...dataUrlToBuffer(dataUrl), extension: 'png' }
    const saved = await saveExportTemp({
      buffer: asset.buffer,
      fileName,
      contentType: asset.contentType,
      extension: asset.extension,
      type,
    })
    const consumedQuota = await checkQuota('pdf:export')
    if (!consumedQuota.allowed) {
      return NextResponse.json({ error: consumedQuota.message, quotaExceeded: true, remaining: consumedQuota.remaining }, { status: 429 })
    }
    const downloadUrl = `/next-api/export-file/${saved.token}`
    console.log('[exports] create completed', { type, fileName, token: saved.token, downloadUrl, expiresAt: saved.expiresAt })
    return NextResponse.json({
      id: saved.token,
      type,
      fileName,
      downloadUrl,
      previewUrl: downloadUrl,
      expiresAt: new Date(saved.expiresAt).toISOString(),
    })
  } catch (error: unknown) {
    console.error('[exports] create failed', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Export failed' }, { status: 500 })
  }
}
