'use client'

import { type ReactElement } from 'react'
import { useTimeGreeting } from '@/features/edit/greeting/use-time-greeting'

interface GreetingBannerProps {
  readonly name?: string
}

/**
 * Time-based greeting shown at the top of the edit home.
 */
export function GreetingBanner({ name }: GreetingBannerProps): ReactElement {
  const { text, emoji } = useTimeGreeting()
  const displayName: string = name?.trim() || '同学'
  return (
    <div className="px-5 pt-5 pb-2">
      <h1 className="text-xl font-semibold text-slate-900 leading-snug">
        {text}，{displayName} <span className="inline-block animate-wiggle">{emoji}</span>
      </h1>
    </div>
  )
}
