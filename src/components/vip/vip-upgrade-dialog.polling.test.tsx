import { StrictMode, useState } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import VipUpgradeDialog from './vip-upgrade-dialog'

const state = vi.hoisted(() => ({
  updateVipStatus: vi.fn(),
  refreshQuota: vi.fn(),
  quota: { pdfExport: { isVip: false, remaining: 0 } },
}))
vi.mock('@/store/use-auth-store', () => ({
  useAuthStore: () => ({ token: 'test-token', updateVipStatus: state.updateVipStatus }),
}))
vi.mock('@/store/use-vip-store', () => ({
  useVipStore: (selector: (store: unknown) => unknown) => selector({
    upgradeContext: 'pdf-export', quota: state.quota, refreshQuota: state.refreshQuota,
  }),
}))
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }))

const vip = { isVip: true, vipStatus: 1, vipType: 2, vipExpireTime: '2027-01-01' }
const nonVip = { ...vip, isVip: false, vipStatus: 0 }
const warning = '会员状态暂时无法确认，正在重试。若已支付，请勿重复付款。'
const response = (data: unknown, status = 200): Response => new Response(JSON.stringify({ data }), { status })
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}
let poll: ReturnType<typeof vi.fn>
let fetchMock: ReturnType<typeof vi.fn>
let initialVip = false

