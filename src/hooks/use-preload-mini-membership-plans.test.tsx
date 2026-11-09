import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { usePreloadMiniMembershipPlans } from './use-preload-mini-membership-plans'
import { ExportMembershipSheet } from '@/app/m/preview/_components/export-membership-sheet'

vi.mock('@/lib/analytics', () => ({ track: vi.fn() }))
afterEach(() => { cleanup(); vi.unstubAllGlobals(); history.replaceState({}, '', '/') })

it('shares the editing prefetch with the first sheet, even while pending, and reuses prices after reopening', async () => {
  let finish!: (value: unknown) => void
  const fetcher = vi.fn<(url: RequestInfo | URL) => Promise<unknown>>(() => new Promise(resolve => { finish = resolve }))
  vi.stubGlobal('fetch', fetcher)
  function EditorEntry({ mini }: { mini: boolean }) {
    usePreloadMiniMembershipPlans(mini)
    return <input aria-label="编辑简历" />
  }
  const editor = render(<EditorEntry mini={false} />)
  expect(fetcher).not.toHaveBeenCalled()
  editor.rerender(<EditorEntry mini />)
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
  expect(screen.getByRole('textbox', { name: '编辑简历' })).toBeTruthy()
  expect(screen.queryByRole('dialog')).toBeNull()
  editor.unmount()

  const props = { open: true, preload: true, onClose: vi.fn(), onRefreshQuota: vi.fn().mockResolvedValue(null) }
  const sheet = render(<ExportMembershipSheet {...props} />)
  expect(screen.getByText('正在加载套餐…')).toBeTruthy()
  expect(fetcher).toHaveBeenCalledTimes(1)
  await act(async () => finish({ ok: true, json: async () => ({ data: { plans: [
    { vipType: 3, vipName: '终身会员', price: 69.9, duration: 30000, sort: 3 },
    { vipType: 1, vipName: '月会员', price: 19.9, duration: 30, sort: 1 },
  ] } }) }))
  await screen.findByText('确认开通 · ¥69.9')
  expect(screen.queryByText('正在加载套餐…')).toBeNull()
  sheet.rerender(<ExportMembershipSheet {...props} open={false} />)
  sheet.rerender(<ExportMembershipSheet {...props} />)
  await screen.findByText('确认开通 · ¥69.9')
  expect(screen.queryByText('正在加载套餐…')).toBeNull()
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(fetcher.mock.calls[0][0]).toBe('/next-api/vip/mini-plans')
})
