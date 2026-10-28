import { afterEach, describe, expect, it, vi } from 'vitest'
import { isRequestTimeout, timeoutSignal } from './timeout-signal'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('timeoutSignal', () => {
  it('aborts after the deadline when the WebView lacks AbortSignal.timeout', () => {
    vi.useFakeTimers()
    vi.stubGlobal('AbortSignal', { timeout: undefined })
    const signal = timeoutSignal(1000)
    expect(signal.aborted).toBe(false)
    vi.advanceTimersByTime(999)
    expect(signal.aborted).toBe(false)
    vi.advanceTimersByTime(1)
    expect(signal.aborted).toBe(true)
    expect(isRequestTimeout(signal.reason)).toBe(true)
  })

  it('uses the native signal when supported', () => {
    const nativeSignal = new AbortController().signal
    const nativeTimeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(nativeSignal)
    expect(timeoutSignal(20000)).toBe(nativeSignal)
    expect(nativeTimeout).toHaveBeenCalledWith(20000)
  })
})

describe('isRequestTimeout', () => {
  it.each(['TimeoutError', 'AbortError'])('recognizes %s from WebViews, including other realms', name => {
    expect(isRequestTimeout(new DOMException('Request expired', name))).toBe(true)
    expect(isRequestTimeout({ name, message: 'Request expired' })).toBe(true)
  })

  it.each([new Error('提交失败'), new TypeError('Failed to fetch'), null, undefined, 'AbortError'])('does not classify other errors as timeouts: %s', error => {
    expect(isRequestTimeout(error)).toBe(false)
  })
})
