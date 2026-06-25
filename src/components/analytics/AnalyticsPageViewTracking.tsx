'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { track } from '@/lib/analytics'

export function AnalyticsPageViewTracking(): null {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/print')) return
    track('page_view', {
      entry: 'web_auto_page_view',
      pageName: pathname,
    })
  }, [pathname])

  return null
}
