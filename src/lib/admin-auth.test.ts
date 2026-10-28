import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { clearStoredAdminPassword, getStoredAdminPassword, setStoredAdminPassword } from './admin-auth'

function createMemoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null
    },
    removeItem(key: string) {
      store.delete(key)
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
  }
}

beforeEach(() => {
  vi.stubGlobal('window', {
    localStorage: createMemoryStorage(),
    sessionStorage: createMemoryStorage(),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

it('keeps the password in localStorage after login', () => {
  setStoredAdminPassword('once')
  expect(window.localStorage.getItem('admin_password')).toBe('once')
  expect(window.sessionStorage.getItem('admin_password')).toBeNull()
  expect(getStoredAdminPassword()).toBe('once')
})

it('moves a previous sessionStorage password into localStorage', () => {
  window.sessionStorage.setItem('admin_password', 'legacy')
  expect(getStoredAdminPassword()).toBe('legacy')
  expect(window.localStorage.getItem('admin_password')).toBe('legacy')
  expect(window.sessionStorage.getItem('admin_password')).toBeNull()
})

it('clears both storages on logout', () => {
  window.localStorage.setItem('admin_password', 'keep')
  window.sessionStorage.setItem('admin_password', 'keep')
  clearStoredAdminPassword()
  expect(getStoredAdminPassword()).toBe('')
  expect(window.localStorage.getItem('admin_password')).toBeNull()
  expect(window.sessionStorage.getItem('admin_password')).toBeNull()
})
