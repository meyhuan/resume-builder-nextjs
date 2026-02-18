/**
 * useExportPdf provides a callback to print a specific DOM node as PDF
 * using react-to-print. The caller is responsible for providing a ref
 * to the printable element.
 */
import { useReactToPrint } from 'react-to-print'
import type { RefObject } from 'react'

interface UseExportPdfOptions {
  readonly documentTitle?: string
}

export function useExportPdf<T extends HTMLElement>(contentRef: RefObject<T | null>, options?: UseExportPdfOptions): () => void {
  const handlePrint = useReactToPrint({
    // react-to-print types expect HTMLElement; cast safely via unknown without using any
    contentRef: (contentRef as unknown) as RefObject<HTMLElement>,
    documentTitle: options?.documentTitle ?? 'resume',
    pageStyle: '@page { size: A4; margin: 0; }',
  })
  return handlePrint
}
