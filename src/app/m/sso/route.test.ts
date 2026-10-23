import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { runInNewContext } from 'node:vm'

const mocks = vi.hoisted(() => ({ sync: vi.fn(), fetch: vi.fn(), parse: vi.fn(), set: vi.fn() }))
vi.mock('@/lib/sync-user-identity', () => ({ syncUserIdentity: mocks.sync }))
vi.mock('@/lib/api/fetch-with-log', () => ({ fetchJavaWithLog: mocks.fetch, parseJsonWithLog: mocks.parse }))
vi.mock('next/headers', () => ({ cookies: async () => ({ set: mocks.set }) }))

import { GET, POST } from './route'

function exchange(target = '/m/resumes') {
  return POST(new NextRequest('https://aijianli.cn/m/sso', {
    method: 'POST',
    body: new URLSearchParams({ token: 'test', r: target }),
  }))
}

describe('SSO account identity', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.fetch.mockResolvedValue({ ok: true })
    mocks.parse.mockResolvedValue({ status: 100, data: { uid: 319850, openid: 'openid' } })
    mocks.sync.mockResolvedValue({ id: 'canonical', wxId: 'unionid' })
  })

  it('sets the resolved account identity and passes both verified identifiers', async () => {
    const response = await exchange()
    expect(response.status).toBe(303)
    expect(mocks.sync).toHaveBeenCalledWith({ wxId: 'openid', javaUserId: '319850' })
    expect(mocks.set).toHaveBeenCalledWith('auth_uid', 'unionid', expect.any(Object))
    expect(response.headers.get('location')).toBe('https://aijianli.cn/m/resumes')
  })

  it('shares a concurrent token exchange but does not allow later token replay', async () => {
    let release!: (value: { ok: boolean }) => void
    mocks.fetch.mockImplementationOnce(() => new Promise(resolve => { release = resolve }))
    const first = exchange('/m/edit')
    await vi.waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1))
    const second = exchange('/m/tools/jd-match')
    // Allow both request bodies to be read while verification is pending.
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(mocks.fetch).toHaveBeenCalledTimes(1)
    release({ ok: true })
    const responses = await Promise.all([first, second])
    expect(responses.map(response => response.status)).toEqual([303, 303])
    expect(responses[0].headers.get('location')).toBe('https://aijianli.cn/m/edit')
    expect(responses[1].headers.get('location')).toBe('https://aijianli.cn/m/tools/jd-match')
    expect(mocks.sync).toHaveBeenCalledTimes(1)
    mocks.parse.mockResolvedValue({ status: 401 })
    mocks.set.mockClear()
    expect((await exchange()).status).toBe(401)
    expect(mocks.fetch).toHaveBeenCalledTimes(2)
    expect(mocks.set).not.toHaveBeenCalled()
  })

  it('clears a failed in-flight exchange and never sets cookies on either response', async () => {
    let reject!: (reason: Error) => void
    mocks.fetch.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail }))
    const first = exchange()
    await vi.waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1))
    const second = exchange()
    await new Promise(resolve => setTimeout(resolve, 20))
    reject(new Error('upstream unavailable'))
    expect((await Promise.all([first, second])).map(response => response.status)).toEqual([401, 401])
    expect(mocks.fetch).toHaveBeenCalledTimes(1)
    expect(mocks.set).not.toHaveBeenCalled()
    expect((await exchange()).status).toBe(303)
    expect(mocks.fetch).toHaveBeenCalledTimes(2)
  })

  it('does not issue a cookie when database synchronization fails', async () => {
    mocks.sync.mockRejectedValue(new Error('sync failed'))
    const response = await exchange()
    expect(response.status).toBe(401)
    expect(mocks.set).not.toHaveBeenCalled()
  })

  it('does not resolve accounts for an invalid token', async () => {
    mocks.parse.mockResolvedValue({ status: 401 })
    const response = await exchange()
    expect(response.status).toBe(401)
    expect(mocks.sync).not.toHaveBeenCalled()
    expect(mocks.set).not.toHaveBeenCalled()
  })

  it('reports database unavailability without misclassifying it as an invalid login', async () => {
    mocks.sync.mockRejectedValue(Object.assign(new Error('database unavailable'), { code: 'P1001' }))
    const response = await POST(new NextRequest('http://localhost:3001/m/sso', {
      method: 'POST', headers: { accept: 'application/json' },
      body: new URLSearchParams({ token: 'test', r: '/m/tools/jd-match' }),
    }))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: '服务暂时连接不稳定，请稍后返回小程序重新进入。' })
    expect(mocks.set).not.toHaveBeenCalled()
  })

  it('does not consume tokens during repeated DevTools GET probes', async () => {
    for (let i = 0; i < 2; i++) {
      const response = await GET(new NextRequest('http://localhost:3001/m/sso?token=test&r=/m/tools/jd-match'))
      expect(response.status).toBe(200)
      expect(response.headers.get('cache-control')).toBe('no-store')
      expect(await response.text()).toContain('method="post"')
    }
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(mocks.set).not.toHaveBeenCalled()
    await exchange()
    expect(mocks.fetch).toHaveBeenCalledTimes(1)
  })

  it('keeps the local origin and redirects POST to GET', async () => {
    const response = await POST(new NextRequest('http://localhost:3001/m/sso', {
      method: 'POST', headers: { host: 'localhost:3001' },
      body: new URLSearchParams({ token: 'test', r: '/m/tools/translate' }),
    }))
    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('http://localhost:3001/m/tools/translate')
  })

  it('shows a quiet loading state without delaying or consuming the token', async () => {
    const response = await GET(new NextRequest('http://localhost:3001/m/sso?token=test&r=/m/edit'))
    const html = await response.text()
    expect(html).toContain('role="status"')
    expect(html).toContain('prefers-reduced-motion')
    expect(html).toContain('window.location.replace(result.redirect)')
    expect(html).not.toContain('document.forms[0].submit()')
    expect(html).not.toContain('setTimeout')
    expect(html).not.toContain('正在安全登录')
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it('exchanges in the background and replaces the SSO history entry', async () => {
    const response = await GET(new NextRequest('http://localhost:3001/m/sso?token=test&r=/m/edit'))
    const html = await response.text()
    const script = html.match(/<script>([\s\S]*?)<\/script>/)![1]
    const replace = vi.fn()
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ redirect: '/m/edit' }) })
    const listeners: Record<string, () => Promise<void>> = {}
    const doc = { forms: [{}], visibilityState: 'hidden', addEventListener: (name: string, fn: () => Promise<void>) => { listeners[name] = fn } }
    runInNewContext(script, {
      history: { replaceState: vi.fn() },
      window: { location: { replace }, addEventListener: (name: string, fn: () => Promise<void>) => { listeners[name] = fn } },
      document: doc,
      FormData: class {},
      fetch,
    })
    await listeners.pageshow()
    expect(fetch).not.toHaveBeenCalled()
    doc.visibilityState = 'visible'
    await listeners.visibilitychange()
    await listeners.pageshow()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith('/m/sso', expect.objectContaining({
      method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json' },
    }))
    expect(replace).toHaveBeenCalledWith('/m/edit')
  })

  it('returns the target as JSON after authentication without a navigation redirect', async () => {
    const response = await POST(new NextRequest('http://localhost:3001/m/sso', {
      method: 'POST', headers: { accept: 'application/json' },
      body: new URLSearchParams({ token: 'test', r: '/m/edit?id=resume' }),
    }))
    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
    expect(await response.json()).toEqual({ redirect: '/m/edit?id=resume' })
    expect(mocks.set).toHaveBeenCalledWith('auth_uid', 'unionid', expect.any(Object))
  })

  it('returns a generic JSON failure without cookies for a failed exchange', async () => {
    mocks.sync.mockRejectedValue(new Error('private backend detail'))
    const response = await POST(new NextRequest('http://localhost:3001/m/sso', {
      method: 'POST', headers: { accept: 'application/json' },
      body: new URLSearchParams({ token: 'test' }),
    }))
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: '暂时无法完成登录，请返回小程序后重新进入。' })
    expect(mocks.set).not.toHaveBeenCalled()
  })

  it('offers a fresh entry on failure without exposing backend errors or replaying the POST', async () => {
    mocks.sync.mockRejectedValue(new Error('internal database connection details'))
    const response = await exchange()
    const html = await response.text()
    expect(html).toContain('返回小程序重试')
    expect(html).not.toContain('internal database connection details')
    expect(html).not.toContain('window.history.back')
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
})
