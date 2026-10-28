'use client'

const ADMIN_PASSWORD_KEY = 'admin_password'

function readStorage(storage: Storage): string {
  try {
    return storage.getItem(ADMIN_PASSWORD_KEY) || ''
  } catch {
    return ''
  }
}

function writeStorage(storage: Storage, value: string): void {
  try {
    storage.setItem(ADMIN_PASSWORD_KEY, value)
  } catch {
    // Private mode or quota errors should not break admin login.
  }
}

function removeStorage(storage: Storage): void {
  try {
    storage.removeItem(ADMIN_PASSWORD_KEY)
  } catch {
    // Ignore storage access errors on logout.
  }
}

export function getStoredAdminPassword(): string {
  if (typeof window === 'undefined') return ''
  const persisted = readStorage(window.localStorage)
  if (persisted) return persisted

  const sessionPassword = readStorage(window.sessionStorage)
  if (sessionPassword) {
    writeStorage(window.localStorage, sessionPassword)
    removeStorage(window.sessionStorage)
  }
  return sessionPassword
}

export function setStoredAdminPassword(password: string): void {
  if (typeof window === 'undefined') return
  writeStorage(window.localStorage, password)
  removeStorage(window.sessionStorage)
}

export function clearStoredAdminPassword(): void {
  if (typeof window === 'undefined') return
  removeStorage(window.localStorage)
  removeStorage(window.sessionStorage)
}
