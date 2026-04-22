'use client'

import { type ReactElement } from 'react'
import { Sparkles } from 'lucide-react'
import { getEncouragement } from '@/features/edit/greeting/use-time-greeting'

interface ProgressCardProps {
  readonly progress: number
}

/**
 * Gradient progress card with percentage bar and encouragement text.
 */
export function ProgressCard({ progress }: ProgressCardProps): ReactElement {
  const encouragement: string = getEncouragement(progress)
  const safeProgress: number = Math.max(0, Math.min(100, progress))
  return (
    <div className="mx-5 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 px-4 py-3 text-white shadow-lg shadow-violet-500/20 relative overflow-hidden">
      <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
      <div className="relative flex items-center gap-3">
        <Sparkles size={16} className="text-white shrink-0" />
        <div className="flex items-baseline gap-1.5 min-w-0 flex-1">
          <span className="text-[12px] opacity-90 shrink-0">完成度</span>
          <span className="text-xl font-bold tracking-tight">{safeProgress}%</span>
          <span className="text-[11px] opacity-90 truncate">· {encouragement}</span>
        </div>
      </div>
      <div className="relative mt-2 h-1.5 rounded-full bg-white/25 overflow-hidden">
        <div
          className="h-full bg-white rounded-full transition-all duration-700 ease-out"
          style={{ width: `${safeProgress}%` }}
        />
      </div>
    </div>
  )
}
