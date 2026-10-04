'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { readPdfPageCount } from '@/io/pdf-page-count'

/** A verified count is valid only for the version used to generate its PDF. */
export function usePdfPreviewPageCount(revision: string) {
  const [verified, setVerified] = useState<{ readonly revision: string; readonly count: number | null }>({ revision, count: null })
  const currentRevision = useRef(revision)
  const request = useRef(0)
  if (verified.revision !== revision) setVerified({ revision, count: null })

  useEffect(() => {
    currentRevision.current = revision
    request.current += 1
    return () => { request.current += 1 }
  }, [revision])

  const recordPreview = useCallback(async (blob: Blob, previewRevision: string): Promise<void> => {
    if (previewRevision !== currentRevision.current) return
    const id = ++request.current
    setVerified({ revision: previewRevision, count: null })
    try {
      const count = await readPdfPageCount(blob)
      if (request.current === id && currentRevision.current === previewRevision) {
        setVerified({ revision: previewRevision, count })
      }
    } catch (error) {
      // Counting is optional feedback; a valid preview must still remain usable.
      console.warn('无法读取 PDF 页数，保留预计页数', error)
    }
  }, [])

  return { pdfPageCount: verified.revision === revision ? verified.count : null, recordPreview }
}
