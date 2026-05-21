'use client'

import { useMemo } from 'react'

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
  return useMemo((): boolean => {
    if (typeof window === 'undefined') return false
    const isEnv = (window as unknown as { __wxjs_environment?: string }).__wxjs_environment === 'miniprogram'
    console.log('[useInMiniProgram] environment check:', isEnv, 'wx.miniProgram:', !!getMiniProgram())
    return isEnv
  }, [])
}

