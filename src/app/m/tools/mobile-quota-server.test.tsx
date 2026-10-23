import { beforeEach, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ check: vi.fn(), refund: vi.fn() }))
vi.mock('@/lib/quota/quota-checker', () => ({ checkQuota: m.check, refundFailedGeneration: m.refund }))
import { withCareerQuota } from '@/lib/quota/career-quota-guard'
const receipt = { userId: 'test', feature: 'ai:editor-assist', date: '2026-10-20' }
beforeEach(() => {
  vi.resetAllMocks()
  m.check.mockResolvedValue({ allowed: true, receipt })
  m.refund.mockResolvedValue(undefined)
})
it('blocks exhausted quota before running the model', async () => {
  m.check.mockResolvedValue({ allowed: false, remaining: 0, message: '用完' })
  const handler = vi.fn()
  expect((await withCareerQuota(handler)).status).toBe(429)
  expect(handler).not.toHaveBeenCalled()
})
it('keeps a successful charge and refunds failed HTTP responses', async () => {
  await withCareerQuota(async () => new Response('{}'))
  expect(m.refund).not.toHaveBeenCalled()
  await withCareerQuota(async () => new Response('{}', { status: 400 }))
  expect(m.refund).toHaveBeenCalledExactlyOnceWith(receipt)
})
it('refunds exceptions exactly once', async () => {
  await expect(withCareerQuota(async () => { throw new Error('model failed') })).rejects.toThrow('model failed')
  expect(m.refund).toHaveBeenCalledExactlyOnceWith(receipt)
})
it.each([
  ['{"type":"done","failedCount":0}\n', 0],
  ['{"type":"error"}\n{"type":"done","failedCount":1}\n', 1],
  ['{"type":"progress"}\n', 1],
])('checks streamed completion and refunds failed/incomplete translation', async (body, refunds) => {
  const response = await withCareerQuota(async () => new Response(body, { headers: { 'Content-Type': 'application/x-ndjson' } }))
  await response.text()
  expect(m.refund).toHaveBeenCalledTimes(refunds)
})
it('does not refund an explicit client cancellation', async () => {
  const response = await withCareerQuota(async () => new Response(new ReadableStream({
    pull() { return new Promise(() => {}) },
  }), { headers: { 'Content-Type': 'application/x-ndjson' } }))
  await response.body!.cancel()
  expect(m.refund).not.toHaveBeenCalled()
})

it('preserves partial translation and its completion event when refund storage fails', async () => {
  m.refund.mockRejectedValue(new Error('database unavailable'))
  const body = '{"type":"done","failedCount":1}\n'
  const response = await withCareerQuota(async () => new Response(body, { headers: { 'Content-Type': 'application/x-ndjson' } }))
  expect(await response.text()).toBe(body)
  expect(m.refund).toHaveBeenCalledTimes(1)
})

it('preserves the original generation error when refund storage fails', async () => {
  m.refund.mockRejectedValue(new Error('database unavailable'))
  await expect(withCareerQuota(async () => { throw new Error('model failed') })).rejects.toThrow('model failed')
  expect(m.refund).toHaveBeenCalledTimes(1)
})
