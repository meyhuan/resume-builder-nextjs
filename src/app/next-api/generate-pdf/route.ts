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
const PDF_AUTO_OPTIMIZE_THRESHOLD_BYTES = 25 * 1024 * 1024;
const OSS_EXPORT_IMAGE_WIDTH = 1600;
const OSS_EXPORT_IMAGE_QUALITY = 75;

async function waitForDocumentAssets(page: Page): Promise<void> {
  const failedPortfolioImages = await page.evaluate(async (timeoutMs: number): Promise<string[]> => {
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
    return Array.from(document.querySelectorAll<HTMLImageElement>('.portfolio-appendix img'))
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src);
  }, ASSET_READY_TIMEOUT_MS);
  if (failedPortfolioImages.length > 0) {
    throw new Error(`Portfolio images failed to load: ${failedPortfolioImages.length}`);
  }
}

async function optimizeOssImagesForPdf(page: Page): Promise<number> {
  return page.evaluate(({ width, quality }) => {
    let optimizedCount = 0;
    for (const image of Array.from(document.images)) {
      try {
        const source = image.currentSrc || image.src;
        const url = new URL(source);
        if (!url.hostname.endsWith('.aliyuncs.com')) continue;

        url.searchParams.set(
          'x-oss-process',
          `image/resize,w_${width}/quality,q_${quality}/format,webp`,
        );
        image.removeAttribute('srcset');
        image.src = url.toString();
        optimizedCount += 1;
      } catch {
        // Keep non-OSS or malformed image URLs unchanged.
      }
    }
    return optimizedCount;
  }, { width: OSS_EXPORT_IMAGE_WIDTH, quality: OSS_EXPORT_IMAGE_QUALITY });
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
      const pdfPage = page;
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
      
      const createPdf = () => pdfPage.pdf({
        printBackground: true,
        displayHeaderFooter: false,
        preferCSSPageSize: true,
      });
      let pdf = await createPdf();
      let autoOptimized = false;

      // Large portfolio PDFs can exceed the upload gateway limit even when each
      // original image is reasonable. Re-render only those PDFs with OSS image
      // processing, keeping normal exports untouched.
      if (pdf.length > PDF_AUTO_OPTIMIZE_THRESHOLD_BYTES) {
        const optimizedImageCount = await optimizeOssImagesForPdf(page);
        if (optimizedImageCount > 0) {
          await waitForDocumentAssets(page);
          pdf = await createPdf();
          autoOptimized = true;
          console.log('[generate-pdf] auto-optimized-images', {
            optimizedImageCount,
            bytes: pdf.length,
          });
        }
      }

      if (returnUrl) {
        const token = await savePdfTemp(Buffer.from(pdf), safeFileName)
        const url = `/next-api/pdf-file/${token}`
        console.log('[generate-pdf] return PDF temp URL', { token, url, autoOptimized, elapsedMs: Date.now() - startedAt })
        return NextResponse.json({ url })
      }

      console.log('[generate-pdf] done', { bytes: pdf.length, autoOptimized, elapsedMs: Date.now() - startedAt });
      return new NextResponse(pdf as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': buildExportContentDisposition('attachment', safeFileName, 'pdf'),
          'X-Pdf-Size-Bytes': String(pdf.length),
          'X-Pdf-Auto-Optimized': autoOptimized ? '1' : '0',
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
