'use client'

import { useEffect, type ReactElement } from 'react'
import { addRequestLog } from './request-log-store'

let isInstalled = false

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

function getRequestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase()
  if (typeof input === 'object' && 'method' in input && input.method) return input.method.toUpperCase()
  return 'GET'
}

function sanitizeUrl(rawUrl: string): string {
  try {
    const url: URL = new URL(rawUrl, window.location.origin)
    return `${url.pathname}${url.search}`
  } catch {
    return rawUrl
  }
}

function shouldSkipLog(url: string): boolean {
  return url.includes('/next-api/feedback')
}

function installRequestLogger(): void {
  if (isInstalled) return
  isInstalled = true
  const originalFetch: typeof window.fetch = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const rawUrl: string = getRequestUrl(input)
    const method: string = getRequestMethod(input, init)
    const startTime: number = Date.now()
    try {
      const response: Response = await originalFetch(input, init)
      if (!shouldSkipLog(rawUrl)) {
        addRequestLog({
          time: new Date().toISOString(),
          method,
          url: sanitizeUrl(rawUrl),
          status: response.status,
          durationMs: Date.now() - startTime,
          error: null,
        })
      }
      return response
    } catch (error: unknown) {
      if (!shouldSkipLog(rawUrl)) {
        addRequestLog({
          time: new Date().toISOString(),
          method,
          url: sanitizeUrl(rawUrl),
          status: null,
          durationMs: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error),
        })
      }
      throw error
    }
  }
}

export function InstallRequestLogger(): ReactElement | null {
  useEffect((): void => {
    installRequestLogger()
  }, [])
  return null
}
