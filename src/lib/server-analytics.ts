import { getServerJavaApiBaseUrl } from '@/lib/java-api-base'

type AnalyticsProperties = Record<string, unknown>

export interface ServerAnalyticsEvent {
  readonly eventName: string
  readonly userId?: number | null
  readonly anonymousId?: string
  readonly sessionId?: string
  readonly platform: 'web' | 'mini_program' | 'backend' | 'h5_pay'
  readonly page?: string
  readonly source?: string
  readonly channel?: string
  readonly entry?: string
  readonly properties?: AnalyticsProperties
}

export async function trackServerAnalyticsEvent(event: ServerAnalyticsEvent): Promise<void> {
  try {
    const baseUrl = getServerJavaApiBaseUrl()
    const response = await fetch(`${baseUrl}/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
    if (!response.ok) {
      console.warn('[server-analytics] track failed', {
        eventName: event.eventName,
        status: response.status,
      })
    }
  } catch (error) {
    console.warn('[server-analytics] track failed', {
      eventName: event.eventName,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
