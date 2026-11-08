'use client'

import { useEffect, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'automation_login_mode'
const subscribe = () => () => undefined

function isLocalTestOrigin(): boolean {
  return ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
}

/** UI discovery only; the server still validates its enable flag and credentials. */
export function useLocalTestLogin(): boolean {
  return useSyncExternalStore(subscribe, isLocalTestOrigin, () => false)
}

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
    subscribe,
    getAutomationModeSnapshot,
    () => false,
  )
}

function getAutomationModeSnapshot(): boolean {
  const requestedMode = new URL(window.location.href).searchParams.get('automation')
  if (requestedMode === '1') return true
  if (requestedMode === '0') return false
  return isLocalTestOrigin() || window.sessionStorage.getItem(STORAGE_KEY) === '1'
}
