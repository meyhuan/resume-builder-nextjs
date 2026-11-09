import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useVipStore } from './use-vip-store'

const identity = vi.hoisted(() => ({ id: 'quota-test' }))
vi.mock('@/store/use-auth-store', () => ({ useAuthStore: { getState: () => ({ userInfo: { id: identity.id }, updateVipStatus: vi.fn() }) } }))
vi.mock('@/lib/analytics', () => ({ trackError: vi.fn() }))
beforeEach(() => { identity.id = 'quota-test'; localStorage.clear(); useVipStore.getState().reset(); vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); document.cookie = 'auth_uid=; Max-Age=0; path=/' })
it('returns a verified snapshot after success, but only displays cache after a later failure', async () => {
  const quota = { pdfExport: { isVip: false, allowed: false, remaining: 0, limit: 1 } }
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => quota })
  vi.stubGlobal('fetch', fetch)
  expect((await useVipStore.getState().refreshQuota('test'))?.pdfExport.remaining).toBe(0)
  fetch.mockResolvedValue({ ok: false, status: 503 })
  const pending = useVipStore.getState().refreshQuota('test')
  await vi.runAllTimersAsync()
  expect(await pending).toBeNull()
  expect(useVipStore.getState().quotaLoaded).toBe(true)
  expect(useVipStore.getState().quota.pdfExport.remaining).toBe(0)
})
it('rejects malformed quota rather than treating default zero as verified exhaustion', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ error: 'unavailable' }) }))
  const pending = useVipStore.getState().refreshQuota('test')
  await vi.runAllTimersAsync()
  expect(await pending).toBeNull()
  expect(useVipStore.getState().quotaLoaded).toBe(false)
})
it.each(['profile', 'cookie'])('does not share or apply an in-flight quota response across %s accounts', async kind => {
  if (kind === 'cookie') { identity.id = ''; document.cookie = 'auth_uid=old-sso-account; path=/' }
  let finishOld!: (response: unknown) => void
  const fresh = { pdfExport: { isVip: true, allowed: true, remaining: 'unlimited', limit: 1 } }
  const fetch = vi.fn()
    .mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve }))
    .mockResolvedValue({ ok: true, json: async () => fresh })
  vi.stubGlobal('fetch', fetch)
  const old = useVipStore.getState().refreshQuota('first')
  if (kind === 'cookie') document.cookie = 'auth_uid=new-sso-account; path=/'
  else identity.id = 'new-account'
  expect((await useVipStore.getState().refreshQuota('second'))?.pdfExport.isVip).toBe(true)
  finishOld({ ok: true, json: async () => ({ pdfExport: { isVip: false, allowed: false, remaining: 0, limit: 1 } }) })
  expect(await old).toBeNull()
  expect(useVipStore.getState().quota.pdfExport.isVip).toBe(true)
  expect(fetch).toHaveBeenCalledTimes(2)
})
