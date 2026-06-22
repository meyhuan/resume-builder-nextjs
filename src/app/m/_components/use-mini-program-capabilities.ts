'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { isVersionAtLeast } from '@/lib/is-version-at-least'

const MINI_VERSION_STORAGE_KEY = 'aijianli_mini_version'
const MINI_MARKDOWN_EXPORT_MIN_VERSION = '2.0.0'

interface MiniProgramCapabilities {
  readonly miniVersion: string
  readonly markdownExportSupported: boolean
}

function normalizeMiniVersion(value: string | null | undefined): string {
  return (value ?? '').trim()
}

function readStoredMiniVersion(): string {
  if (typeof window === 'undefined') return ''
  try {
    return normalizeMiniVersion(window.sessionStorage.getItem(MINI_VERSION_STORAGE_KEY))
  } catch {
    return ''
  }
}

function writeStoredMiniVersion(version: string): void {
  if (typeof window === 'undefined' || !version) return
  try {
    window.sessionStorage.setItem(MINI_VERSION_STORAGE_KEY, version)
  } catch {
    // ignore storage failures
  }
}

export function useMiniProgramCapabilities(): MiniProgramCapabilities {
  const searchParams = useSearchParams()
  const miniVersionParam = normalizeMiniVersion(searchParams.get('miniVersion') ?? searchParams.get('mpVersion'))
  const [storedMiniVersion] = useState<string>(() => readStoredMiniVersion())

  useEffect((): void => {
    if (miniVersionParam) {
      writeStoredMiniVersion(miniVersionParam)
    }
  }, [miniVersionParam])

  const miniVersion = miniVersionParam || storedMiniVersion

  return useMemo((): MiniProgramCapabilities => ({
    miniVersion,
    markdownExportSupported: isVersionAtLeast(miniVersion, MINI_MARKDOWN_EXPORT_MIN_VERSION),
  }), [miniVersion])
}
