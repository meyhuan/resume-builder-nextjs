import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ sync: vi.fn(), fetch: vi.fn(), parse: vi.fn(), set: vi.fn() }))
vi.mock('@/lib/sync-user-identity', () => ({ syncUserIdentity: mocks.sync }))
vi.mock('@/lib/api/fetch-with-log', () => ({ fetchJavaWithLog: mocks.fetch, parseJsonWithLog: mocks.parse }))
vi.mock('next/headers', () => ({ cookies: async () => ({ set: mocks.set }) }))

import { GET } from './route'

describe('SSO account identity', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.fetch.mockResolvedValue({ ok: true })
    mocks.parse.mockResolvedValue({ status: 100, data: { uid: 319850, openid: 'openid' } })
    mocks.sync.mockResolvedValue({ id: 'canonical', wxId: 'unionid' })
  })

  it('sets the resolved account identity and passes both verified identifiers', async () => {
    const response = await GET(new NextRequest('https://aijianli.cn/m/sso?token=test&r=/m/resumes'))
    expect(response.status).toBe(302)
    expect(mocks.sync).toHaveBeenCalledWith({ wxId: 'openid', javaUserId: '319850' })
    expect(mocks.set).toHaveBeenCalledWith('auth_uid', 'unionid', expect.any(Object))
    expect(response.headers.get('location')).toBe('https://aijianli.cn/m/resumes')
  })

  it('does not issue a cookie when database synchronization fails', async () => {
    mocks.sync.mockRejectedValue(new Error('sync failed'))
    const response = await GET(new NextRequest('https://aijianli.cn/m/sso?token=test'))
    expect(response.status).toBe(401)
    expect(mocks.set).not.toHaveBeenCalled()
  })

  it('does not resolve accounts for an invalid token', async () => {
    mocks.parse.mockResolvedValue({ status: 401 })
    const response = await GET(new NextRequest('https://aijianli.cn/m/sso?token=test'))
    expect(response.status).toBe(401)
    expect(mocks.sync).not.toHaveBeenCalled()
    expect(mocks.set).not.toHaveBeenCalled()
  })
})
