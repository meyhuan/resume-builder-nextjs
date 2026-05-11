export interface FeedbackDiagnostics {
  readonly url: string
  readonly path: string
  readonly referrer: string
  readonly userAgent: string
  readonly platform: string
  readonly language: string
  readonly viewport: {
    readonly width: number
    readonly height: number
  }
  readonly screen: {
    readonly width: number
    readonly height: number
  }
  readonly timezone: string
  readonly authCookieExists: boolean
  readonly loginInfo: FeedbackLoginInfo | null
  readonly createdAt: string
}

export interface FeedbackLoginInfo {
  readonly authUid: string | null
  readonly userId: string | null
  readonly name: string | null
  readonly email: string | null
  readonly hasToken: boolean
}

function hasCookie(name: string): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.split(';').some((part: string): boolean => part.trim().startsWith(`${name}=`))
}

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null
  const prefix: string = `${name}=`
  const cookie: string | undefined = document.cookie.split(';').map((part: string): string => part.trim()).find((part: string): boolean => part.startsWith(prefix))
  if (!cookie) return null
  return decodeURIComponent(cookie.slice(prefix.length))
}

function readAuthStorageUserInfo(): Partial<FeedbackLoginInfo> {
  try {
    const raw: string | null = window.localStorage.getItem('auth-storage')
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    const state = (parsed as { readonly state?: { readonly userInfo?: unknown } }).state
    const userInfo: unknown = state?.userInfo
    if (!userInfo || typeof userInfo !== 'object') return {}
    const user = userInfo as { readonly id?: unknown; readonly name?: unknown; readonly email?: unknown }
    return {
      userId: typeof user.id === 'string' ? user.id : null,
      name: typeof user.name === 'string' ? user.name : null,
      email: typeof user.email === 'string' ? user.email : null,
    }
  } catch {
    return {}
  }
}

function collectLoginInfo(): FeedbackLoginInfo | null {
  const authUid: string | null = getCookieValue('auth_uid')
  const hasToken: boolean = Boolean(window.localStorage.getItem('token'))
  const userInfo: Partial<FeedbackLoginInfo> = readAuthStorageUserInfo()
  if (!authUid && !hasToken && !userInfo.userId) return null
  return {
    authUid,
    userId: userInfo.userId ?? null,
    name: userInfo.name ?? null,
    email: userInfo.email ?? null,
    hasToken,
  }
}

export function collectFeedbackDiagnostics(): FeedbackDiagnostics {
  const timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  return {
    url: window.location.href,
    path: window.location.pathname,
    referrer: document.referrer,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    screen: {
      width: window.screen.width,
      height: window.screen.height,
    },
    timezone,
    authCookieExists: hasCookie('auth_uid') || hasCookie('wxId'),
    loginInfo: collectLoginInfo(),
    createdAt: new Date().toISOString(),
  }
}
