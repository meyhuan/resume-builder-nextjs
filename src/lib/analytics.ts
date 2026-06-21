'use client'

import { getPublicJavaApiBaseUrl } from '@/lib/java-api-base'

export type AnalyticsEventName =
  | 'page_view'
  | 'login_success'
  | 'resume_create_start'
  | 'resume_create_success'
  | 'resume_create_failed'
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
  | 'pay_submit_click'
  | 'pay_order_create'
  | 'pay_invoke_wechat'
  | 'pay_success'
  | 'pay_cancel'
  | 'pay_failed'
  | 'app_error'

type AnalyticsProperties = Record<string, unknown>

const ANONYMOUS_ID_KEY = 'analytics_anonymous_id'
const SESSION_ID_KEY = 'analytics_session_id'
const CHUNK_LOAD_RELOAD_KEY = 'analytics_chunk_load_reloaded_at'
const DEDUPE_WINDOW_MS = 1500
const CHUNK_LOAD_RELOAD_COOLDOWN_MS = 60 * 1000

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

function isMiniProgramWebView(url: URL): boolean {
  if (url.searchParams.get('source') === 'mini' || url.searchParams.get('mini') === '1') return true
  const runtime = window as unknown as { __wxjs_environment?: string; wx?: { miniProgram?: unknown } }
  return runtime.__wxjs_environment === 'miniprogram' || Boolean(runtime.wx?.miniProgram)
}

function getPlatform(url: URL): 'web' | 'mini_program' {
  return isMiniProgramWebView(url) ? 'mini_program' : 'web'
}

function stringProperty(properties: AnalyticsProperties, key: string): string {
  const value = properties[key]
  return typeof value === 'string' ? value : ''
}

function isInternalRenderContext(properties: AnalyticsProperties): boolean {
  const pathname = window.location.pathname
  const userAgent = window.navigator.userAgent || ''
  const file = stringProperty(properties, 'file')
  const requestPath = stringProperty(properties, 'requestPath')

  return pathname.startsWith('/print')
    || /HeadlessChrome|Puppeteer|Playwright/i.test(userAgent)
    || file.includes('localhost:3000/_next/static/')
    || requestPath.startsWith('/print/')
}

function shouldSuppressAppError(properties: AnalyticsProperties): boolean {
  const errorType = stringProperty(properties, 'errorType')
  const errorMessage = stringProperty(properties, 'errorMessage')
  if (errorType === 'AbortError'
    || /signal is aborted|fetch is aborted|user aborted a request|request aborted/i.test(errorMessage)) {
    return true
  }

  if (!isInternalRenderContext(properties)) return false
  const file = stringProperty(properties, 'file')
  const requestPath = stringProperty(properties, 'requestPath')
  return window.location.pathname.startsWith('/print')
    || file.includes('/_next/static/')
    || requestPath.includes('/_next/static/')
    || /ChunkLoadError|Loading chunk|dynamically imported module/i.test(errorMessage)
}

function isChunkLoadFailure(properties: AnalyticsProperties): boolean {
  const errorType = stringProperty(properties, 'errorType')
  const errorMessage = stringProperty(properties, 'errorMessage')
  return errorType === 'ChunkLoadError'
    || /ChunkLoadError|Loading chunk|dynamically imported module/i.test(errorMessage)
}

function recoverFromChunkLoadFailure(): void {
  try {
    const lastReloadedAt = Number(window.sessionStorage.getItem(CHUNK_LOAD_RELOAD_KEY) || '0')
    const now = Date.now()
    if (Number.isFinite(lastReloadedAt) && now - lastReloadedAt < CHUNK_LOAD_RELOAD_COOLDOWN_MS) return
    window.sessionStorage.setItem(CHUNK_LOAD_RELOAD_KEY, String(now))
    window.setTimeout(() => {
      window.location.reload()
    }, 250)
  } catch {
    window.location.reload()
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
    platform: getPlatform(url),
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

function getNetworkContext(startedAt: number): AnalyticsProperties {
  const connection = navigator as Navigator & {
    connection?: {
      effectiveType?: string
      downlink?: number
      rtt?: number
      saveData?: boolean
    }
  }

  return {
    elapsedMs: Date.now() - startedAt,
    online: navigator.onLine,
    visibilityState: document.visibilityState,
    networkType: connection.connection?.effectiveType,
    downlink: connection.connection?.downlink,
    rtt: connection.connection?.rtt,
    saveData: connection.connection?.saveData,
  }
}

export function trackError(error: unknown, properties: AnalyticsProperties = {}): void {
  const normalized = normalizeError(error)
  const nextProperties = {
    ...properties,
    ...normalized,
  }
  const shouldReloadForChunk = isChunkLoadFailure(nextProperties)
  if (!shouldReloadForChunk && shouldSuppressAppError(nextProperties)) return
  track('app_error', {
    ...nextProperties,
    ...(shouldReloadForChunk ? { recoveryAction: 'reload_page_once' } : {}),
  })
  if (shouldReloadForChunk) recoverFromChunkLoadFailure()
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
    const startedAt = Date.now()
    try {
      const response = await originalFetch!(input, init)
      if (response.status >= 500 && !info.url.includes('/analytics/events')) {
        trackError(`HTTP ${response.status}`, {
          source: 'fetch_response',
          statusCode: response.status,
          requestPath: info.url,
          method: info.method,
          ...getNetworkContext(startedAt),
        })
      }
      return response
    } catch (error) {
      if (!info.url.includes('/analytics/events')) {
        trackError(error, {
          source: 'fetch_error',
          requestPath: info.url,
          method: info.method,
          ...getNetworkContext(startedAt),
        })
      }
      throw error
    }
  }
}
