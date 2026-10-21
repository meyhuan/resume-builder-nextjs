import { checkQuota, refundFailedGeneration } from './quota-checker'
import { NextResponse } from 'next/server'

/** Reserve once. Refund server failures; an explicitly cancelled response keeps its charge. */
export async function withCareerQuota(handler: () => Promise<Response>): Promise<Response> {
  const quota = await checkQuota('ai:editor-assist')
  if (!quota.allowed) return NextResponse.json({
    error: quota.message, quotaExceeded: true, remaining: quota.remaining,
  }, { status: 429 })
  let refunded = false
  const refund = async () => {
    if (refunded || !quota.receipt) return
    refunded = true
    try {
      await refundFailedGeneration(quota.receipt)
    } catch (error) {
      // A quota-store outage must not discard generated content or mask the model error.
      console.error('[career-quota] refund failed', { receipt: quota.receipt, error })
    }
  }
  try {
    const response = await handler()
    if (!response.ok) { await refund(); return response }
    if (!response.headers.get('content-type')?.includes('application/x-ndjson') || !response.body) return response
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let pending = ''
    let doneSeen = false
    let cancelled = false
    return new Response(new ReadableStream({
      async pull(controller) {
        try {
          const chunk = await reader.read()
          if (cancelled) return
          pending += decoder.decode(chunk.value, { stream: !chunk.done })
          const lines = pending.split('\n')
          pending = chunk.done ? '' : lines.pop() || ''
          for (const line of lines) {
            if (!line.trim()) continue
            const event = JSON.parse(line)
            if (event.type === 'error' || (event.type === 'done' && event.failedCount > 0)) await refund()
            if (event.type === 'done') doneSeen = true
          }
          if (chunk.done) {
            if (!doneSeen) await refund()
            controller.close()
          } else controller.enqueue(chunk.value)
        } catch (error) {
          if (!cancelled) { await refund(); controller.error(error) }
        }
      },
      async cancel(reason) { cancelled = true; await reader.cancel(reason) },
    }), { status: response.status, headers: response.headers })
  } catch (error) {
    await refund()
    throw error
  }
}
