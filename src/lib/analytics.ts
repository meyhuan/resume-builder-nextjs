'use client'

import { getPublicJavaApiBaseUrl } from '@/lib/java-api-base'

export type AnalyticsEventName =
  | 'page_view'
  | 'login_success'
  | 'resume_create_start'
  | 'resume_create_success'
  | 'resume_import_start'
  | 'resume_import_success'
  | 'resume_import_failed'
  | 'ai_generate_start'
  | 'ai_generate_success'
  | 'ai_generate_failed'
  | 'template_select'
  | 'resume_preview'
  | 'export_click'
  | 'export_success'
  | 'export_failed'
  | 'pay_page_view'
  | 'pay_plan_click'
  | 'pay_order_create'
  | 'pay_invoke_wechat'
  | 'pay_success'
  | 'pay_cancel'
  | 'pay_failed'
  | 'app_error'

type AnalyticsProperties = Record<string, unknown>

const ANONYMOUS_ID_KEY = 'analytics_anonymous_id'
const SESSION_ID_KEY = 'analytics_session_id'
const DEDUPE_WINDOW_MS = 1500

const recentEvents = new Map<string, number>()
let errorTrackingInstalled = false
let originalFetch: typeof window.fetch | null = null

function createId(prefix: string): string {
  const random = Math.random().toString(36).slice(2)
  return `${prefix}_${Date.now().toString(36)}_${random}`
}

function getStorageValue(key: string, prefix: string): string {
  if (typeof window === 'undefined') return createId(prefix)
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const next = createId(prefix)
  window.localStorage.setItem(key, next)
  return next
}

function getUserId(): number | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = window.localStorage.getItem('auth-storage')
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as { state?: { userInfo?: { id?: string | number } } }
    const value = parsed.state?.userInfo?.id
    const numeric = Number(value)
    return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined
  } catch {
    return undefined
  }
}

export function track(eventName: AnalyticsEventName, properties: AnalyticsProperties = {}): void {
  if (typeof window === 'undefined') return
  let baseUrl: string
  try {
    baseUrl = getPublicJavaApiBaseUrl()
  } catch {
    return
  }
  const userId = getUserId()
  const anonymousId = getStorageValue(ANONYMOUS_ID_KEY, 'anon')
  const sessionId = getStorageValue(SESSION_ID_KEY, 'sess')
  const url = new URL(window.location.href)

  const payload = {
    eventName,
    userId,
    anonymousId,
    sessionId,
    platform: 'web',
    page: url.pathname,
    source: url.searchParams.get('source') || document.referrer || undefined,
    channel: url.searchParams.get('channel') || undefined,
    entry: typeof properties.entry === 'string' ? properties.entry : undefined,
    properties,
  }
  const dedupeKey = `${eventName}:${JSON.stringify(payload.properties)}:${payload.page}`
  const now = Date.now()
  const lastTrackedAt = recentEvents.get(dedupeKey)
  if (lastTrackedAt && now - lastTrackedAt < DEDUPE_WINDOW_MS) return
  recentEvents.set(dedupeKey, now)

  fetch(`${baseUrl}/analytics/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Analytics must never interrupt the product flow.
  })
}

function normalizeError(error: unknown): { errorType: string; errorMessage: string; stack?: string } {
  if (error instanceof Error) {
    return {
      errorType: error.name || 'Error',
      errorMessage: error.message || 'Unknown error',
      stack: error.stack?.slice(0, 1200),
    }
  }
  if (typeof error === 'string') {
    return { errorType: 'Error', errorMessage: error }
  }
  try {
    return { errorType: 'Error', errorMessage: JSON.stringify(error).slice(0, 500) }
  } catch {
    return { errorType: 'Error', errorMessage: 'Unknown error' }
  }
}

function getRequestInfo(input: RequestInfo | URL, init?: RequestInit): { url: string; method: string } {
  const rawUrl = typeof input === 'string' || input instanceof URL ? String(input) : input.url
  const url = rawUrl.startsWith('http') ? new URL(rawUrl) : new URL(rawUrl, window.location.origin)
  const method = init?.method || (typeof input === 'string' || input instanceof URL ? 'GET' : input.method) || 'GET'
  return { url: url.pathname, method: method.toUpperCase() }
}

export function trackError(error: unknown, properties: AnalyticsProperties = {}): void {
  const normalized = normalizeError(error)
  track('app_error', {
    ...properties,
    ...normalized,
  })
}

export function installAnalyticsErrorTracking(): void {
  if (typeof window === 'undefined' || errorTrackingInstalled) return
  errorTrackingInstalled = true

  window.addEventListener('error', (event) => {
    trackError(event.error || event.message, {
      source: 'window_error',
      file: event.filename,
      line: event.lineno,
      column: event.colno,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    trackError(event.reason, {
      source: 'unhandled_rejection',
    })
  })

  originalFetch = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const info = getRequestInfo(input, init)
    try {
      const response = await originalFetch!(input, init)
      if (response.status >= 500 && !info.url.includes('/analytics/events')) {
        trackError(`HTTP ${response.status}`, {
          source: 'fetch_response',
          statusCode: response.status,
          requestPath: info.url,
          method: info.method,
        })
      }
      return response
    } catch (error) {
      if (!info.url.includes('/analytics/events')) {
        trackError(error, {
          source: 'fetch_error',
          requestPath: info.url,
          method: info.method,
        })
      }
      throw error
    }
  }
}
