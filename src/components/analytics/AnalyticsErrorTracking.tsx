'use client'

import { useEffect } from 'react'
import { installAnalyticsErrorTracking } from '@/lib/analytics'

export function AnalyticsErrorTracking(): null {
  useEffect(() => {
    installAnalyticsErrorTracking()
  }, [])

  return null
}
