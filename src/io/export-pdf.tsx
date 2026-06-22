/**
 * useExportPdf provides a callback to print a specific DOM node as PDF
 * using react-to-print. The caller is responsible for providing a ref
 * to the printable element.
 */
import { useReactToPrint } from 'react-to-print'
import type { RefObject } from 'react'

interface UseExportPdfOptions {
  readonly documentTitle?: string
  readonly pagePaddingVertical?: number
  readonly isBleed?: boolean
}

export function useExportPdf<T extends HTMLElement>(contentRef: RefObject<T | null>, options?: UseExportPdfOptions): () => void {
  const paddingV: number = options?.pagePaddingVertical ?? 0
  const isBleed: boolean = options?.isBleed ?? false
  const pageMargin: string = (isBleed || paddingV <= 0) ? '0' : `${paddingV}mm 0`
  const firstPageMargin: string = (isBleed || paddingV <= 0) ? '' : ' @page:first { margin-top: 0; }'
  const squareCornersOverride: string =
    ' .page { border-radius: 0 !important; box-shadow: none !important; }'
  const handlePrint = useReactToPrint({
    // react-to-print types expect HTMLElement; cast safely via unknown without using any
    contentRef: (contentRef as unknown) as RefObject<HTMLElement>,
    documentTitle: options?.documentTitle ?? 'resume',
    pageStyle: `@page { size: A4; margin: ${pageMargin}; }${firstPageMargin}${squareCornersOverride}`,
  })
  return handlePrint
}
