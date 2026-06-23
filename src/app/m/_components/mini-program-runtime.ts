import { MINI_PROGRAM_VERSION_COOKIE } from '@/lib/mini-program-version-cookie'

interface MiniProgramRuntime {
  readonly hasMiniProgramHint: () => boolean
  readonly rememberMiniProgram: () => void
  readonly rememberCurrentUrl: () => void
  readonly readMiniVersion: () => string
}

const MINI_PROGRAM_SESSION_KEY = 'aijianli_in_mini_program'
const MINI_VERSION_STORAGE_KEY = 'aijianli_mini_version'

function getSearchParams(): URLSearchParams | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search)
}

function normalizeMiniVersion(value: string | null | undefined): string {
  return (value ?? '').trim()
}

function readMiniVersionFromParams(params: URLSearchParams | null): string {
  if (!params) return ''
  return normalizeMiniVersion(params.get('miniVersion') ?? params.get('mpVersion'))
}

function readStoredValue(key: string): string {
  if (typeof window === 'undefined') return ''
  try {
    return window.sessionStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function writeStoredValue(key: string, value: string): void {
  if (typeof window === 'undefined' || !value) return
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    // ignore storage failures
  }
}

function readCookieValue(name: string): string {
  if (typeof document === 'undefined') return ''
  const prefix = `${encodeURIComponent(name)}=`
  const item = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
  if (!item) return ''
  try {
    return decodeURIComponent(item.slice(prefix.length))
  } catch {
    return item.slice(prefix.length)
  }
}

function currentUrlHasMiniProgramHint(params: URLSearchParams | null): boolean {
  if (!params) return false
  return params.get('source') === 'mini' || params.get('mini') === '1'
}

function hasMiniProgramHint(): boolean {
  const params = getSearchParams()
  return currentUrlHasMiniProgramHint(params) || readStoredValue(MINI_PROGRAM_SESSION_KEY) === '1'
}

function rememberMiniProgram(): void {
  writeStoredValue(MINI_PROGRAM_SESSION_KEY, '1')
}

function rememberCurrentUrl(): void {
  const params = getSearchParams()
  if (currentUrlHasMiniProgramHint(params)) {
    rememberMiniProgram()
  }

  const miniVersion = readMiniVersionFromParams(params)
  if (miniVersion) {
    writeStoredValue(MINI_VERSION_STORAGE_KEY, miniVersion)
  }
}

function readMiniVersion(): string {
  const fromParams = readMiniVersionFromParams(getSearchParams())
  if (fromParams) return fromParams
  const fromCookie = normalizeMiniVersion(readCookieValue(MINI_PROGRAM_VERSION_COOKIE))
  if (fromCookie) return fromCookie
  return normalizeMiniVersion(readStoredValue(MINI_VERSION_STORAGE_KEY))
}

export const miniProgramRuntime: MiniProgramRuntime = {
  hasMiniProgramHint,
  rememberMiniProgram,
  rememberCurrentUrl,
  readMiniVersion,
}
