'use client'

import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { isVersionAtLeast } from '@/lib/is-version-at-least'
import { miniProgramRuntime } from './mini-program-runtime'

interface MiniProgramCapabilities {
  readonly miniVersion: string
  readonly markdownExportSupported: boolean
  readonly docxExportSupported: boolean
}

const MINI_MARKDOWN_EXPORT_MIN_VERSION = '2.0.0'

function subscribe(listener: () => void): () => void {
  window.addEventListener('popstate', listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener('popstate', listener)
    window.removeEventListener('storage', listener)
  }
}

// Primitive snapshots remain stable until URL/session capabilities change.
const readSnapshot = () => `${miniProgramRuntime.readMiniVersion()}|${miniProgramRuntime.supportsDocxExport() ? '1' : '0'}`
const serverSnapshot = () => '|0'

export function useMiniProgramCapabilities(): MiniProgramCapabilities {
  const snapshot = useSyncExternalStore(subscribe, readSnapshot, serverSnapshot)
  useEffect(() => { miniProgramRuntime.rememberCurrentUrl() }, [])
  return useMemo(() => {
    const [miniVersion, docx] = snapshot.split('|')
    return {
      miniVersion,
      docxExportSupported: docx === '1',
      markdownExportSupported: isVersionAtLeast(miniVersion, MINI_MARKDOWN_EXPORT_MIN_VERSION),
    }
  }, [snapshot])
}
