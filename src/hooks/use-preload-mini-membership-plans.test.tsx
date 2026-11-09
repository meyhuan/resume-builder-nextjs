import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { usePreloadMiniMembershipPlans } from './use-preload-mini-membership-plans'
import { ExportMembershipSheet } from '@/app/m/preview/_components/export-membership-sheet'

vi.mock('@/lib/analytics', () => ({ track: vi.fn() }))
afterEach(() => { cleanup(); vi.unstubAllGlobals(); history.replaceState({}, '', '/') })

it('shares the editing prefetch with the first sheet, even while pending, and reuses prices after reopening', async () => {
  let finish!: (value: unknown) => void
  const fetcher = vi.fn<(url: RequestInfo | URL) => Promise<unknown>>(url => String(url).includes('mini-export-product')
    ? Promise.resolve({ ok: true, json: async () => ({ data: { products: [{ productType: 'single_export', goodsId: 'goods_export_once', vipType: 0, price: 9.9, grantExportCount: 1, name: '单次导出' }] } }) })
    : new Promise(resolve => { finish = resolve }))
  vi.stubGlobal('fetch', fetcher)
  function EditorEntry({ mini }: { mini: boolean }) {
    usePreloadMiniMembershipPlans(mini)
    return <input aria-label="编辑简历" />
  }
  const editor = render(<EditorEntry mini={false} />)
  expect(fetcher).not.toHaveBeenCalled()
  editor.rerender(<EditorEntry mini />)
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
  expect(screen.getByRole('textbox', { name: '编辑简历' })).toBeTruthy()
  expect(screen.queryByRole('dialog')).toBeNull()
  editor.unmount()

  const props = { open: true, preload: true, onClose: vi.fn(), onRefreshQuota: vi.fn().mockResolvedValue(null) }
  const sheet = render(<ExportMembershipSheet {...props} />)
  expect(screen.getByText('正在加载套餐…')).toBeTruthy()
  expect(fetcher).toHaveBeenCalledTimes(2)
  await act(async () => finish({ ok: true, json: async () => ({ data: { plans: [
    { vipType: 3, vipName: '终身会员', price: 69.9, duration: 30000, sort: 3 },
    { vipType: 1, vipName: '月会员', price: 19.9, duration: 30, sort: 1 },
  ] } }) }))
  await screen.findByText('¥69.9 立即永久开通')
  expect(screen.queryByText('正在加载套餐…')).toBeNull()
  sheet.rerender(<ExportMembershipSheet {...props} open={false} />)
  sheet.rerender(<ExportMembershipSheet {...props} />)
  await screen.findByText('¥69.9 立即永久开通')
  expect(screen.queryByText('正在加载套餐…')).toBeNull()
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(fetcher.mock.calls[0][0]).toBe('/next-api/vip/mini-plans')

  const navigateTo = vi.fn()
  vi.stubGlobal('wx', { miniProgram: { navigateTo } })
  fireEvent.click(screen.getByText('单次导出 (仅限1次)'))
  await screen.findByText('¥9.9 立即单次导出')
  expect(navigateTo).not.toHaveBeenCalled()
  // Old native clients must never receive an unsupported checkout request.
  fireEvent.click(screen.getByText('¥9.9 立即单次导出'))
  expect(screen.getByRole('alert').textContent).toContain('请更新小程序')
  expect(navigateTo).not.toHaveBeenCalled()
  history.replaceState(history.state, '', '/?miniSingleExport=1')
  fireEvent.click(screen.getByText('重试'))
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  fireEvent.click(screen.getByText('仅多加 ¥10 升级求职月卡'))
  await screen.findByText('¥19.9 立即开通')
  expect(navigateTo).not.toHaveBeenCalled()
  fireEvent.click(screen.getByText('单次导出 (仅限1次)'))
  fireEvent.click(screen.getByText('¥9.9 立即单次导出'))
  fireEvent.click(screen.getByText('正在打开微信支付…'))
  expect(navigateTo).toHaveBeenCalledTimes(1)
  const query = new URL(navigateTo.mock.calls[0][0].url, 'https://mini.test').searchParams
  expect(query.get('productType')).toBe('single_export')
  expect(query.get('goodsId')).toBe('goods_export_once')
  expect(query.get('price')).toBe('9.9')
  fireEvent(window, new Event('pageshow'))
  expect(props.onRefreshQuota).toHaveBeenCalledTimes(1)
  expect(props.onClose).toHaveBeenCalledTimes(1)
})
