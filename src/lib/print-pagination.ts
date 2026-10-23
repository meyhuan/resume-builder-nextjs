/**
 * The shared print contract used by the editor HTML export and the SSR print
 * page. Chromium is the paginator: these rules only describe which semantic
 * boxes may stay together and which text may fragment naturally.
 */
export const PRINT_PAGINATION_CSS = `
@media print {
  html, body {
    height: auto !important;
    overflow: visible !important;
  }

  #print-root,
  [data-print-template],
  [data-one-page-print-frame],
  .resume-document-main,
  .resume-container {
    overflow: visible !important;
  }

  [data-template-section] {
    break-inside: auto;
    page-break-inside: auto;
  }

  [data-template-section-header],
  .resume-section-header,
  .section-title,
  h1, h2, h3 {
    break-after: avoid-page !important;
    page-break-after: avoid !important;
    orphans: 3;
    widows: 3;
  }

  /* Compact items stay together. Text-bearing items opt out below: avoid-page
     on an ancestor otherwise pushes the entire item onto the next page, even
     when its rich-text child explicitly allows fragmentation. */
  :where(
    [data-resume-block],
    .resume-item,
    .experience-item,
    .education-item,
    .project-item,
    .skill-item,
    figure,
    table
  ) {
    break-inside: avoid-page;
    page-break-inside: avoid;
  }

  :is(
    [data-resume-block],
    .resume-item,
    .experience-item,
    .education-item,
    .project-item,
    .skill-item
  ):has([data-print-splittable="true"]):not([data-print-keep-together="true"]) {
    break-inside: auto;
    page-break-inside: auto;
  }

  [data-print-block-header] {
    break-inside: avoid-page;
    page-break-inside: avoid;
    break-after: avoid-page;
    page-break-after: avoid;
  }

  /* Rich text can fragment at paragraphs/lines, respecting widows/orphans. */
  [data-print-splittable="true"] {
    break-inside: auto !important;
    page-break-inside: auto !important;
    orphans: 3;
    widows: 3;
  }

  img, svg, canvas {
    break-inside: avoid-page;
    page-break-inside: avoid;
  }

  p, li {
    orphans: 3;
    widows: 3;
  }

  [data-one-page-print-frame="true"] {
    break-inside: avoid-page !important;
    page-break-after: avoid !important;
  }
}
`

/** Runs in the print browser after fonts and one-page fitting settle.
 * Only classifies items; Chromium still chooses every physical page break.
 * Keep this function self-contained so both renderers can pass it to evaluate.
 */
export function preparePrintFragmentation(): void {
  const selector = '[data-resume-block], .resume-item, .experience-item, .education-item, .project-item, .skill-item'
  const items = Array.from(document.querySelectorAll<HTMLElement>(selector))
  // Clear previous measurements, including when re-rendering optimized images.
  for (const item of items) item.removeAttribute('data-print-keep-together')
  const decisions = items.map((item) => {
    if (!item.querySelector('[data-print-splittable="true"]')) return false
    if (item.closest('[data-one-page="true"]')) return false
    const container = item.closest('.resume-container')
    const rawPadding = Number(container?.getAttribute('data-page-padding-vertical') ?? 19)
    const padding = Number.isFinite(rawPadding) ? Math.max(0, Math.min(100, rawPadding)) : 19
    const usableHeight = (297 - padding * 2) * 96 / 25.4
    const height = item.getBoundingClientRect().height
    return height > 0 && height <= usableHeight / 3
  })
  // Batch writes after measurements to avoid interleaving layout and mutation.
  items.forEach((item, index) => {
    if (decisions[index]) item.setAttribute('data-print-keep-together', 'true')
  })
}

export interface PrintLayoutDiagnostics {
  readonly hasRoot: boolean
  readonly onePage: boolean
  readonly onePageStatus: string
  readonly rootHeight: number
  readonly frameHeight: number
  readonly hiddenOverflowAncestors: number
  readonly transformedRoot: boolean
}

/**
 * Read-only browser diagnostics. It deliberately never changes layout; PDF
 * output must come from the same native fragmentation pass that the browser
 * displays in print preview.
 */
export function getPrintLayoutDiagnostics(): PrintLayoutDiagnostics {
  const root = document.querySelector<HTMLElement>('[data-print-template] .resume-document-main, .resume-document-main')
  const frame = document.querySelector<HTMLElement>('[data-one-page-print-frame]')
  let hiddenOverflowAncestors = 0
  if (root) {
    let node: HTMLElement | null = root
    while (node) {
      const style = getComputedStyle(node)
      const clips = style.overflow === 'hidden' || style.overflow === 'clip' || style.overflowY === 'hidden' || style.overflowY === 'clip'
      if (clips && node.scrollHeight > node.clientHeight + 1) hiddenOverflowAncestors += 1
      node = node.parentElement
    }
  }
  return {
    hasRoot: Boolean(root),
    onePage: root?.getAttribute('data-one-page') === 'true',
    onePageStatus: root?.getAttribute('data-one-page-status') ?? 'unknown',
    rootHeight: root?.scrollHeight ?? 0,
    frameHeight: frame?.getBoundingClientRect().height ?? 0,
    hiddenOverflowAncestors,
    transformedRoot: Boolean(root && getComputedStyle(root).transform !== 'none'),
  }
}
