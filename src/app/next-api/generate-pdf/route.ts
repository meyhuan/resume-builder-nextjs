import { NextResponse } from 'next/server';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { paginateHtml, getClientPaginationScript } from '@/utils/paginate-html';
import { checkQuota } from '@/lib/quota/quota-checker';

export async function POST(req: Request) {
  try {
    const { html, preview = false } = await req.json();

    // Check PDF quota (preview = unlimited, export = limited)
    if (!preview) {
      const quota = await checkQuota('pdf');
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

      const response = new NextResponse(pdf as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="resume.pdf"',
        },
      });

      return response;
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
