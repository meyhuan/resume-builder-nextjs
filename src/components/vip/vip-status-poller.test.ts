import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startVipStatusPolling } from './vip-status-poller'

const nonVip = { isVip: false, vipStatus: 0, vipType: 0, vipExpireTime: null }
const vip = { ...nonVip, isVip: true, vipStatus: 1 }
const response = (data: unknown, status = 200): Response => new Response(JSON.stringify({ data }), { status })
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}
let fetchMock: ReturnType<typeof vi.fn>
let onStatus: ReturnType<typeof vi.fn>
let onUnavailable: ReturnType<typeof vi.fn>
let stop: (() => void) | undefined
const advance = (ms: number) => vi.advanceTimersByTimeAsync(ms)
const start = () => { stop = startVipStatusPolling({ onStatus, onUnavailable }); return stop }

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(0)
  fetchMock = vi.fn().mockImplementation(() => Promise.resolve(response(nonVip)))
  onStatus = vi.fn().mockReturnValue(false)
  onUnavailable = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  stop?.()
  stop = undefined
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('serial VIP status poller', () => {
  it('cancels a scheduled poll before any request', async () => {
    start()()
    await advance(60_000)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(onStatus).not.toHaveBeenCalled()
    expect(onUnavailable).not.toHaveBeenCalled()
  })

  it('waits for response body parsing before scheduling another query', async () => {
    const body = deferred<{ data: typeof nonVip }>()
    fetchMock.mockResolvedValueOnce({ ok: true, json: () => body.promise })
    start()
    await advance(9_000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    body.resolve({ data: nonVip })
    await advance(0)
    expect(onStatus).toHaveBeenCalledExactlyOnceWith(nonVip)
    await advance(2_999)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await advance(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('ignores body parsing completion after stop', async () => {
    const body = deferred<{ data: typeof vip }>()
    fetchMock.mockResolvedValueOnce({ ok: true, json: () => body.promise })
    start()
    await advance(3_000)
    stop?.()
    body.resolve({ data: vip })
    await advance(60_000)
    expect(onStatus).not.toHaveBeenCalled()
    expect(onUnavailable).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('aborts timed-out requests and retries only once the previous request settles', async () => {
    let active = 0
    let peak = 0
    fetchMock.mockImplementation((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      active += 1
      peak = Math.max(peak, active)
      options.signal?.addEventListener('abort', () => {
        active -= 1
        reject(new DOMException('Aborted', 'AbortError'))
      }, { once: true })
    }))
    start()
    await advance(3_000)
    const firstSignal = fetchMock.mock.calls[0][1].signal
    await advance(7_999)
    expect(firstSignal.aborted).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await advance(1)
    expect(firstSignal.aborted).toBe(true)
    expect(active).toBe(0)
    await advance(3_000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(peak).toBe(1)
    expect(onStatus).not.toHaveBeenCalled()
  })

  it('does not accept a late successful response after its timeout', async () => {
    const pending = deferred<Response>()
    fetchMock.mockReturnValueOnce(pending.promise)
    start()
    await advance(11_000)
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true)
    pending.resolve(response(vip))
    await advance(0)
    expect(onStatus).not.toHaveBeenCalled()
    await advance(3_000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('backs off repeated 502 responses with a 30-second ceiling', async () => {
    const requestTimes: number[] = []
    fetchMock.mockImplementation(() => {
      requestTimes.push(Date.now())
      return Promise.resolve(response(null, 502))
    })
    start()
    await advance(108_000)
    expect(requestTimes).toEqual([3_000, 6_000, 12_000, 24_000, 48_000, 78_000, 108_000])
    expect(onStatus).not.toHaveBeenCalled()
    expect(onUnavailable.mock.calls.every(([value]) => value === true)).toBe(true)
    expect(onUnavailable).toHaveBeenCalledTimes(5)
  })

  it('clears the notice and resets the failure streak after a successful query', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(response(null, 502)))
    start()
    await advance(12_000)
    expect(onUnavailable).toHaveBeenLastCalledWith(true)
    fetchMock.mockResolvedValueOnce(response(nonVip))
    await advance(12_000)
    expect(onUnavailable).toHaveBeenLastCalledWith(false)
    expect(onStatus).toHaveBeenCalledExactlyOnceWith(nonVip)
    onUnavailable.mockClear()
    await advance(3_000)
    await advance(3_000)
    expect(onUnavailable).not.toHaveBeenCalled()
    await advance(6_000)
    expect(onUnavailable).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('treats network and JSON failures as unavailable, never as a VIP result', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response('not JSON'))
      .mockResolvedValueOnce(response(null, 502))
    start()
    await advance(12_000)
    expect(onUnavailable).toHaveBeenCalledExactlyOnceWith(true)
    expect(onStatus).not.toHaveBeenCalled()
  })

  it('stops only when the caller confirms its existing success condition', async () => {
    fetchMock.mockResolvedValue(response(vip))
    onStatus.mockReturnValue(true)
    start()
    await advance(60_000)
    expect(onStatus).toHaveBeenCalledExactlyOnceWith(vip)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
    expect(fetchMock.mock.calls[0][0]).toBe('/next-api/vip/poll')
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined()
    expect(fetchMock.mock.calls[0][1].method ?? 'GET').toBe('GET')
  })
})
