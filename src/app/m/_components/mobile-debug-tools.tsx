'use client'

import { useEffect, useState, type ReactElement } from 'react'

interface VConsoleWindow extends Window {
  readonly vConsole?: unknown
  readonly VConsole?: new () => unknown
}

// jsdelivr is reliably accessible in mainland China; unpkg as fallback.
const VCONSOLE_SRC: string =
  'https://cdn.jsdelivr.net/npm/vconsole@latest/dist/vconsole.min.js'

/**
 * Decides whether the debug panel should be active.
 *
 *   - Off by default so it never covers production-like mobile previews.
 *   - Query param `?debug=0` forces it off; `?debug=1` forces it on.
 */
function shouldActivate(): boolean {
  if (typeof window === 'undefined') return false
  if (process.env.NEXT_PUBLIC_DISABLE_VCONSOLE === 'true') return false
  const params: URLSearchParams = new URLSearchParams(window.location.search)
  const debugParam: string | null = params.get('debug')
  if (debugParam === '0') {
    window.localStorage.setItem('mobile_debug', '0')
    return false
  }
  if (debugParam === '1') {
    window.localStorage.setItem('mobile_debug', '1')
  }
  const stored: string | null = window.localStorage.getItem('mobile_debug')
  if (stored === '0') return false
  return stored === '1'
}

/**
 * Mounts vConsole on mobile pages so that `console.log`, network requests
 * and runtime errors can be inspected directly on real devices (especially
 * inside the WeChat mini-program web-view where no native devtools exist).
 */
export default function MobileDebugTools(): ReactElement | null {
  const [loadFailed, setLoadFailed] = useState<boolean>(false)

  useEffect((): (() => void) | void => {
    if (!shouldActivate()) return
    const w: VConsoleWindow = window as VConsoleWindow
    if (w.vConsole) return
    const existing: HTMLScriptElement | null =
      document.querySelector(`script[src="${VCONSOLE_SRC}"]`)
    if (existing) return
    const script: HTMLScriptElement = document.createElement('script')
    script.src = VCONSOLE_SRC
    script.async = true
    script.onload = (): void => {
      const updated: VConsoleWindow = window as VConsoleWindow
      if (!updated.vConsole && updated.VConsole) {
        Object.assign(updated, { vConsole: new updated.VConsole() })
      }
    }
    script.onerror = (): void => {
      setLoadFailed(true)
      console.error('[mobile-debug] failed to load vConsole script:', VCONSOLE_SRC)
    }
    document.head.appendChild(script)
  }, [])

  if (!loadFailed) return null

  return (
    <div
      style={{
        position: 'fixed',
        right: 12,
        bottom: 12,
        zIndex: 2147483647,
        maxWidth: 260,
        borderRadius: 8,
        background: '#fee2e2',
        color: '#991b1b',
        fontSize: 12,
        lineHeight: 1.5,
        padding: '8px 10px',
        boxShadow: '0 10px 24px rgba(15,23,42,0.18)',
      }}
    >
      H5 调试面板加载失败，请检查 webview 是否能访问 jsdelivr。
    </div>
  )
}
