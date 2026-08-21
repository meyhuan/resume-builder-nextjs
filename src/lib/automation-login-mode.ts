'use client'

import { useEffect, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'automation_login_mode'

/**
 * Enables the automation-only login UI for the current browser tab.
 * A query parameter is used only to opt in; it is not a security boundary.
 */
export function useAutomationLoginMode(): boolean {
  useEffect(() => {
    const url = new URL(window.location.href)
    const requestedMode = url.searchParams.get('automation')

    if (requestedMode === '1') {
      window.sessionStorage.setItem(STORAGE_KEY, '1')
      return
    }

    if (requestedMode === '0') {
      window.sessionStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  return useSyncExternalStore(
    () => () => undefined,
    getAutomationModeSnapshot,
    () => false,
  )
}

function getAutomationModeSnapshot(): boolean {
  const requestedMode = new URL(window.location.href).searchParams.get('automation')
  if (requestedMode === '1') return true
  if (requestedMode === '0') return false
  return window.sessionStorage.getItem(STORAGE_KEY) === '1'
}
