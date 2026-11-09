'use client'

import { useEffect } from 'react'
import { loadMiniMembershipPlans } from '@/lib/mini-membership-plans'
import { loadMiniSingleExport } from '@/lib/mini-single-export'

/** Warm the same catalogue used by the export sheet without blocking editing. */
export function usePreloadMiniMembershipPlans(enabled: boolean): void {
  useEffect(() => {
    if (enabled) void loadMiniMembershipPlans().catch(() => { /* Retry visibly when the sheet opens. */ })
    if (enabled) void loadMiniSingleExport().catch(() => { /* Retry visibly when the sheet opens. */ })
  }, [enabled])
}
