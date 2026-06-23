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
 * /m is mini-program-first: only an explicit standalone/web URL hint opts out.
 */
export function useInMiniProgram(initialHint = true): boolean {
  const [inMiniProgram, setInMiniProgram] = useState<boolean>(() => (
    miniProgramRuntime.hasStandaloneHint() ? false : initialHint || miniProgramRuntime.hasMiniProgramHint()
  ))

  useEffect((): (() => void) | void => {
    if (typeof window === 'undefined') return

    const check = (): void => {
      miniProgramRuntime.rememberCurrentUrl()
      if (miniProgramRuntime.hasStandaloneHint()) {
        setInMiniProgram(false)
        return
      }
      const isEnv = (window as unknown as { __wxjs_environment?: string }).__wxjs_environment === 'miniprogram'
      const hasMiniProgram = Boolean(getMiniProgram())
      miniProgramRuntime.rememberMiniProgram()
      console.log('[useInMiniProgram] environment check:', true, 'wx.miniProgram:', hasMiniProgram, 'isEnv:', isEnv)
      setInMiniProgram(true)
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

