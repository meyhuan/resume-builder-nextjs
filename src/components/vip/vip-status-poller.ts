import type { VipPollData } from '@/lib/quota/vip-types'

const POLL_INTERVAL_MS = 3_000
const REQUEST_TIMEOUT_MS = 8_000
const MAX_RETRY_DELAY_MS = 30_000
const FAILURE_NOTICE_THRESHOLD = 3

interface VipStatusPollerOptions {
  /** Return true only when the caller's existing success condition is met. */
  onStatus: (data: VipPollData | undefined) => boolean
  onUnavailable: (unavailable: boolean) => void
}

/** Poll status only. This never creates, retries, or verifies a payment order. */
export function startVipStatusPolling({ onStatus, onUnavailable }: VipStatusPollerOptions): () => void {
  let stopped = false
  let failures = 0
  let nextPoll: ReturnType<typeof setTimeout> | undefined
  let deadline: ReturnType<typeof setTimeout> | undefined
  let inFlight: AbortController | undefined

  const stop = (): void => {
    stopped = true
    clearTimeout(nextPoll)
    clearTimeout(deadline)
    inFlight?.abort()
  }

  const poll = async (): Promise<void> => {
    if (stopped) return
    const controller = new AbortController()
    inFlight = controller
    deadline = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const response = await fetch('/next-api/vip/poll', { signal: controller.signal })
      if (stopped) return
      if (!response.ok) throw new Error(`VIP status HTTP ${response.status}`)
      const json: { data?: VipPollData } = await response.json()
      // Abort is best-effort: a response/body may already have been delivered.
      // A stopped or timed-out request must never update this or a newer dialog.
      if (stopped) return
      if (controller.signal.aborted) throw new Error('VIP status query timed out')
      failures = 0
      onUnavailable(false)
      if (onStatus(json.data)) stop()
    } catch {
      if (stopped) return
      failures += 1
      if (failures >= FAILURE_NOTICE_THRESHOLD) onUnavailable(true)
    } finally {
      clearTimeout(deadline)
      inFlight = undefined
      if (!stopped) {
        const delay = failures > 0
          ? Math.min(POLL_INTERVAL_MS * 2 ** Math.min(failures - 1, 4), MAX_RETRY_DELAY_MS)
          : POLL_INTERVAL_MS
        // Schedule only after fetch AND body parsing settle, never on an interval.
        nextPoll = setTimeout(() => { void poll() }, delay)
      }
    }
  }

  nextPoll = setTimeout(() => { void poll() }, POLL_INTERVAL_MS)
  return stop
}
