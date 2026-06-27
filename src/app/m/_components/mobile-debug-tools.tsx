'use client'

import { useEffect, useState, type ReactElement } from 'react'

type VConsoleInstance = {
  show(): void
  hide?(): void
  showSwitch(): void
  hideSwitch?(): void
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
  const debugParam: string | null = readDebugParamFromUrl()
  if (debugParam === '0') {
    writeDebugFlag('0')
    return false
  }
  if (debugParam === '1') {
    writeDebugFlag('1')
  }
  const stored: string | null = readDebugFlag()
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
      const w: VConsoleWindow = window as VConsoleWindow
      hideVConsole(w.vConsole)
      setStatus('inactive')
      return
    }
    const w: VConsoleWindow = window as VConsoleWindow
    if (w.vConsole) {
      revealVConsole(w.vConsole)
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
            revealVConsole(instance)
          },
        })
        w.vConsole = instance
        revealVConsole(instance)
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

  if (status === 'ready') {
    return (
      <button
        type="button"
        aria-label="打开 H5 日志面板"
        onClick={(): void => {
          const w: VConsoleWindow = window as VConsoleWindow
          if (w.vConsole) revealVConsole(w.vConsole)
        }}
        style={{
          position: 'fixed',
          left: 12,
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
          zIndex: 2147483647,
          minWidth: 46,
          height: 34,
          border: 0,
          borderRadius: 17,
          background: '#111827',
          color: '#ffffff',
          fontSize: 13,
          fontWeight: 600,
          boxShadow: '0 8px 20px rgba(15,23,42,0.22)',
        }}
      >
        日志
      </button>
    )
  }

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

function revealVConsole(instance: VConsoleInstance): void {
  const open = (): void => {
    try {
      instance.showSwitch()
    } catch {
      // vConsole may not have finished mounting its internal component yet.
    }
    try {
      instance.setSwitchPosition(12, Math.max(72, window.innerHeight - 140))
    } catch {
      // The retry below will run again after vConsole is ready.
    }
    try {
      instance.show()
    } catch {
      // Keep the fallback "日志" button available even if vConsole ignores this call.
    }
  }

  open()
  window.setTimeout(open, 120)
  window.setTimeout(open, 500)
  window.setTimeout(open, 1000)
}

function hideVConsole(instance: VConsoleInstance | undefined): void {
  if (!instance) return
  try {
    instance.hide?.()
  } catch {
    // Ignore vConsole teardown timing issues.
  }
  try {
    instance.hideSwitch?.()
  } catch {
    // Ignore vConsole teardown timing issues.
  }
}

function readDebugParamFromUrl(): string | null {
  const params: URLSearchParams = new URLSearchParams(window.location.search)
  const directValue: string | null = params.get('debug')
  if (directValue !== null) return directValue

  const redirectPath: string | null = params.get('r')
  if (!redirectPath) return null
  try {
    return new URL(redirectPath, window.location.origin).searchParams.get('debug')
  } catch {
    return new URLSearchParams(redirectPath.split('?')[1] || '').get('debug')
  }
}

function readDebugFlag(): string | null {
  try {
    return window.localStorage.getItem('mobile_debug')
  } catch {
    return null
  }
}

function writeDebugFlag(value: string): void {
  try {
    window.localStorage.setItem('mobile_debug', value)
  } catch {
    // localStorage can be unavailable in some embedded webviews.
  }
}
