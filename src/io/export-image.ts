/**
 * exportImage exports a DOM node to a PNG file using html-to-image.
 */
import { toPng } from 'html-to-image'
import type { RefObject } from 'react'

interface ExportImageOptions {
  readonly fileName?: string
  readonly pixelRatio?: number
  readonly backgroundColor?: string
}

/**
 * Export the given element to a PNG file.
 */
export async function exportImage<T extends HTMLElement>(contentRef: RefObject<T | null>, options?: ExportImageOptions): Promise<void> {
  const node: T | null = contentRef.current
  if (!node) {
    return
  }
  const dataUrl: string = await toPng((node as unknown) as HTMLElement, {
    pixelRatio: options?.pixelRatio ?? 2,
    cacheBust: true,
    backgroundColor: options?.backgroundColor,
  })
  const link: HTMLAnchorElement = document.createElement('a')
  link.download = `${options?.fileName ?? 'resume'}.png`
  link.href = dataUrl
  link.click()
}
