/**
 * exportImage exports a DOM node to a PNG file using html-to-image.
 */
import { toPng } from 'html-to-image'
import type { RefObject } from 'react'

interface ExportImageOptions {
  readonly fileName?: string
  readonly pixelRatio?: number
  readonly backgroundColor?: string
  readonly returnBase64?: boolean
  /** When true, clip the capture to the first A4 page (297 mm). */
  readonly clipFirstPage?: boolean
  /**
   * When true, neutralize any CSS `transform` on the captured node
   * (e.g. `scale()` used for viewport-fit previews on mobile) so the
   * produced image is not shrunk with empty padding.
   */
  readonly resetTransform?: boolean
}

/** Convert mm to px using a temporary DOM element. */
function mmToPx(mm: number): number {
  const el: HTMLDivElement = document.createElement('div')
  el.style.width = `${mm}mm`
  el.style.position = 'absolute'
  el.style.visibility = 'hidden'
  document.body.appendChild(el)
  const px: number = el.offsetWidth
  document.body.removeChild(el)
  return px
}

/**
 * Export the given element to a PNG file or return as Base64.
 */
export async function exportImage<T extends HTMLElement>(contentRef: RefObject<T | null>, options?: ExportImageOptions): Promise<string | void> {
  const node: T | null = contentRef.current
  if (!node) {
    return
  }
  const toPngOptions: Record<string, unknown> = {
    pixelRatio: options?.pixelRatio ?? 2,
    cacheBust: true,
    backgroundColor: options?.backgroundColor,
  }
  const cloneStyle: Record<string, string> = {}
  if (options?.resetTransform) {
    cloneStyle.transform = 'none'
    cloneStyle.transformOrigin = 'top left'
  }
  if (options?.clipFirstPage) {
    const a4HeightPx: number = mmToPx(297)
    const nodeHeight: number = node.scrollHeight
    if (nodeHeight > a4HeightPx) {
      toPngOptions.height = a4HeightPx
      cloneStyle.overflow = 'hidden'
      cloneStyle.maxHeight = `${a4HeightPx}px`
    }
  }
  if (Object.keys(cloneStyle).length > 0) {
    toPngOptions.style = cloneStyle
  }
  const dataUrl: string = await toPng((node as unknown) as HTMLElement, toPngOptions)

  if (options?.returnBase64) {
    return dataUrl
  }

  const link: HTMLAnchorElement = document.createElement('a')
  link.download = `${options?.fileName ?? 'resume'}.png`
  link.href = dataUrl
  link.click()
}
