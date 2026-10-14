/**
 * Compact the vertical whitespace that templates cannot express through the
 * public spacingScale token alone.
 *
 * A large part of the template catalogue uses intentional, template-specific
 * pixel values for card padding, heading gaps and grid row gaps. One-page mode
 * needs to account for those values as a group, otherwise it can reach the
 * spacingScale floor while the rendered page still contains large unused
 * pockets of whitespace. The compactor uses a generated stylesheet instead
 * of mutating React-owned inline styles. That keeps it reversible and makes
 * the exact same operation available to the editor and print renderer.
 */

export type OnePageLayoutStrategy = 'readability' | 'one-page' | 'manual'

const COMPACTION_FACTORS: Record<Exclude<OnePageLayoutStrategy, 'manual'>, number> = {
  readability: 0.9,
  'one-page': 0.78,
}

const COMPACT_ATTR = 'data-one-page-compact-id'
const STYLE_ATTR = 'data-one-page-compact-style'

const COMPACTION_STYLES = new WeakMap<HTMLElement, HTMLStyleElement>()
const A4_HEIGHT_PX = (297 / 25.4) * 96
const PRINT_SAFE_MARGIN_PX = 2
// Reserve a small amount of vertical slack for print-only reflow and
// break-inside: avoid-page decisions. A page can be shorter than A4 in total
// and still move its final protected block to a second sheet.
export const ONE_PAGE_CONTENT_RESERVE_PX = 72

function numeric(value: string): number | null {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

function shouldSkip(element: HTMLElement): boolean {
  if (element instanceof HTMLStyleElement || element instanceof HTMLScriptElement) return true
  if (element.matches('button, input, textarea, select, option, img, svg, [data-export-hide="true"], [aria-hidden="true"], [data-resume-section-actions], [data-resume-block-actions]')) return true
  const style = getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden') return true
  if (style.position === 'absolute' || style.position === 'fixed' || style.position === 'sticky') return true
  return false
}

function scaled(value: number, factor: number): number {
  // Keep one decimal place so generated HTML remains small and deterministic.
  return Math.round(value * factor * 10) / 10
}

function selectorFor(root: HTMLElement, element: HTMLElement, id: string): string {
  const attribute = `[${COMPACT_ATTR}="${id}"]`
  // Template print styles often use their own !important declarations. Keep
  // the compaction rule scoped to the one-page document with higher
  // specificity so those fixed values cannot silently undo it in export.
  if (!root.matches('.resume-document-main')) return attribute
  const scope = '.resume-document-main[data-one-page-mode="true"]'
  return element === root ? `${scope}${attribute}` : `${scope} ${attribute}`
}

function removeCompaction(root: HTMLElement): void {
  COMPACTION_STYLES.get(root)?.remove()
  COMPACTION_STYLES.delete(root)
  root.querySelectorAll<HTMLElement>(`[${COMPACT_ATTR}]`).forEach((element) => {
    element.removeAttribute(COMPACT_ATTR)
  })
  root.removeAttribute(COMPACT_ATTR)
}

/**
 * Apply one-page whitespace compaction to a rendered resume root.
 *
 * Returns a cleanup function. Calling it is safe even when the root has been
 * detached (for example, while switching templates).
 */
export function compactOnePageLayout(
  root: HTMLElement,
  strategy: OnePageLayoutStrategy,
): () => void {
  removeCompaction(root)
  if (strategy === 'manual') return () => removeCompaction(root)

  const factor = COMPACTION_FACTORS[strategy]
  const elements: HTMLElement[] = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))]
    .filter((element) => !shouldSkip(element))
  const rules: string[] = []
  let nextId = 1

  for (const element of elements) {
    const computed = getComputedStyle(element)
    const declarations: string[] = []
    const marginTop = numeric(computed.marginTop)
    const marginBottom = numeric(computed.marginBottom)
    const paddingTop = numeric(computed.paddingTop)
    const paddingBottom = numeric(computed.paddingBottom)
    const rowGap = numeric(computed.rowGap)

    // Negative margins usually create full-bleed artwork. Scaling them would
    // detach the artwork from the page edge, so only compact positive gaps.
    if (marginTop !== null && marginTop >= 4) declarations.push(`margin-top:${scaled(marginTop, factor)}px !important`)
    if (marginBottom !== null && marginBottom >= 4) declarations.push(`margin-bottom:${scaled(marginBottom, factor)}px !important`)
    if (paddingTop !== null && paddingTop >= 4) declarations.push(`padding-top:${scaled(paddingTop, factor)}px !important`)
    if (paddingBottom !== null && paddingBottom >= 4) declarations.push(`padding-bottom:${scaled(paddingBottom, factor)}px !important`)
    if (rowGap !== null && rowGap >= 4) declarations.push(`row-gap:${scaled(rowGap, factor)}px !important`)

    // A few templates reserve a minimum height for a compact card/header. A
    // large A4/page minimum is intentional and must stay intact; smaller
    // component minimums are part of the whitespace users expect one-page mode
    // to reclaim.
    const minHeight = numeric(computed.minHeight)
    if (minHeight !== null && minHeight >= 60 && minHeight < 500 && element.scrollHeight < minHeight * 0.82) {
      declarations.push(`min-height:${scaled(minHeight, factor)}px !important`)
    }

    if (!declarations.length) continue
    const id = element.getAttribute(COMPACT_ATTR) || String(nextId++)
    element.setAttribute(COMPACT_ATTR, id)
    rules.push(`${selectorFor(root, element, id)}{${declarations.join(';')}}`)
  }

  // A sparse resume still represents a physical A4 sheet. Some templates
  // size their page through an outer frame, while others let the content
  // determine the container height. Normalize the latter in one-page mode so
  // preview, pagination metrics, and PDF export agree on the same sheet.
  const page = root.querySelector<HTMLElement>('.resume-container')
  if (page && !shouldSkip(page)) {
    const id = page.getAttribute(COMPACT_ATTR) || String(nextId++)
    page.setAttribute(COMPACT_ATTR, id)
    rules.push(`${selectorFor(root, page, id)}{min-height:calc(297mm - ${PRINT_SAFE_MARGIN_PX}px) !important}`)
  }

  const style = root.ownerDocument.createElement('style')
  style.setAttribute(STYLE_ATTR, '')
  style.textContent = rules.join('\n')
  root.ownerDocument.head.appendChild(style)
  COMPACTION_STYLES.set(root, style)

  return () => removeCompaction(root)
}

