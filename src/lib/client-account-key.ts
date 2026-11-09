import { getCookie } from 'cookies-next'

/** Match the cookie identity used by API requests, including mini-program SSO. */
export function clientAccountKey(profileId?: string | null): string {
  if (typeof window !== 'undefined') {
    try {
      const uid = getCookie('auth_uid')
      if (typeof uid === 'string' && uid) return `wx:${uid}`
    } catch { return '' }
  }
  return profileId ? `user:${profileId}` : ''
}
