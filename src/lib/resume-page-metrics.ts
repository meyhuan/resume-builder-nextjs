/** Same A4/margin policy as standalone HTML/PDF export. Screen guides are estimates. */
export const A4_HEIGHT_MM = 297
export const CSS_PX_PER_MM = 96 / 25.4
export const DEFAULT_PAGE_PADDING_VERTICAL = 22
export const ONE_PAGE_READABILITY = { lineHeight: 1.4, fontSize: 12, spacingScale: 0.4 } as const

export interface ResumePageMetrics {
  readonly pageCount: number
  readonly boundaries: readonly number[]
  readonly contentHeight: number
  readonly firstPageHeight: number
  readonly continuationHeight: number
}

export function calculateResumePages(contentHeight: number, paddingVertical: number, zeroMargins: boolean): ResumePageMetrics {
  const margin = zeroMargins ? 0 : Math.max(0, Math.min(100, paddingVertical)) * CSS_PX_PER_MM
  const firstPageHeight = A4_HEIGHT_MM * CSS_PX_PER_MM - margin
  const continuationHeight = A4_HEIGHT_MM * CSS_PX_PER_MM - 2 * margin
  // Allow a CSS pixel for fractional mm/line-box rounding at the boundary.
  const pageCount = 1 + Math.max(0, Math.ceil((contentHeight - firstPageHeight - 1) / continuationHeight))
  const boundaries = Array.from({ length: pageCount - 1 }, (_, index) => firstPageHeight + index * continuationHeight)
  return { pageCount, boundaries, contentHeight, firstPageHeight, continuationHeight }
}

export function readPagePaddingVertical(value: string | null | undefined): number {
  const parsed = value ? Number(value) : NaN
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_PAGE_PADDING_VERTICAL
}
