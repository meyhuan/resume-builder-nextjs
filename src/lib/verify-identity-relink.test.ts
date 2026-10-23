import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }))
vi.mock('@/lib/api/fetch-with-log', () => ({ fetchJavaWithLog: mocks.fetch }))
import { verifyIdentityRelink } from './verify-identity-relink'

describe('Java relink proof', () => {
  beforeEach(() => { mocks.fetch.mockReset() })
  it('accepts only explicit success and disables caching', async () => {
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ status: 100, data: { allowed: true } }) })
    expect(await verifyIdentityRelink('unionid', '10', '20')).toBe(true)
    expect(mocks.fetch).toHaveBeenCalledWith('/user/identity-relink-check', expect.objectContaining({
      cache: 'no-store', body: JSON.stringify({ wxId: 'unionid', oldJavaUserId: '10', newJavaUserId: '20' }),
    }))
  })
  it.each([
    { status: 100, data: { allowed: false } },
    { status: 500, data: { allowed: true } },
    { status: 100, data: { allowed: 'true' } },
    {},
  ])('fails closed on invalid proof %j', async body => {
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => body })
    expect(await verifyIdentityRelink('unionid', '10', '20')).toBe(false)
  })
  it('fails closed for an undeployed endpoint', async () => {
    mocks.fetch.mockResolvedValue({ ok: false })
    expect(await verifyIdentityRelink('unionid', '10', '20')).toBe(false)
  })
  it('fails closed on timeout', async () => {
    mocks.fetch.mockRejectedValue(new Error('timeout'))
    expect(await verifyIdentityRelink('unionid', '10', '20')).toBe(false)
  })
})
