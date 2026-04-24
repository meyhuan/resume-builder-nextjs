'use client'

import { type ReactElement, type ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCookie } from 'cookies-next'
import { Loader2 } from 'lucide-react'

/**
 * Mobile edit layout: guards all /m/edit/* routes with auth_uid cookie.
 * Unauthenticated users are redirected to /login?redirect=/m/edit.
 */
export default function MobileEditLayout({ children }: { readonly children: ReactNode }): ReactElement {
  const router = useRouter()
  // Always start in `checking` so SSR and the first client render match.
  // Cookie resolution happens after mount inside `useEffect`.
  const [authState, setAuthState] = useState<'checking' | 'authed' | 'guest'>('checking')

  useEffect((): void => {
    const uid: string | undefined = getCookie('auth_uid') as string | undefined
    if (uid) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthState('authed')
      return
    }
    setAuthState('guest')
    router.replace('/login?redirect=/m/edit')
  }, [router])

  if (authState !== 'authed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        <Loader2 className="animate-spin" size={20} />
        <span className="ml-2 text-sm">{authState === 'checking' ? '加载中…' : '跳转到登录…'}</span>
      </div>
    )
  }

  return <>{children}</>
}
