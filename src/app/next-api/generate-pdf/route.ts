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
 *   - /next-api/exports          H5 移动端，结果存 export-temp-store，返回 token
 *   - /next-api/exports/mini     小程序，puppeteer page.goto(SSR页) 渲染，HMAC 认证
 *
 * TODO: 若后续 H5 移动端也改为直接下载（不需要 token），
 *       可将本路由与 /next-api/exports 合并，减少重复。
 */
import { NextResponse } from 'next/server';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { paginateHtml, getClientPaginationScript } from '@/utils/paginate-html';
import { checkQuota } from '@/lib/quota/quota-checker';
import { savePdfTemp } from '@/lib/pdf-temp-store';

export async function POST(req: Request) {
  try {
    const { html, preview = false, returnUrl = false, fileName = 'resume' } = await req.json();

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

    // Pre-process HTML with pagination hints (skip for one-page mode)
    const paginatedHtml = isOnePage ? html : paginateHtml(html);

    const isLocal = process.env.NODE_ENV === 'development';
    
    // For local development, we might need a different path for the executable
    const executablePath = isLocal 
      ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' // Default Windows path
      : await chromium.executablePath();

    let browser;
    try {
      browser = await puppeteerCore.launch({
        args: isLocal ? [] : chromium.args,
        executablePath: executablePath,
        headless: true,
      });

      const page = await browser.newPage();
      
      // Set content and wait for network idle to ensure fonts/images load
      await page.setContent(paginatedHtml, { 
        waitUntil: ['networkidle0', 'domcontentloaded', 'load'],
      });
      
      // Ensure all fonts are loaded
      await page.evaluateHandle('document.fonts.ready');
      
      // Run client-side pagination script to measure and adjust elements (skip for one-page mode)
      if (!isOnePage) {
        await page.evaluate(getClientPaginationScript());
      }
      
      // Generate PDF
      const pdf = await page.pdf({
        printBackground: true,
        displayHeaderFooter: false,
        preferCSSPageSize: true,
      });

      if (returnUrl) {
        const token = await savePdfTemp(Buffer.from(pdf), fileName)
        const url = `/next-api/pdf-file/${token}`
        console.log('[generate-pdf] return PDF temp URL', { token, url, fileName })
        return NextResponse.json({ url })
      }

      return new NextResponse(pdf as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}.pdf"`,
        },
      });
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate PDF',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
