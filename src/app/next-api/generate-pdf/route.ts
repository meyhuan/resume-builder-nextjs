import { NextResponse } from 'next/server';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { paginateHtml, getClientPaginationScript } from '@/utils/paginate-html';

export async function POST(req: Request) {
  try {
    const { html } = await req.json();

    if (!html) {
      return NextResponse.json({ error: 'HTML content is required' }, { status: 400 });
    }

    // Detect one-page mode and bleed templates from the HTML content
    const isOnePage = html.includes('data-one-page="true"');
    const isBleed = html.includes('data-bleed="true"');

    // Extract vertical page padding from template data attribute (default 22mm)
    const DEFAULT_PADDING_V = 22;
    const paddingMatch: RegExpMatchArray | null = (html as string).match(/data-page-padding-vertical="(\d+(?:\.\d+)?)"/);
    const pagePaddingVertical: number = paddingMatch ? parseFloat(paddingMatch[1]) : DEFAULT_PADDING_V;
    // Bleed templates (elegant/warm) keep margin 0 — page-break padding handled by pagination script
    const verticalMargin: string = (isOnePage || isBleed) ? '0' : `${pagePaddingVertical}mm`;

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
        format: 'A4',
        printBackground: true,
        margin: {
          top: verticalMargin,
          right: '0',
          bottom: verticalMargin,
          left: '0',
        },
        displayHeaderFooter: false,
        preferCSSPageSize: false,
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
