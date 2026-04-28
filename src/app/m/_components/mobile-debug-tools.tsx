'use client'

import { useEffect, type ReactElement } from 'react'

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
 *   - Always on unless NEXT_PUBLIC_DISABLE_VCONSOLE=true is set.
 *   - In production the panel can be hidden by setting that env var,
 *     or dismissed by running `localStorage.setItem('mobile_debug','0')`.
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
  return true
}

/**
 * Mounts vConsole on mobile pages so that `console.log`, network requests
 * and runtime errors can be inspected directly on real devices (especially
 * inside the WeChat mini-program web-view where no native devtools exist).
 */
export default function MobileDebugTools(): ReactElement | null {
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
    document.head.appendChild(script)
  }, [])

  return null
}
