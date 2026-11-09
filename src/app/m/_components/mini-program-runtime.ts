import { MINI_PROGRAM_CONTEXT_COOKIE, MINI_PROGRAM_VERSION_COOKIE } from '@/lib/mini-program-version-cookie'

interface MiniProgramRuntime {
  readonly hasMiniProgramHint: () => boolean
  readonly hasStandaloneHint: () => boolean
  readonly rememberMiniProgram: () => void
  readonly rememberCurrentUrl: () => void
  readonly readMiniVersion: () => string
  readonly supportsDocxExport: () => boolean
  readonly supportsSingleExportCheckout: () => boolean
}

const MINI_PROGRAM_SESSION_KEY = 'aijianli_in_mini_program'
const MINI_VERSION_STORAGE_KEY = 'aijianli_mini_version'
const MINI_DOCX_STORAGE_KEY = 'aijianli_mini_docx'
const MINI_SINGLE_EXPORT_STORAGE_KEY = 'aijianli_mini_single_export'

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

function writeCookieValue(name: string, value: string): void {
  if (typeof document === 'undefined' || !value) return
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/m; max-age=2592000; SameSite=Lax`
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
  return params.get('source') === 'mini'
    || params.get('mini') === '1'
    || params.has('miniVersion')
    || params.has('mpVersion')
}

function currentUrlHasStandaloneHint(params: URLSearchParams | null): boolean {
  if (!params) return false
  const source = params.get('source')
  return source === 'web'
    || source === 'standalone'
    || params.get('mini') === '0'
    || params.get('standalone') === '1'
    || params.get('web') === '1'
}

function hasMiniProgramHint(): boolean {
  const params = getSearchParams()
  return currentUrlHasMiniProgramHint(params)
    || readStoredValue(MINI_PROGRAM_SESSION_KEY) === '1'
    || readCookieValue(MINI_PROGRAM_CONTEXT_COOKIE) === '1'
}

function hasStandaloneHint(): boolean {
  return currentUrlHasStandaloneHint(getSearchParams())
}

function rememberMiniProgram(): void {
  writeStoredValue(MINI_PROGRAM_SESSION_KEY, '1')
  writeCookieValue(MINI_PROGRAM_CONTEXT_COOKIE, '1')
}

function rememberCurrentUrl(): void {
  const params = getSearchParams()
  if (currentUrlHasMiniProgramHint(params)) {
    rememberMiniProgram()
  }

  const miniVersion = readMiniVersionFromParams(params)
  // Read before replacing the stored version: internal H5 navigation may carry
  // only miniVersion, which is not an explicit capability revocation.
  const docxSupported = supportsDocxExport()
  const singleExportSupported = supportsSingleExportCheckout()
  if (miniVersion) {
    writeStoredValue(MINI_VERSION_STORAGE_KEY, miniVersion)
  }
  if (miniVersion || params?.has('miniDocx')) {
    writeStoredValue(MINI_DOCX_STORAGE_KEY, docxSupported ? '1' : '0')
  }
  if (miniVersion || params?.has('miniSingleExport')) {
    writeStoredValue(MINI_SINGLE_EXPORT_STORAGE_KEY, singleExportSupported ? '1' : '0')
  }
}

function readMiniVersion(): string {
  const fromParams = readMiniVersionFromParams(getSearchParams())
  if (fromParams) return fromParams
  const fromCookie = normalizeMiniVersion(readCookieValue(MINI_PROGRAM_VERSION_COOKIE))
  if (fromCookie) return fromCookie
  return normalizeMiniVersion(readStoredValue(MINI_VERSION_STORAGE_KEY))
}

function supportsDocxExport(): boolean {
  const params = getSearchParams()
  if (params?.has('miniDocx')) return params.get('miniDocx') === '1'
  const version = readMiniVersionFromParams(params)
  // A fresh native handoff without the flag is an older client. Internal H5
  // pages may reuse a version without repeating all capability flags.
  const isNativeEntry = params?.get('source') === 'mini'
    || (typeof window !== 'undefined' && /^\/m\/?$/.test(window.location.pathname))
  if (version && (isNativeEntry || version !== readStoredValue(MINI_VERSION_STORAGE_KEY))) return false
  return readStoredValue(MINI_DOCX_STORAGE_KEY) === '1'
}

function supportsSingleExportCheckout(): boolean {
  const params = getSearchParams()
  if (params?.has('miniSingleExport')) return params.get('miniSingleExport') === '1'
  const version = readMiniVersionFromParams(params)
  const isNativeEntry = params?.get('source') === 'mini'
    || (typeof window !== 'undefined' && /^\/m\/?$/.test(window.location.pathname))
  if (version && (isNativeEntry || version !== readStoredValue(MINI_VERSION_STORAGE_KEY))) return false
  return readStoredValue(MINI_SINGLE_EXPORT_STORAGE_KEY) === '1'
}

export const miniProgramRuntime: MiniProgramRuntime = {
  hasMiniProgramHint,
  hasStandaloneHint,
  rememberMiniProgram,
  rememberCurrentUrl,
  readMiniVersion,
  supportsDocxExport,
  supportsSingleExportCheckout,
}
