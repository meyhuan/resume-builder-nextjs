'use client'

import { useEffect, useState, type ReactElement } from 'react'

type VConsoleInstance = {
  show(): void
  showSwitch(): void
  setSwitchPosition(x: number, y: number): void
}

interface VConsoleWindow extends Window {
  vConsole?: VConsoleInstance
}

type DebugStatus = 'inactive' | 'loading' | 'ready' | 'failed'

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
  const [status, setStatus] = useState<DebugStatus>('inactive')

  useEffect((): (() => void) | void => {
    if (!shouldActivate()) {
      setStatus('inactive')
      return
    }
    const w: VConsoleWindow = window as VConsoleWindow
    if (w.vConsole) {
      openVConsole(w.vConsole)
      setStatus('ready')
      return
    }

    let cancelled = false
    setStatus('loading')

    import('vconsole')
      .then(({ default: VConsole }) => {
        if (cancelled) return
        const instance: VConsoleInstance = new VConsole({
          theme: 'light',
          onReady: (): void => {
            console.info('[mobile-debug] vConsole ready')
          },
        })
        w.vConsole = instance
        openVConsole(instance)
        setStatus('ready')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setStatus('failed')
        console.error('[mobile-debug] failed to load bundled vConsole:', error)
      })

    return (): void => {
      cancelled = true
    }
  }, [])

  if (status !== 'loading' && status !== 'failed') return null

  return (
    <div
      style={{
        position: 'fixed',
        right: 12,
        bottom: 12,
        zIndex: 2147483647,
        maxWidth: 260,
        borderRadius: 8,
        background: status === 'failed' ? '#fee2e2' : 'rgba(15,23,42,0.88)',
        color: status === 'failed' ? '#991b1b' : '#ffffff',
        fontSize: 12,
        lineHeight: 1.5,
        padding: '8px 10px',
        boxShadow: '0 10px 24px rgba(15,23,42,0.18)',
      }}
    >
      {status === 'failed' ? 'H5 调试面板加载失败，请查看控制台错误。' : 'H5 调试面板加载中...'}
    </div>
  )
}

function openVConsole(instance: VConsoleInstance): void {
  instance.showSwitch()
  instance.setSwitchPosition(12, Math.max(12, window.innerHeight - 128))
  instance.show()
}
