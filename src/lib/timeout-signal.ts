/** Create a timeout signal in WebViews that do not implement AbortSignal.timeout. */
export function timeoutSignal(milliseconds: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(milliseconds)
  const controller = new AbortController()
  setTimeout(() => controller.abort(), milliseconds)
  return controller.signal
}

/** These requests use timeout-only signals; older WebViews reject with AbortError. */
export function isRequestTimeout(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('name' in error)) return false
  return error.name === 'TimeoutError' || error.name === 'AbortError'
}
