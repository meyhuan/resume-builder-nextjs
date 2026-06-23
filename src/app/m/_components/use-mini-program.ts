'use client'

import { useEffect, useState } from 'react'
import { miniProgramRuntime } from './mini-program-runtime'

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
  const [inMiniProgram, setInMiniProgram] = useState<boolean>(() => miniProgramRuntime.hasMiniProgramHint())

  useEffect((): (() => void) | void => {
    if (typeof window === 'undefined') return

    const check = (): void => {
      miniProgramRuntime.rememberCurrentUrl()
      const isEnv = (window as unknown as { __wxjs_environment?: string }).__wxjs_environment === 'miniprogram'
      const hasMiniProgram = Boolean(getMiniProgram())
      const next = miniProgramRuntime.hasMiniProgramHint() || isEnv || hasMiniProgram
      if (next) miniProgramRuntime.rememberMiniProgram()
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

