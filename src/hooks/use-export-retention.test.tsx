import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useExportRetention } from './use-export-retention'
import { canShowRetention, claimRetention, recommendExportMembership, retentionDay } from '@/lib/export-retention'
import type { VipQuotaStatus } from '@/lib/quota/vip-types'

const state = vi.hoisted(() => ({ account: 'test-user', quota: { isVip: false, remaining: 0, allowed: false }, track: vi.fn() }))
vi.mock('@/store/use-auth-store', () => ({ useAuthStore: (selector: (s: unknown) => unknown) => selector({ userInfo: { id: state.account } }) }))
vi.mock('@/store/use-vip-store', () => ({ useVipStore: (selector: (s: unknown) => unknown) => selector({ quota: { pdfExport: state.quota } }) }))
vi.mock('@/lib/analytics', () => ({ track: state.track }))
const monthly = { vipType: 1, price: 19.9, duration: 30 }
const exhausted = () => ({ pdfExport: { isVip: false, remaining: 0, allowed: false } }) as VipQuotaStatus
function setup(refresh = vi.fn<() => Promise<VipQuotaStatus | null>>().mockResolvedValue(exhausted())) {
  const open = vi.fn()
  const hook = renderHook(() => useExportRetention({ platform: 'mini_program', refreshQuota: refresh, openMembership: open }))
  act(() => hook.result.current.setPreviewContext(true, true, 'pdf'))
  return { ...hook, refresh, open }
}
beforeEach(() => { localStorage.clear(); state.account = 'test-user'; state.quota = { isVip: false, remaining: 0, allowed: false }; state.track.mockClear() })
afterEach(() => { cleanup(); document.cookie = 'auth_uid=; Max-Age=0; path=/' })
describe('lifetime recommendation and local daily cap', () => {
  it('orders lifetime, annual, monthly regardless of API order and excludes unavailable products', () => {
    const lifetime = { vipType: 3, price: 69.9, duration: 30000 }
    const annual = { vipType: 2, price: 39.9, duration: 365 }
    expect(recommendExportMembership([monthly, annual, lifetime])).toEqual([lifetime, annual, monthly])
    expect(recommendExportMembership([lifetime, { ...monthly, enabled: false }, annual])).toEqual([lifetime, annual])
    expect(recommendExportMembership([monthly, { ...lifetime, enabled: false }, annual])).toEqual([annual, monthly])
    expect(recommendExportMembership([{ ...monthly, status: 0 }, { ...monthly, price: NaN }])).toEqual([])
  })
  it('caps by Beijing day, account and platform', () => {
    const before = Date.parse('2026-11-09T15:59:59Z'), after = before + 1000
    expect(retentionDay(before)).toBe('2026-11-09')
    expect(retentionDay(after)).toBe('2026-11-10')
    expect(claimRetention(localStorage, 'a', 'pc_web', before)).toBe(true)
    expect(claimRetention(localStorage, 'a', 'pc_web', before)).toBe(false)
    expect(claimRetention(localStorage, 'a', 'mini_program', before)).toBe(true)
    expect(claimRetention(localStorage, 'b', 'pc_web', before)).toBe(true)
    expect(claimRetention(localStorage, 'a', 'pc_web', after)).toBe(true)
  })
  it('fails closed for missing identity or unavailable storage', () => {
    expect(canShowRetention(localStorage, '', 'pc_web')).toBe(false)
    expect(claimRetention({ getItem: () => null, setItem: () => { throw new Error('blocked') } }, 'a', 'pc_web')).toBe(false)
  })
})
describe('retention transitions', () => {
  it('uses the live SSO identity instead of a stale PC profile and caps after remount', async () => {
    document.cookie = 'auth_uid=first-sso-account; path=/'
    const h = setup()
    await act(() => h.result.current.onClose('dismiss', monthly))
    expect(h.result.current.status).toBe('visible')
    h.unmount()
    const same = setup()
    await act(() => same.result.current.onClose('dismiss', monthly))
    expect(same.result.current.status).toBe('ended')
    document.cookie = 'auth_uid=second-sso-account; path=/'
    same.rerender()
    await act(() => same.result.current.onClose('dismiss', monthly))
    expect(same.result.current.status).toBe('visible')
  })
  it('does not show without either login identity', async () => {
    state.account = ''
    const h = setup()
    await act(() => h.result.current.onClose('dismiss', monthly))
    expect(h.refresh).not.toHaveBeenCalled()
    expect(h.result.current.status).not.toBe('visible')
  })
  it('ignores quota from an SSO account replaced during the request without a render', async () => {
    document.cookie = 'auth_uid=first-sso-account; path=/'
    let resolve!: (q: VipQuotaStatus) => void
    const h = setup(vi.fn(() => new Promise<VipQuotaStatus>(r => { resolve = r })))
    let pending!: Promise<void>
    act(() => { pending = h.result.current.onClose('dismiss', monthly) })
    document.cookie = 'auth_uid=second-sso-account; path=/'
    await act(async () => { resolve(exhausted()); await pending })
    expect(h.result.current.status).not.toBe('visible')
    expect(localStorage.length).toBe(0)
  })
  it('shows retention for cookie-only mini-program SSO without a PC auth profile', async () => {
    state.account = ''
    document.cookie = 'auth_uid=mini-sso-account; path=/'
    const h = setup()
    await act(() => h.result.current.onClose('dismiss', monthly))
    expect(h.refresh).toHaveBeenCalledTimes(1)
    expect(h.result.current.status).toBe('visible')
  })
  it('verifies fresh entitlement before showing and before opening monthly, without purchasing', async () => {
    const h = setup()
    await act(() => h.result.current.onClose('dismiss', monthly))
    expect(h.result.current.status).toBe('visible')
    expect(h.open).not.toHaveBeenCalled()
    await act(() => h.result.current.viewMonthly())
    expect(h.refresh).toHaveBeenCalledTimes(2)
    expect(h.open).toHaveBeenCalledTimes(1)
    expect(h.result.current.monthlyRequest).toBe(1)
    await act(() => h.result.current.onClose('dismiss', monthly))
    expect(h.result.current.status).toBe('ended')
  })
  it.each(['payment_return', 'success', 'error', 'leave'] as const)('never retains after %s', async reason => {
    const h = setup()
    await act(() => h.result.current.onClose(reason, monthly))
    expect(h.refresh).not.toHaveBeenCalled()
    expect(h.result.current.status).toBe('ended')
  })
  it('does not use cached quota when refresh fails', async () => {
    const h = setup(vi.fn().mockResolvedValue(null))
    await act(() => h.result.current.onClose('dismiss', monthly))
    expect(h.result.current.status).toBe('ended')
    expect(localStorage.length).toBe(0)
  })
  it('does not reopen payment when rights recover during the second check', async () => {
    const h = setup()
    await act(() => h.result.current.onClose('dismiss', monthly))
    h.refresh.mockResolvedValue({ pdfExport: { isVip: true, remaining: 'unlimited', allowed: true } } as VipQuotaStatus)
    await act(() => h.result.current.viewMonthly())
    expect(h.open).not.toHaveBeenCalled()
    expect(h.result.current.status).toBe('ended')
  })
  it('suppresses duplicate close events and ignores a late result after leaving', async () => {
    let resolve!: (q: VipQuotaStatus) => void
    const h = setup(vi.fn(() => new Promise<VipQuotaStatus>(r => { resolve = r })))
    let request!: Promise<void>
    act(() => { request = h.result.current.onClose('dismiss', monthly); void h.result.current.onClose('dismiss', monthly) })
    expect(h.refresh).toHaveBeenCalledTimes(1)
    act(() => h.result.current.setPreviewContext(false, false, 'pdf'))
    await act(async () => { resolve(exhausted()); await request })
    expect(h.result.current.status).toBe('ended')
    expect(localStorage.length).toBe(0)
  })
  it('cannot show for free formats or unsupported Word', async () => {
    const h = setup()
    act(() => h.result.current.setPreviewContext(true, false, 'markdown'))
    await act(() => h.result.current.onClose('dismiss', monthly))
    expect(h.refresh).not.toHaveBeenCalled()
  })
  it('caps after remount and removes the prompt on account changes', async () => {
    const h = setup()
    await act(() => h.result.current.onClose('dismiss', monthly))
    state.account = 'another-account'
    h.rerender()
    expect(h.result.current.status).toBe('ended')
    h.unmount()
    state.account = 'test-user'
    const next = setup()
    await act(() => next.result.current.onClose('dismiss', monthly))
    expect(next.result.current.status).toBe('ended')
  })
  it('dismisses immediately when live membership is updated', async () => {
    const h = setup()
    await act(() => h.result.current.onClose('dismiss', monthly))
    state.quota = { isVip: true, remaining: 0, allowed: true }
    h.rerender()
    expect(h.result.current.status).toBe('ended')
  })
})
