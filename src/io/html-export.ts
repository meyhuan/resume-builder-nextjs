import { readPagePaddingVertical } from '@/lib/resume-page-metrics'
/**
 * Utilities for exporting the rendered resume as standalone HTML.
 */
import { buildResumeFontFaceCss, RESUME_FONT_BASE_URL } from '@/entities/theme/font-stacks'
import { PRINT_PAGINATION_CSS } from '@/lib/print-pagination'

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
  // The PDF service renders this standalone HTML without an app page URL.
  const styles: string = `${buildResumeFontFaceCss(RESUME_FONT_BASE_URL)}\n${collectStyleContent()}`
  const exportElement = element.cloneNode(true) as HTMLElement
  exportElement.querySelectorAll('[data-export-hide="true"]').forEach((node) => node.remove())
  for (const node of [exportElement, ...exportElement.querySelectorAll('[data-resume-edit-region], [data-resume-edit-field]')]) {
    if (node.hasAttribute('data-resume-edit-region') || node.hasAttribute('data-resume-edit-field')) node.removeAttribute('tabindex')
    for (const attribute of ['data-resume-edit-region', 'data-resume-edit-field', 'data-resume-edit-state', 'data-resume-edit-dragging']) {
      node.removeAttribute(attribute)
    }
  }
  const markup: string = exportElement.outerHTML
  const isOnePage: boolean = markup.includes('data-one-page="true"')
  const isBleed: boolean = markup.includes('data-bleed="true"')
  const pagePaddingVertical: number = extractPagePaddingVertical(markup)
  const onePageCss: string = isOnePage
    ? `\n    .resume-document-main[data-one-page="true"] {\n      page-break-after: avoid !important;\n      break-after: avoid !important;\n    }`
    : ''
  const onePageFrameCss: string = isOnePage
    ? '\n    [data-one-page-print-frame="true"] { width: 210mm; max-width: 210mm; margin: 0 auto; overflow: visible; break-inside: avoid !important; page-break-after: avoid !important; }'
    : ''
  const pageMarginCss: string = isOnePage
    ? 'margin: 0;'
    : isBleed
      ? 'margin: 0;'
    : `margin: ${pagePaddingVertical}mm 0;`
  const firstPageMarginCss: string = (isOnePage || isBleed)
    ? ''
    : `\n    @page:first {\n      margin-top: 0;\n    }`
  const bleedPageCss: string = isBleed && !isOnePage
    ? `\n    .page {\n      min-height: 0 !important;\n      height: auto !important;\n    }\n    .resume-container[data-bleed="true"] {\n      min-height: calc(297mm - 1px) !important;\n    }`
    : ''
  const squareCornersCss: string = `\n    .page {\n      border-radius: 0 !important;\n      box-shadow: none !important;\n    }`
  const bodyMarkup: string = isOnePage ? `<div data-one-page-print-frame="true">${markup}</div>` : markup
  // Screen-width fit can differ from exact A4 print reflow. Re-check the
  // natural content boundary after fonts settle and release an overfull
  // one-page wrapper to Chromium's native fragmentation.
  const onePageFitGuardScript: string = isOnePage
    ? `<script>
(() => {
  const targetHeight = (297 / 25.4) * 96 - 2;
  const pagePadding = ${pagePaddingVertical};
  const naturalHeight = (root) => {
    const roots = [root, ...root.querySelectorAll('*')].filter((element) => {
      const minHeight = parseFloat(getComputedStyle(element).minHeight);
      return Number.isFinite(minHeight) && minHeight >= targetHeight * 0.8;
    });
    const snapshots = roots.map((element) => ({
      element,
      minHeight: element.style.getPropertyValue('min-height'),
      minHeightPriority: element.style.getPropertyPriority('min-height'),
      height: element.style.getPropertyValue('height'),
      heightPriority: element.style.getPropertyPriority('height'),
    }));
    try {
      roots.forEach((element) => {
        element.style.setProperty('min-height', '0px', 'important');
        element.style.setProperty('height', 'auto', 'important');
      });
      const rootRect = root.getBoundingClientRect();
      const scale = root.offsetWidth > 0 ? (rootRect.width / root.offsetWidth || 1) : 1;
      let bottom = Math.max(root.scrollHeight, root.clientHeight);
      root.querySelectorAll('*').forEach((element) => {
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || style.position === 'fixed' || style.position === 'sticky') return;
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) bottom = Math.max(bottom, (rect.bottom - rootRect.top) / scale);
      });
      return Math.ceil(bottom);
    } finally {
      snapshots.forEach(({ element, minHeight, minHeightPriority, height, heightPriority }) => {
        if (minHeight) element.style.setProperty('min-height', minHeight, minHeightPriority);
        else element.style.removeProperty('min-height');
        if (height) element.style.setProperty('height', height, heightPriority);
        else element.style.removeProperty('height');
      });
    }
  };
  const release = (root, frame) => {
    root.dataset.onePage = 'false';
    root.dataset.onePageMode = 'false';
    root.dataset.onePageStatus = 'overflow';
    root.dataset.onePageFit = 'false';
    frame.removeAttribute('data-one-page-print-frame');
    frame.style.removeProperty('height');
    frame.style.removeProperty('min-height');
    frame.style.setProperty('overflow', 'visible', 'important');
    const fallback = document.createElement('style');
    fallback.textContent = '@media print { @page { size: A4; margin: ' + pagePadding + 'mm 0; } @page:first { margin-top: 0; } }';
    document.head.appendChild(fallback);
  };
  const check = () => {
    const root = document.querySelector('.resume-document-main[data-one-page="true"]');
    const frame = document.querySelector('[data-one-page-print-frame="true"]');
    if (!root || !frame) return;
    const fits = naturalHeight(root) <= targetHeight;
    root.dataset.onePageFit = fits ? 'true' : 'false';
    if (!fits) release(root, frame);
  };
  check();
  const settle = (async () => {
    try { await (document.fonts?.ready || Promise.resolve()); } catch {}
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    check();
    document.documentElement.dataset.onePageGuard = 'ready';
  })();
  window.__resumeOnePageGuardReady = settle;
})();
</script>`
    : ''
  return `${DOCUMENT_DOCTYPE}\n<html lang="zh-CN">\n<head>\n  <meta charset="UTF-8">\n  <meta http-equiv="X-UA-Compatible" content="IE=edge">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${title}</title>\n  ${fonts}\n  <style>\n  ${styles}${PRINT_PAGINATION_CSS}${squareCornersCss}\n  @media print {\n    @page {\n      size: A4;\n      ${pageMarginCss}\n    }${firstPageMarginCss}\n    body {\n      margin: 0;\n      padding: 0;\n    }${onePageCss}${onePageFrameCss}${bleedPageCss}\n  }\n  * {\n    -webkit-print-color-adjust: exact;\n    print-color-adjust: exact;\n  }\n  .resume-container, .resume-container * {\n    box-shadow: none !important;\n    filter: none !important;\n    font-synthesis: style;\n    text-shadow: none !important;\n  }\n  </style>\n</head>\n<body>\n${bodyMarkup}\n${onePageFitGuardScript}\n</body>\n</html>`
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

function extractPagePaddingVertical(markup: string): number {
  const match: RegExpMatchArray | null = markup.match(/data-page-padding-vertical="(\d+(?:\.\d+)?)"/)
  return readPagePaddingVertical(match?.[1])
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
