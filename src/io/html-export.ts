/**
 * Utilities for exporting the rendered resume as standalone HTML.
 */

const DOCUMENT_DOCTYPE: string = '<!DOCTYPE html>'
const DEFAULT_TITLE: string = 'Resume'

export interface ResumeHtmlOptions {
  readonly title?: string
}

/**
 * Build a complete HTML document string representing the resume element.
 */
export function buildResumeHtml(element: HTMLElement, options?: ResumeHtmlOptions): string {
  const title: string = options?.title ?? DEFAULT_TITLE
  const fonts: string = collectFontLinks()
  const styles: string = collectStyleContent()
  const markup: string = element.outerHTML
  const isOnePage: boolean = markup.includes('data-one-page="true"')
  const isBleed: boolean = markup.includes('data-bleed="true"')
  const pagePaddingVertical: number = extractPagePaddingVertical(markup)
  const onePageCss: string = isOnePage
    ? `\n    .page[data-one-page="true"] {\n      max-height: 297mm !important;\n      height: 297mm !important;\n      overflow: hidden !important;\n      page-break-after: avoid !important;\n      break-after: avoid !important;\n    }`
    : ''
  const pageMarginCss: string = isOnePage
    ? 'margin: 0;'
    : isBleed
      ? 'margin: 0;'
    : `margin: ${pagePaddingVertical}mm 0;`
  const perPageMarginCss: string = (isOnePage || isBleed)
    ? ''
    : `\n    .resume-container,\n    .resume-body-content {\n      padding-top: 0 !important;\n      padding-bottom: 0 !important;\n    }`
  const bleedPageCss: string = isBleed && !isOnePage
    ? `\n    .page {\n      min-height: 0 !important;\n      height: auto !important;\n    }\n    .resume-container[data-bleed="true"] {\n      min-height: calc(297mm - 1px) !important;\n    }`
    : ''
  const bleedFirstPageCss: string = ''
  const squareCornersCss: string = `\n    .page {\n      border-radius: 0 !important;\n      box-shadow: none !important;\n    }`
  return `${DOCUMENT_DOCTYPE}\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta http-equiv="X-UA-Compatible" content="IE=edge">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${title}</title>\n  ${fonts}\n  <style>\n  ${styles}${squareCornersCss}\n  @media print {\n    @page {\n      size: A4;\n      ${pageMarginCss}\n    }${bleedFirstPageCss}\n    body {\n      margin: 0;\n      padding: 0;\n    }${onePageCss}${perPageMarginCss}${bleedPageCss}\n  }\n  * {\n    -webkit-print-color-adjust: exact;\n    print-color-adjust: exact;\n  }\n  </style>\n</head>\n<body>\n${markup}\n</body>\n</html>`
}

/**
 * Create an HTML Blob for download or upload.
 */
export function createResumeHtmlBlob(element: HTMLElement, options?: ResumeHtmlOptions): Blob {
  const html: string = buildResumeHtml(element, options)
  return new Blob([html], { type: 'text/html;charset=utf-8' })
}

/**
 * Create an object URL pointing to the generated resume HTML.
 */
export function createResumeHtmlObjectUrl(element: HTMLElement, options?: ResumeHtmlOptions): string {
  const blob: Blob = createResumeHtmlBlob(element, options)
  return URL.createObjectURL(blob)
}

const DEFAULT_PAGE_PADDING_VERTICAL: number = 22

function extractPagePaddingVertical(markup: string): number {
  const match: RegExpMatchArray | null = markup.match(/data-page-padding-vertical="(\d+(?:\.\d+)?)"/)
  if (!match) return DEFAULT_PAGE_PADDING_VERTICAL
  const value: number = parseFloat(match[1])
  return Number.isFinite(value) ? value : DEFAULT_PAGE_PADDING_VERTICAL
}

function collectFontLinks(): string {
  const links: NodeListOf<HTMLLinkElement> = document.querySelectorAll('link[rel="stylesheet"]')
  const fontLinks: string[] = []
  links.forEach((link) => {
    const href: string | null = link.getAttribute('href')
    if (!href) return
    const isFont: boolean = href.includes('fonts') || href.includes('fontsource')
    if (isFont) fontLinks.push(link.outerHTML)
  })
  return fontLinks.join('\n  ')
}

function collectStyleContent(): string {
  const cssTexts: string[] = []
  const styleTags: NodeListOf<HTMLStyleElement> = document.querySelectorAll('style')
  styleTags.forEach((styleTag) => {
    if (styleTag.textContent) cssTexts.push(styleTag.textContent)
  })
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules: CSSRuleList = sheet.cssRules
      for (const rule of Array.from(rules)) cssTexts.push(rule.cssText)
    } catch {
      continue
    }
  }
  return cssTexts.join('\n')
}
