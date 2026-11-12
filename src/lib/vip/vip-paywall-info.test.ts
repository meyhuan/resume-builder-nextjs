import { afterEach, expect, it, vi } from 'vitest'
import {
  clearVipPaywallCache,
  getCachedVipPaywall,
  isPaywallFresh,
  isPaywallStale,
  loadVipPaywallInfo,
  VIP_PAYWALL_STORAGE_KEY,
} from '@/lib/vip/vip-paywall-info'

afterEach(() => {
  clearVipPaywallCache()
})

it('caches vip paywall info and reuses it within the TTL', async () => {
  const fetchImpl = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      data: {
        userId: 42,
        isVip: false,
        vipStatus: 0,
        vipType: 0,
        vipExpireTime: null,
        plans: [
          { id: 2, vipType: 2, vipName: '年卡', price: 68, duration: 365, sort: 2 },
          { id: 1, vipType: 1, vipName: '月卡', price: 19.9, duration: 30, sort: 1 },
        ],
      },
    }),
  })

  const first = await loadVipPaywallInfo({ fetchImpl })
  expect(first.userId).toBe(42)
  expect(first.plans.map((plan) => plan.vipType)).toEqual([2, 1])
  expect(getCachedVipPaywall()?.userId).toBe(42)

  const second = await loadVipPaywallInfo({ fetchImpl })
  expect(second).toBe(first)
  expect(fetchImpl).toHaveBeenCalledTimes(1)
})

it('dedupes concurrent fetches and refetches when forced', async () => {
  const fetchImpl = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      data: {
        userId: 7,
        isVip: false,
        vipStatus: 0,
        vipType: 0,
        vipExpireTime: null,
        plans: [{ id: 3, vipType: 3, vipName: '终身', price: 99, duration: 36500, sort: 3 }],
      },
    }),
  })

  const [a, b] = await Promise.all([
    loadVipPaywallInfo({ fetchImpl }),
    loadVipPaywallInfo({ fetchImpl }),
  ])
  expect(a.userId).toBe(7)
  expect(b.userId).toBe(7)
  expect(fetchImpl).toHaveBeenCalledTimes(1)

  await loadVipPaywallInfo({ force: true, fetchImpl })
  expect(fetchImpl).toHaveBeenCalledTimes(2)
})

it('persists snapshot to localStorage and recovers when memory cache is empty', async () => {
  const fetchImpl = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      data: {
        userId: 99,
        isVip: false,
        vipStatus: 0,
        vipType: 0,
        vipExpireTime: null,
        plans: [{ id: 1, vipType: 1, vipName: '月卡', price: 19.9, duration: 30, sort: 1 }],
      },
    }),
  })

  await loadVipPaywallInfo({ fetchImpl })
  const rawStorage = window.localStorage.getItem(VIP_PAYWALL_STORAGE_KEY)
  expect(rawStorage).toBeTruthy()
  expect(JSON.parse(rawStorage!).userId).toBe(99)

  // Clear memory cache only by calling clear then manually putting it in localStorage
  clearVipPaywallCache()
  window.localStorage.setItem(VIP_PAYWALL_STORAGE_KEY, rawStorage!)

  const recovered = getCachedVipPaywall()
  expect(recovered?.userId).toBe(99)
  expect(recovered?.plans[0].vipName).toBe('月卡')
})

it('identifies fresh vs stale snapshots correctly', () => {
  const now = 1700000000000
  const freshSnapshot = {
    userId: 1,
    plans: [{ id: 1, vipType: 1, vipName: '月卡', price: 19.9, duration: 30, sort: 1 }],
    isVip: false,
    vipStatus: 0,
    vipType: 0,
    vipExpireTime: null,
    fetchedAt: now - 60 * 1000, // 1 min ago
  }
  const staleSnapshot = {
    ...freshSnapshot,
    fetchedAt: now - 10 * 60 * 1000, // 10 mins ago
  }

  expect(isPaywallFresh(freshSnapshot, now)).toBe(true)
  expect(isPaywallStale(freshSnapshot, now)).toBe(false)

  expect(isPaywallFresh(staleSnapshot, now)).toBe(false)
  expect(isPaywallStale(staleSnapshot, now)).toBe(true)
})
