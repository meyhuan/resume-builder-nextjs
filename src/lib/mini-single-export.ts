export interface MiniSingleExport {
  productType: 'single_export'
  goodsId: string
  vipType: 0
  price: number
  grantExportCount: number
  name: string
}

let cached: { product: MiniSingleExport | null; expiresAt: number } | null = null
let flight: Promise<MiniSingleExport | null> | null = null

/** Same existing mini-program product; never substitute a hard-coded price. */
export function loadMiniSingleExport(force = false): Promise<MiniSingleExport | null> {
  if (!force && cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.product)
  if (flight) return flight
  flight = (async () => {
    const response = await fetch('/next-api/vip/mini-export-product', { cache: 'no-store', signal: AbortSignal.timeout(10_000) })
    if (!response.ok) throw new Error('单次导出方案加载失败，请重试')
    const body = await response.json()
    if (!Array.isArray(body.data?.products)) throw new Error('单次导出方案加载失败，请重试')
    const product: MiniSingleExport | null = body.data.products.find((item: MiniSingleExport & { enabled?: boolean; status?: number }) =>
      item && item.productType === 'single_export' && item.vipType === 0 && typeof item.goodsId === 'string' && item.goodsId.trim()
      && Number.isFinite(item.price) && item.price > 0 && item.grantExportCount === 1
      && item.enabled !== false && item.status !== 0) ?? null
    cached = { product, expiresAt: Date.now() + 5 * 60_000 }
    return product
  })().catch(error => { cached = null; throw error }).finally(() => { flight = null })
  return flight
}
