'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const QUERY_KEY = 'exportPreview'
const HISTORY_KEY = 'resumeExportPreviewFrom'

function relativeUrl(url: URL): string {
  return url.pathname + url.search + url.hash
}

/** One history entry for the whole preview, not one per export format. */
export function useExportPreviewNavigation() {
  const [open, setOpen] = useState(false)
  const returning = useRef(false)

  useEffect(() => {
    const pathname = window.location.pathname
    const sync = () => {
      returning.current = false
      const url = new URL(window.location.href)
      setOpen(url.pathname === pathname && url.searchParams.get(QUERY_KEY) === '1')
    }
    sync()
    window.addEventListener('popstate', sync)
    // Unmounting must not navigate again: the router may already be going back.
    return () => window.removeEventListener('popstate', sync)
  }, [])

  const openPreview = useCallback(() => {
    if (returning.current) return
    const url = new URL(window.location.href)
    if (url.searchParams.get(QUERY_KEY) !== '1') {
      const from = relativeUrl(url)
      url.searchParams.set(QUERY_KEY, '1')
      // Preserve Next's router state, resume/template parameters and URL hash.
      window.history.pushState({ ...window.history.state, [HISTORY_KEY]: from }, '', relativeUrl(url))
    }
    setOpen(true)
  }, [])

  const closePreview = useCallback(() => {
    if (returning.current) return
    const url = new URL(window.location.href)
    url.searchParams.delete(QUERY_KEY)
    const destination = relativeUrl(url)
    setOpen(false)
    if (window.history.state?.[HISTORY_KEY] === destination) {
      returning.current = true
      window.history.back()
    } else {
      // A directly opened preview has no underlying entry owned by this panel.
      const state = { ...window.history.state }
      delete state[HISTORY_KEY]
      window.history.replaceState(state, '', destination)
    }
  }, [])

  return { open, openPreview, closePreview }
}
