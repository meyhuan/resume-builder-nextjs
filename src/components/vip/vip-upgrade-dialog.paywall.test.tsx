import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import VipUpgradeDialog from '@/components/vip/vip-upgrade-dialog'
import { clearVipPaywallCache, loadVipPaywallInfo } from '@/lib/vip/vip-paywall-info'

const state = vi.hoisted(() => ({
  upgradeContext: 'generic' as const,
  quota: { pdfExport: { isVip: false, remaining: 0 } },
  refreshQuota: vi.fn(),
  updateVipStatus: vi.fn(),
}))

vi.mock('@/store/use-vip-store', () => ({
  useVipStore: (selector: (s: typeof state) => unknown) => selector(state),
}))
vi.mock('@/store/use-auth-store', () => ({
  useAuthStore: () => ({ updateVipStatus: state.updateVipStatus, token: 'mock-token' }),
}))
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }))

const plans = [
  { id: 2, vipType: 2, vipName: '年卡', price: 68, duration: 365, sort: 2 },
  { id: 1, vipType: 1, vipName: '月卡', price: 19.9, duration: 30, sort: 1 },
  { id: 3, vipType: 3, vipName: '终身会员', price: 99, duration: 36500, sort: 3 },
]

function mockVipInfoFetch() {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      data: {
        userId: 1001,
        isVip: false,
        vipStatus: 0,
        vipType: 0,
        vipExpireTime: null,
        plans,
      },
    }),
  })
}

afterEach(() => {
  cleanup()
  clearVipPaywallCache()
  vi.unstubAllGlobals()
})

it('opens instantly from warmed cache without showing the loading label', async () => {
  const fetchImpl = mockVipInfoFetch()
  vi.stubGlobal('fetch', fetchImpl)
  await loadVipPaywallInfo({ fetchImpl })

  render(<VipUpgradeDialog open onOpenChange={vi.fn()} />)

  expect(screen.queryByText('正在加载...')).toBeNull()
  expect(await screen.findByText('年卡')).toBeDefined()
  expect(screen.getByText('会员专属特权对比')).toBeDefined()
})

it('keeps a stable body min-height while the first fetch is in flight', async () => {
  let resolveFetch: ((value: { ok: boolean; json: () => Promise<unknown> }) => void) | null = null
  vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise((resolve) => {
    resolveFetch = resolve
  })))

  render(<VipUpgradeDialog open onOpenChange={vi.fn()} />)
  const loadingLabel = screen.getByText('正在加载...')
  expect(loadingLabel.parentElement?.className).toContain('min-h-[530px]')

  const triggerResolve = resolveFetch as ((value: { ok: boolean; json: () => Promise<unknown> }) => void) | null
  triggerResolve?.({
    ok: true,
    json: async () => ({
      data: {
        userId: 1001,
        isVip: false,
        vipStatus: 0,
        vipType: 0,
        vipExpireTime: null,
        plans,
      },
    }),
  })

  await waitFor(() => {
    expect(screen.getByText('年卡')).toBeDefined()
  })
  expect(document.body.innerHTML.includes('min-h-[530px]')).toBe(true)
})
