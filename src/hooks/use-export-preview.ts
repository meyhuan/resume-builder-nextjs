'use client'

import { useEffect, useRef, useState } from 'react'
import type { ExportFormat } from '@/components/export-format-options'
import type { ExportPreviewAsset } from '@/lib/export-preview'
import type { ExportProgressListener, ExportProgressStage } from '@/lib/export-progress'

/** Cache per content revision; late responses can never replace another format. */
export function useExportPreview(
  format: ExportFormat,
  revision: string,
  enabled: boolean,
  prepare: (format: ExportFormat, progress?: ExportProgressListener) => Promise<ExportPreviewAsset>,
) {
  const cache = useRef(new Map<string, Promise<ExportPreviewAsset>>())
  const prepareRef = useRef(prepare)
  useEffect(() => { prepareRef.current = prepare }, [prepare])
  const [attempt, setAttempt] = useState(0)
  const [progress, setProgress] = useState<{ key: string; stage: ExportProgressStage }>({ key: '', stage: 'preparing' })
  const [state, setState] = useState<{
    key: string
    asset?: ExportPreviewAsset
    error?: string
  }>({ key: '' })
  const key = `${revision}:${format}`
  useEffect(() => {
    cache.current.clear()
  }, [revision])
  useEffect(() => {
    if (!enabled) return
    let current = true
    let expiryTimer: ReturnType<typeof setTimeout> | undefined
    let pending = cache.current.get(key)
    if (!pending) {
      const request = prepareRef.current
      pending = Promise.resolve().then(() => {
        setProgress({ key, stage: 'preparing' })
        return request(format, stage => setProgress({ key, stage }))
      })
      cache.current.set(key, pending)
    }
    void pending
      .then((asset) => {
        if (Date.parse(asset.expiresAt) <= Date.now())
          throw new Error('预览已过期，请重新生成')
        if (current) {
          setState({ key, asset })
          expiryTimer = setTimeout(
            () => {
              cache.current.delete(key)
              setState({ key, error: '预览已过期，请重新生成' })
            },
            Math.max(0, Date.parse(asset.expiresAt) - Date.now()),
          )
        }
      })
      .catch((error) => {
        cache.current.delete(key)
        if (current)
          setState({
            key,
            error: error instanceof Error ? error.message : '预览失败，请重试',
          })
      })
    return () => {
      current = false
      clearTimeout(expiryTimer)
    }
  }, [enabled, key, format, attempt])
  const retry = () => {
    cache.current.delete(key)
    setState({ key: '' })
    setAttempt((value) => value + 1)
  }
  return {
    progress: enabled && progress.key === key ? progress.stage : 'preparing' as const,
    asset: enabled && state.key === key ? state.asset : undefined,
    error: enabled && state.key === key ? state.error : undefined,
    retry,
  }
}
