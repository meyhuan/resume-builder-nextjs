import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAutomationLoginMode, useLocalTestLogin } from './automation-login-mode'

// Exercise the snapshots without a browser or any real credentials.
vi.mock('react', () => ({
  useEffect: () => undefined,
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => boolean) => snapshot(),
}))

afterEach(() => vi.unstubAllGlobals())

function at(url: string, stored = false) {
  vi.stubGlobal('window', {
    location: new URL(url),
    sessionStorage: { getItem: () => stored ? '1' : null },
  })
}

describe('test login discovery', () => {
  it.each(['localhost', '127.0.0.1', '[::1]'])('discovers password login on %s without a query', host => {
    at(`http://${host}:3127/login`)
    expect(useAutomationLoginMode()).toBe(true)
    expect(useLocalTestLogin()).toBe(true)
  })
  it.each(['aijianli.cn', 'localhost.example.com', '192.168.1.2'])('does not enable password login or local instructions on %s by default', host => {
    at(`https://${host}/login`)
    expect(useAutomationLoginMode()).toBe(false)
    expect(useLocalTestLogin()).toBe(false)
  })
  it('preserves explicit production opt-in and existing tab sessions', () => {
    at('https://aijianli.cn/login?automation=1')
    expect(useAutomationLoginMode()).toBe(true)
    expect(useLocalTestLogin()).toBe(false)
    at('https://aijianli.cn/login', true)
    expect(useAutomationLoginMode()).toBe(true)
  })
  it('allows opting out while keeping local test login discoverable', () => {
    at('http://localhost:3127/login?automation=0', true)
    expect(useAutomationLoginMode()).toBe(false)
    expect(useLocalTestLogin()).toBe(true)
    at('https://aijianli.cn/login?automation=0', true)
    expect(useAutomationLoginMode()).toBe(false)
    expect(useLocalTestLogin()).toBe(false)
  })
})
