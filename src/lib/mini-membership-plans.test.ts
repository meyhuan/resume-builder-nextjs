import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const monthly = { vipType: 1, price: 19.9, duration: 30, sort: 1 }
const lifetime = { vipType: 3, price: 69.9, duration: 30000, sort: 3 }
const response = (plans = [monthly, lifetime]) => ({ ok: true, json: async () => ({ data: { plans } }) })
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-09T01:00:00Z')) })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

it('shares prefetch with open and reuses only fresh mini-program prices', async () => {
  const fetcher = vi.fn().mockResolvedValue(response())
  vi.stubGlobal('fetch', fetcher)
  const { loadMiniMembershipPlans, cachedMiniMembershipPlans } = await import('./mini-membership-plans')
  const prefetch = loadMiniMembershipPlans()
  expect(loadMiniMembershipPlans()).toBe(prefetch)
  expect(await prefetch).toEqual([lifetime, monthly])
  await loadMiniMembershipPlans()
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(fetcher.mock.calls[0][0]).toBe('/next-api/vip/mini-plans')
  vi.advanceTimersByTime(4 * 60_000)
  await loadMiniMembershipPlans()
  expect(fetcher).toHaveBeenCalledTimes(1)
  vi.advanceTimersByTime(60_001)
  expect(cachedMiniMembershipPlans()).toBeNull()
  fetcher.mockResolvedValue(response([{ ...monthly, price: 22.9 }]))
  expect(await loadMiniMembershipPlans()).toEqual([{ ...monthly, price: 22.9 }])
  expect(fetcher).toHaveBeenCalledTimes(2)
})

it('does not reuse stale prices after a failed refresh and allows retry', async () => {
  const fetcher = vi.fn().mockResolvedValue(response())
  vi.stubGlobal('fetch', fetcher)
  const { loadMiniMembershipPlans, cachedMiniMembershipPlans } = await import('./mini-membership-plans')
  await loadMiniMembershipPlans()
  vi.advanceTimersByTime(5 * 60_000 + 1)
  fetcher.mockRejectedValueOnce(new Error('offline'))
  await expect(loadMiniMembershipPlans()).rejects.toThrow('offline')
  expect(cachedMiniMembershipPlans()).toBeNull()
  expect(await loadMiniMembershipPlans()).toEqual([lifetime, monthly])
})

it('rejects unavailable or malformed catalogue data rather than inventing prices', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([{ ...monthly, price: 0 }])))
  const { loadMiniMembershipPlans, cachedMiniMembershipPlans } = await import('./mini-membership-plans')
  await expect(loadMiniMembershipPlans()).rejects.toThrow('暂无可购买套餐')
  expect(cachedMiniMembershipPlans()).toBeNull()
})
