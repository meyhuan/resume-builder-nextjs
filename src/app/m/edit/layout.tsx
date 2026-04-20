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
  const [authState] = useState<'checking' | 'authed' | 'guest'>(() => {
    if (typeof document === 'undefined') return 'checking'
    const uid: string | undefined = getCookie('auth_uid') as string | undefined
    return uid ? 'authed' : 'guest'
  })

  useEffect((): void => {
    if (authState === 'guest') {
      router.replace('/login?redirect=/m/edit')
    }
  }, [authState, router])

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
