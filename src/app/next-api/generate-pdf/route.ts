/**
 * PDF 导出路由 — PC 编辑器「预览 PDF」专用
 *
 * 调用方：src/components/ResumeEditor.tsx → handlePreviewPdf()
 * 认证：cookie（auth_uid）
 * 配额：preview=true 时不消耗，preview=false 时消耗
 * 特点：把序列化后的 HTML 字符串用 puppeteer setContent() 渲染，
 *       默认直接把 PDF 流返回给浏览器（不存文件）；
 *       returnUrl=true 时存入 pdf-temp-store 并返回临时 URL。
 *
 * 与其他导出路由的区别：
 *   - /next-api/exports/mini     H5 移动端 + 小程序统一导出，page.goto(SSR页)，双重认证
 */
import { NextResponse } from 'next/server';
import type { Page } from 'puppeteer-core';
import { paginateHtml, getClientPaginationScript } from '@/utils/paginate-html';
import { checkQuota } from '@/lib/quota/quota-checker';
import { savePdfTemp } from '@/lib/pdf-temp-store';
import { buildExportContentDisposition, sanitizeExportFileName } from '@/lib/export-file-name';
import { closeSharedPuppeteerPage, newSharedPuppeteerPage } from '@/lib/puppeteer-browser';

const PDF_RENDER_TIMEOUT_MS = 45_000;
const ASSET_READY_TIMEOUT_MS = 8_000;

async function waitForDocumentAssets(page: Page): Promise<void> {
  await page.evaluate(async (timeoutMs: number) => {
    const wait = (ms: number): Promise<void> => new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
    const fontsReady = document.fonts?.ready?.catch(() => undefined) ?? Promise.resolve();
    const imagesReady = Promise.all(Array.from(document.images).map((image): Promise<void> => {
      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', () => resolve(), { once: true });
      });
    }));
    await Promise.race([Promise.all([fontsReady, imagesReady]), wait(timeoutMs)]);
  }, ASSET_READY_TIMEOUT_MS);
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  try {
    const { html, preview = false, returnUrl = false, fileName = 'resume' } = await req.json();
    const safeFileName = sanitizeExportFileName(typeof fileName === 'string' ? fileName : 'resume');
    console.log('[generate-pdf] start', {
      preview: Boolean(preview),
      returnUrl: Boolean(returnUrl),
      htmlBytes: typeof html === 'string' ? Buffer.byteLength(html, 'utf8') : 0,
    });

    // Check PDF quota (preview = unlimited, export = limited)
    if (!preview) {
      const quota = await checkQuota('pdf:export');
      if (!quota.allowed) {
        return NextResponse.json(
          {
            error: quota.message,
            quotaExceeded: true,
            remaining: quota.remaining,
          },
          { status: 429 },
        );
      }
    }

    if (!html) {
      return NextResponse.json({ error: 'HTML content is required' }, { status: 400 });
    }

    // Detect one-page mode and bleed templates from the HTML content
    const isOnePage = html.includes('data-one-page="true"');
    const isBleed = html.includes('data-bleed="true"');

    // Pre-process HTML with pagination hints (skip for one-page mode)
    const paginatedHtml = isOnePage || isBleed ? html : paginateHtml(html);

    let page: Page | undefined;
    try {
      page = await newSharedPuppeteerPage();
      page.setDefaultNavigationTimeout(PDF_RENDER_TIMEOUT_MS);
      page.setDefaultTimeout(PDF_RENDER_TIMEOUT_MS);
      
      // Wait for DOM/load first, then tolerate slow fonts/images with a bounded
      // readiness wait. `networkidle0` is too strict for exported HTML and often
      // times out even after the resume is renderable.
      await page.setContent(paginatedHtml, { 
        waitUntil: ['domcontentloaded', 'load'],
        timeout: PDF_RENDER_TIMEOUT_MS,
      });
      await waitForDocumentAssets(page);
      
      // Run client-side pagination script to measure and adjust elements (skip for one-page mode)
      if (!isOnePage && !isBleed) {
        await page.evaluate(getClientPaginationScript());
      }
      
      // Generate PDF
      const pdf = await page.pdf({
        printBackground: true,
        displayHeaderFooter: false,
        preferCSSPageSize: true,
      });

      if (returnUrl) {
        const token = await savePdfTemp(Buffer.from(pdf), safeFileName)
        const url = `/next-api/pdf-file/${token}`
        console.log('[generate-pdf] return PDF temp URL', { token, url, elapsedMs: Date.now() - startedAt })
        return NextResponse.json({ url })
      }

      console.log('[generate-pdf] done', { bytes: pdf.length, elapsedMs: Date.now() - startedAt });
      return new NextResponse(pdf as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': buildExportContentDisposition('attachment', safeFileName, 'pdf'),
        },
      });
    } finally {
      await closeSharedPuppeteerPage(page);
    }
  } catch (error) {
    console.error('PDF generation error:', { error, elapsedMs: Date.now() - startedAt });
    return NextResponse.json({ 
      error: 'Failed to generate PDF',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
