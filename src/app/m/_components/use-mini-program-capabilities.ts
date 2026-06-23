'use client'

import { useEffect, useMemo, useState } from 'react'
import { isVersionAtLeast } from '@/lib/is-version-at-least'
import { miniProgramRuntime } from './mini-program-runtime'

interface MiniProgramCapabilities {
  readonly miniVersion: string
  readonly markdownExportSupported: boolean
}

const MINI_MARKDOWN_EXPORT_MIN_VERSION = '2.0.0'

export function useMiniProgramCapabilities(): MiniProgramCapabilities {
  const [miniVersion] = useState<string>(() => miniProgramRuntime.readMiniVersion())

  useEffect((): void => {
    miniProgramRuntime.rememberCurrentUrl()
  }, [])

  return useMemo((): MiniProgramCapabilities => ({
    miniVersion,
    markdownExportSupported: isVersionAtLeast(miniVersion, MINI_MARKDOWN_EXPORT_MIN_VERSION),
  }), [miniVersion])
}
