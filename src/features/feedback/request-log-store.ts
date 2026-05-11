const REQUEST_LOG_STORAGE_KEY = 'feedback_request_logs'
const MAX_REQUEST_LOGS = 50

export interface RequestLogEntry {
  readonly time: string
  readonly method: string
  readonly url: string
  readonly status: number | null
  readonly durationMs: number
  readonly error: string | null
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function parseLogs(raw: string | null): readonly RequestLogEntry[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isRequestLogEntry).slice(-MAX_REQUEST_LOGS) : []
  } catch {
    return []
  }
}

function isRequestLogEntry(value: unknown): value is RequestLogEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<RequestLogEntry>
  return typeof entry.time === 'string' && typeof entry.method === 'string' && typeof entry.url === 'string'
}

function getStoredLogs(): readonly RequestLogEntry[] {
  if (!canUseStorage()) return []
  return parseLogs(window.localStorage.getItem(REQUEST_LOG_STORAGE_KEY))
}

function setStoredLogs(logs: readonly RequestLogEntry[]): void {
  if (!canUseStorage()) return
  window.localStorage.setItem(REQUEST_LOG_STORAGE_KEY, JSON.stringify(logs.slice(-MAX_REQUEST_LOGS)))
}

export function addRequestLog(entry: RequestLogEntry): void {
  const logs: readonly RequestLogEntry[] = getStoredLogs()
  setStoredLogs([...logs, entry])
}

export function getRequestLogs(): readonly RequestLogEntry[] {
  return getStoredLogs()
}
