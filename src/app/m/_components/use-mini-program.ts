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
  const [inMini, setInMini] = useState<boolean>(false)
  useEffect((): void => {
    const isEnv = (window as unknown as { __wxjs_environment?: string }).__wxjs_environment === 'miniprogram'
    console.log('[useInMiniProgram] environment check:', isEnv, 'wx.miniProgram:', !!getMiniProgram())
    setInMini(isEnv)
  }, [])
  return inMini
}