beforeEach(() => {
  vi.useFakeTimers()
  initialVip = false
  poll = vi.fn().mockImplementation(() => Promise.resolve(response(nonVip)))
  fetchMock = vi.fn((url: string, options?: RequestInit) => {
    if (url === '/next-api/vip/info') return Promise.resolve(response({
      ...nonVip, isVip: initialVip, userId: 1,
      plans: [{ id: 1, vipType: 2, vipName: '测试套餐', price: 19.9, sort: 1 }],
    }))
    if (url === '/next-api/vip/poll') return poll(url, options)
    if (url === '/next-api/invitation/mini-code') return Promise.resolve(new Response(JSON.stringify({
      ticket: 'test-ticket', qrCodeDataUrl: '/test-qr.png', invitationCode: 'test', expiresAt: '2027-01-01',
    })))
    if (url.startsWith('/next-api/invitation/status?')) return Promise.resolve(new Response('{}'))
    throw new Error(`Unexpected network request: ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  cleanup()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
async function advance(ms: number) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms) })
}
async function openDialog() {
  const view = render(<VipUpgradeDialog open onOpenChange={vi.fn()} />)
  await act(async () => {})
  expect(screen.getByText('扫码支付后自动刷新，无需手动点击')).toBeTruthy()
  return view
}

describe('VIP dialog polling lifecycle', () => {
  it('never overlaps slow status requests', async () => {
    const pending = deferred<Response>()
    poll.mockReturnValueOnce(pending.promise)
    await openDialog()
    await advance(9_000)
    expect(poll).toHaveBeenCalledTimes(1)
    await act(async () => { pending.resolve(response(nonVip)) })
    await advance(2_999)
    expect(poll).toHaveBeenCalledTimes(1)
    await advance(1)
    expect(poll).toHaveBeenCalledTimes(2)
  })

  it('aborts on controlled close and ignores a response that arrives anyway', async () => {
    const pending = deferred<Response>()
    poll.mockReturnValueOnce(pending.promise)
    const view = await openDialog()
    await advance(3_000)
    const signal = poll.mock.calls[0][1]?.signal
    view.rerender(<VipUpgradeDialog open={false} onOpenChange={vi.fn()} />)
    expect(signal?.aborted).toBe(true)
    await act(async () => { pending.resolve(response(vip)) })
    expect(state.updateVipStatus).not.toHaveBeenCalled()
    await advance(60_000)
    expect(poll).toHaveBeenCalledTimes(1)
  })

  it('ignores an old response after closing and reopening', async () => {
    const pending = deferred<Response>()
    poll.mockReturnValueOnce(pending.promise)
    const view = await openDialog()
    await advance(3_000)
    view.rerender(<VipUpgradeDialog open={false} onOpenChange={vi.fn()} />)
    view.rerender(<VipUpgradeDialog open onOpenChange={vi.fn()} />)
    await act(async () => {})
    await act(async () => { pending.resolve(response(vip)) })
    expect(state.updateVipStatus).not.toHaveBeenCalled()
    expect(screen.queryByText('会员已生效')).toBeNull()
    await advance(3_000)
    expect(poll).toHaveBeenCalledTimes(2)
  })

  it('aborts on unmount and ignores a late VIP response', async () => {
    const pending = deferred<Response>()
    poll.mockReturnValueOnce(pending.promise)
    const view = await openDialog()
    await advance(3_000)
    const signal = poll.mock.calls[0][1]?.signal
    view.unmount()
    expect(signal?.aborted).toBe(true)
    await act(async () => { pending.resolve(response(vip)) })
    expect(state.updateVipStatus).not.toHaveBeenCalled()
  })

  it('stops immediately for the close button and Escape', async () => {
    function Harness() {
      const [open, setOpen] = useState(true)
      return <VipUpgradeDialog open={open} onOpenChange={setOpen} />
    }
    for (const close of ['button', 'escape']) {
      const pending = deferred<Response>()
      poll.mockReturnValueOnce(pending.promise)
      const view = render(<Harness />)
      await act(async () => {})
      await advance(3_000)
      const signal = poll.mock.calls.at(-1)?.[1]?.signal
      if (close === 'button') fireEvent.click(screen.getByRole('button', { name: 'Close' }))
      else fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
      expect(signal?.aborted).toBe(true)
      await act(async () => { pending.resolve(response(vip)) })
      expect(state.updateVipStatus).not.toHaveBeenCalled()
      view.unmount()
    }
  })

  it('does not start a new poll if initial info resolves after close', async () => {
    const info = deferred<Response>()
    fetchMock.mockImplementationOnce(() => info.promise)
    const view = render(<VipUpgradeDialog open onOpenChange={vi.fn()} />)
    view.rerender(<VipUpgradeDialog open={false} onOpenChange={vi.fn()} />)
    await act(async () => { info.resolve(response({ ...nonVip, userId: 1, plans: [] })) })
    await advance(30_000)
    expect(poll).not.toHaveBeenCalled()
  })

  it('cancels the payment status query when switching to invitations and starts fresh on return', async () => {
    const pending = deferred<Response>()
    poll.mockReturnValueOnce(pending.promise)
    await openDialog()
    await advance(3_000)
    const signal = poll.mock.calls[0][1]?.signal
    fireEvent.click(screen.getByRole('button', { name: '邀请好友领次数' }))
    await act(async () => {})
    expect(signal?.aborted).toBe(true)
    await act(async () => { pending.resolve(response(vip)) })
    expect(state.updateVipStatus).not.toHaveBeenCalled()
    await advance(9_000)
    expect(poll).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: '返回开通会员' }))
    await advance(3_000)
    expect(poll).toHaveBeenCalledTimes(2)
    expect(screen.queryByText('会员已生效')).toBeNull()
  })

  it('keeps querying after one 502, warns after repeated failures, and recovers without another payment', async () => {
    poll.mockImplementation(() => Promise.resolve(response(null, 502)))
    await openDialog()
    await advance(3_000)
    expect(screen.queryByText(warning)).toBeNull()
    await advance(3_000)
    await advance(6_000)
    expect(screen.getByRole('status').textContent).toBe(warning)
    expect(state.updateVipStatus).not.toHaveBeenCalled()
    expect(screen.queryByText('会员已生效')).toBeNull()
    poll.mockImplementation(() => Promise.resolve(response(vip)))
    await advance(12_000)
    expect(state.updateVipStatus).toHaveBeenCalledExactlyOnceWith(vip)
    expect(screen.getByText('会员已生效')).toBeTruthy()
    expect(screen.queryByText(warning)).toBeNull()
    const count = poll.mock.calls.length
    await advance(60_000)
    expect(poll).toHaveBeenCalledTimes(count)
    expect(fetchMock.mock.calls.every(([url]) => ['/next-api/vip/info', '/next-api/vip/poll'].includes(url))).toBe(true)
  })

  it('retains the existing non-VIP to VIP success predicate', async () => {
    initialVip = true
    poll.mockImplementation(() => Promise.resolve(response(vip)))
    await openDialog()
    state.updateVipStatus.mockClear()
    await advance(6_000)
    expect(state.updateVipStatus).not.toHaveBeenCalled()
    expect(screen.queryByText('会员已生效')).toBeNull()
  })

  it('preserves normal new-member success and stops subsequent queries', async () => {
    poll.mockImplementation(() => Promise.resolve(response(vip)))
    await openDialog()
    await advance(3_000)
    expect(state.updateVipStatus).toHaveBeenCalledExactlyOnceWith(vip)
    expect(screen.getByText('会员已生效')).toBeTruthy()
    await advance(60_000)
    expect(poll).toHaveBeenCalledTimes(1)
  })

  it('does not leak polling under StrictMode effect cleanup', async () => {
    const pending = deferred<Response>()
    poll.mockReturnValue(pending.promise)
    const view = render(<StrictMode><VipUpgradeDialog open onOpenChange={vi.fn()} /></StrictMode>)
    await act(async () => {})
    await advance(9_000)
    expect(poll).toHaveBeenCalledTimes(1)
    view.unmount()
    await act(async () => { pending.resolve(response(vip)) })
    expect(state.updateVipStatus).not.toHaveBeenCalled()
  })
})
