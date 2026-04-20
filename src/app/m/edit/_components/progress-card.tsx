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
    <div className="mx-5 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 p-5 text-white shadow-lg shadow-violet-500/20 relative overflow-hidden">
      <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
      <div className="relative flex items-center justify-between">
        <div>
          <div className="text-sm opacity-90">简历完成度</div>
          <div className="mt-1 text-3xl font-bold tracking-tight">{safeProgress}%</div>
        </div>
        <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <Sparkles size={20} className="text-white" />
        </div>
      </div>
      <div className="relative mt-4 h-2 rounded-full bg-white/25 overflow-hidden">
        <div
          className="h-full bg-white rounded-full transition-all duration-700 ease-out"
          style={{ width: `${safeProgress}%` }}
        />
      </div>
      <div className="relative mt-3 text-xs opacity-95">{encouragement}</div>
    </div>
  )
}
