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
  return `${DOCUMENT_DOCTYPE}\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta http-equiv="X-UA-Compatible" content="IE=edge">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${title}</title>\n  ${fonts}\n  <style>\n  ${styles}\n  @media print {\n    @page {\n      size: A4;\n      margin: 10mm; /* Uniform margins on all pages */\n    }\n    body {\n      margin: 0;\n      padding: 0;\n    }\n  }\n  * {\n    -webkit-print-color-adjust: exact;\n    print-color-adjust: exact;\n  }\n  </style>\n</head>\n<body>\n${markup}\n</body>\n</html>`
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
    } catch (_error) {
      continue
    }
  }
  return cssTexts.join('\n')
}
