'use client'

const ADMIN_PASSWORD_KEY = 'admin_password'

export function getStoredAdminPassword(): string {
  if (typeof window === 'undefined') return ''
  return window.sessionStorage.getItem(ADMIN_PASSWORD_KEY) || ''
}

export function setStoredAdminPassword(password: string): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(ADMIN_PASSWORD_KEY, password)
}

export function clearStoredAdminPassword(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(ADMIN_PASSWORD_KEY)
}
