import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { miniProgramRuntime } from '@/app/m/_components/mini-program-runtime'

const product = { productType: 'single_export', goodsId: 'goods_export_once', vipType: 0, price: 9.9, grantExportCount: 1, name: '单次导出' }
const response = (products: unknown[]) => ({ ok: true, json: async () => ({ data: { products } }) })
beforeEach(() => { vi.resetModules(); vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

it('preserves checkout capability through editing and preview but clears it for an old native launch', () => {
  sessionStorage.clear()
  history.replaceState({}, '', '/m/edit?source=mini&miniVersion=2.0.1&miniSingleExport=1')
  miniProgramRuntime.rememberCurrentUrl()
  history.replaceState({}, '', '/m/preview?miniVersion=2.0.1')
  miniProgramRuntime.rememberCurrentUrl()
  expect(miniProgramRuntime.supportsSingleExportCheckout()).toBe(true)
  history.replaceState({}, '', '/m/edit?source=mini&miniVersion=2.0.1')
  miniProgramRuntime.rememberCurrentUrl()
  history.replaceState({}, '', '/m/preview')
  expect(miniProgramRuntime.supportsSingleExportCheckout()).toBe(false)
  sessionStorage.clear()
  history.replaceState({}, '', '/')
})

it('prefetch and open share a request, with refreshed actual prices after expiry', async () => {
  const fetcher = vi.fn().mockResolvedValue(response([product]))
  vi.stubGlobal('fetch', fetcher)
  const { loadMiniSingleExport } = await import('./mini-single-export')
  const pending = loadMiniSingleExport()
  expect(loadMiniSingleExport()).toBe(pending)
  expect(await pending).toEqual(product)
  await loadMiniSingleExport()
  expect(fetcher).toHaveBeenCalledTimes(1)
  vi.advanceTimersByTime(300001)
  fetcher.mockResolvedValue(response([{ ...product, price: 12.9 }]))
  expect((await loadMiniSingleExport())?.price).toBe(12.9)
})

it.each([{ enabled: false }, { status: 0 }, { price: 0 }, { price: '9.9' }, { goodsId: '' }, { vipType: 3 }, { grantExportCount: 0 }, { productType: 'vip' }])('does not sell invalid product %j', async change => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([{ ...product, ...change }])))
  const { loadMiniSingleExport } = await import('./mini-single-export')
  expect(await loadMiniSingleExport()).toBeNull()
})

it('does not fall back to 9.9 when catalogue fails', async () => {
  const fetcher = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response([product]))
  vi.stubGlobal('fetch', fetcher)
  const { loadMiniSingleExport } = await import('./mini-single-export')
  await expect(loadMiniSingleExport()).rejects.toThrow('offline')
  expect(await loadMiniSingleExport()).toEqual(product)
})