export function getOnePageCompactionFactor(strategy: OnePageLayoutStrategy): number {
  return strategy === 'manual' ? 1 : COMPACTION_FACTORS[strategy]
}

/**
 * Measure visible content even when a template clamps its page wrapper to
 * A4 with min-height and lets children overflow visibly past that wrapper.
 * scrollHeight alone cannot see that overflow, which would make one-page mode
 * report "fit" while print pagination creates a second sheet.
 */
export function measureOnePageContentHeight(root: HTMLElement): number {
  const rootRect = root.getBoundingClientRect()
  const scale = root.offsetWidth > 0 ? rootRect.width / root.offsetWidth || 1 : 1
  let bottom = Math.max(root.scrollHeight, root.clientHeight)

  for (const element of root.querySelectorAll<HTMLElement>('*')) {
    const style = getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden') continue
    // Absolute decorations are usually inside the page flow, but they can
    // also contain real template content. Include them in the boundary check
    // so a lower absolutely-positioned block cannot be clipped silently.
    if (style.position === 'fixed' || style.position === 'sticky') continue
    const rect = element.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) continue
    bottom = Math.max(bottom, (rect.bottom - rootRect.top) / scale)
  }

  return Math.ceil(bottom)
}

/**
 * Measure the content that would naturally flow on the page, ignoring the
 * artificial A4-sized min-height used to paint the editor's paper surface.
 *
 * The editor and the standalone print document do not always resolve the
 * template at exactly the same width. Measuring the page shell itself can
 * therefore report "fit" while print reflow pushes the last block onto a
 * second sheet. Temporarily removing page-shell min-heights makes the fit
 * decision depend on real content boundaries while restoring the visual page
 * immediately after the synchronous layout read.
 */
export function measureNaturalOnePageContentHeight(root: HTMLElement): number {
  const candidates = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))]
    .filter((element) => numeric(getComputedStyle(element).minHeight) !== null && numeric(getComputedStyle(element).minHeight)! >= A4_HEIGHT_PX * 0.8)
  const snapshots = candidates.map((element) => ({
    element,
    minHeight: element.style.getPropertyValue('min-height'),
    minHeightPriority: element.style.getPropertyPriority('min-height'),
    height: element.style.getPropertyValue('height'),
    heightPriority: element.style.getPropertyPriority('height'),
  }))

  try {
    for (const { element } of snapshots) {
      // !important is required because one-page compaction deliberately uses
      // the same priority for its A4 paper shell rule.
      element.style.setProperty('min-height', '0px', 'important')
      // Full-height column children otherwise keep the removed page height
      // through `height: 100%`, masking the actual content boundary.
      element.style.setProperty('height', 'auto', 'important')
    }
    return measureOnePageContentHeight(root)
  } finally {
    for (const { element, minHeight, minHeightPriority, height, heightPriority } of snapshots) {
      if (minHeight) element.style.setProperty('min-height', minHeight, minHeightPriority)
      else element.style.removeProperty('min-height')
      if (height) element.style.setProperty('height', height, heightPriority)
      else element.style.removeProperty('height')
    }
  }
}

/**
 * Measure the one-page print frame after print-only CSS has reflowed the
 * template. This function never scales or clips content: CSS transforms do
 * not participate in fragmentation, and a fixed-height frame with hidden
 * overflow can produce a PDF that looks valid while dropping the tail.
 *
 * When the content is too tall, the frame is released back to native
 * fragmentation. The caller can surface the overflow state in the UI while
 * Chromium produces as many complete A4 pages as are required.
 */
export interface OnePagePrintFit {
  readonly fits: boolean
  readonly contentHeight: number
  readonly targetHeight: number
}

export function fitOnePagePrintFrame(frame: HTMLElement, root: HTMLElement): OnePagePrintFit {
  const targetHeight = A4_HEIGHT_PX - PRINT_SAFE_MARGIN_PX
  frame.style.height = 'auto'
  frame.style.minHeight = `${targetHeight}px`
  frame.style.overflow = 'visible'
  frame.style.breakInside = 'avoid'
  frame.style.pageBreakAfter = 'avoid'
  root.style.transform = 'none'
  root.style.transformOrigin = 'top left'

  const contentHeight = measureNaturalOnePageContentHeight(root)
  const fits = contentHeight <= targetHeight
  frame.dataset.onePageFit = fits ? 'true' : 'false'
  root.dataset.onePageFit = fits ? 'true' : 'false'

  if (!fits) {
    // A genuinely long resume should paginate. Never keep a fixed-height
    // frame or enable clipping while falling back to native fragmentation.
    frame.style.minHeight = '0'
    frame.style.setProperty('break-inside', 'auto', 'important')
    frame.style.setProperty('page-break-after', 'auto', 'important')
    root.style.setProperty('break-after', 'auto', 'important')
    root.style.setProperty('page-break-after', 'auto', 'important')
  }

  return { fits, contentHeight, targetHeight }
}
