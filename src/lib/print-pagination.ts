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

  /* A normal resume item stays together when it fits. Chromium may fragment
     an item that is taller than the remaining page, so long rich text is not
     silently pushed out of the document. */
  [data-resume-block],
  .resume-item,
  .experience-item,
  .education-item,
  .project-item,
  .skill-item,
  figure,
  table {
    break-inside: avoid-page !important;
    page-break-inside: avoid !important;
  }

  /* Rich text is the intentional fragmentation boundary inside a block. */
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
