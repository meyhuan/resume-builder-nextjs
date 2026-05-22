'use client'

import { useEffect, useState } from 'react'

interface WxMiniProgram {
  postMessage?: (p: { data: unknown }) => void
  navigateTo?: (o: { url: string }) => void
  navigateBack?: (o?: { delta?: number }) => void
}

function getMiniProgram(): WxMiniProgram | null {
  if (typeof window === 'undefined') return null
  const wx = (window as unknown as { wx?: { miniProgram?: WxMiniProgram } }).wx
  return wx?.miniProgram ?? null
}

/**
 * Returns true when running inside a WeChat mini-program web-view.
 * Always returns false during SSR to avoid hydration mismatch.
 */
export function useInMiniProgram(): boolean {
  const [inMiniProgram, setInMiniProgram] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const params = new URLSearchParams(window.location.search)
    return params.get('source') === 'mini' || params.get('mini') === '1'
  })

  useEffect((): (() => void) | void => {
    if (typeof window === 'undefined') return

    const check = (): void => {
      const isEnv = (window as unknown as { __wxjs_environment?: string }).__wxjs_environment === 'miniprogram'
      const hasMiniProgram = Boolean(getMiniProgram())
      const next = isEnv || hasMiniProgram
      console.log('[useInMiniProgram] environment check:', next, 'wx.miniProgram:', hasMiniProgram)
      setInMiniProgram(next)
    }

    check()
    window.addEventListener('WeixinJSBridgeReady', check)
    const timer = window.setTimeout(check, 300)

    return (): void => {
      window.removeEventListener('WeixinJSBridgeReady', check)
      window.clearTimeout(timer)
    }
  }, [])

  return inMiniProgram
}

