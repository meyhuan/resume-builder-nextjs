'use client'

import { getStoredAdminPassword } from '@/lib/admin-auth'
import { getPublicJavaApiBaseUrl } from '@/lib/java-api-base'

export const VIP_TYPE_LABELS: Record<number, string> = {
  1: '月卡',
  2: '年卡',
  3: '终身',
}

export function vipTypeLabel(type: number | null | undefined): string {
  if (type == null) return '-'
  return VIP_TYPE_LABELS[type] ?? '未知'
}

export class AdminApiError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'AdminApiError'
    this.status = status
  }
}

interface JavaResult<T> {
  status?: number
  result?: string
  message?: string
  data?: T
}

export function adminErrorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

export async function adminJava<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const password = getStoredAdminPassword()
  if (password) headers.set('X-Admin-Password', password)

  const body = init.body
  const isForm = body instanceof URLSearchParams || body instanceof FormData
  if (body && !isForm && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${getPublicJavaApiBaseUrl()}/admin${path}`, {
    ...init,
    headers,
  })
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('text/csv') || contentType.includes('application/octet-stream')) {
    if (!response.ok) throw new AdminApiError('导出失败', response.status)
    return (await response.blob()) as T
  }

  const json: unknown = await response.json().catch(() => null)
  if (Array.isArray(json)) return json as T
  if (!json || typeof json !== 'object') {
    throw new AdminApiError(response.ok ? '接口返回异常' : '请求失败', response.status)
  }

  const result = json as JavaResult<T>
  if (typeof result.status === 'number') {
    if (result.status !== 100) {
      throw new AdminApiError(result.result || result.message || '操作失败', result.status)
    }
    return result.data as T
  }

  if (!response.ok) throw new AdminApiError('请求失败', response.status)
  return json as T
}
