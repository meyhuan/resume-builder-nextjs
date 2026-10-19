import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

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
})
