'use client'

import { type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ModuleConfig } from '@/entities/module/module-config'
import type { ModuleInfo } from '@/features/edit/progress/module-completeness'

interface ModuleCardProps {
  readonly module: ModuleConfig
  readonly info: ModuleInfo
}

/**
 * Tap to navigate into a module's edit screen.
 * Shows completion status and a one-line summary.
 */
export function ModuleCard({ module, info }: ModuleCardProps): ReactElement {
  const router = useRouter()
  const statusIcon: ReactElement = (() => {
    if (info.status === 'complete') {
      return (
        <span className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
          <Check size={14} strokeWidth={3} />
        </span>
      )
    }
    if (info.status === 'partial') {
      return (
        <span className="h-6 w-6 rounded-full bg-amber-400 text-white flex items-center justify-center">
          <AlertCircle size={14} />
        </span>
      )
    }
    return (
      <span className={cn(
        'h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium',
        module.required ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-400',
      )}>
        {module.required ? '!' : '+'}
      </span>
    )
  })()

  const handleClick = (): void => {
    // Haptic feedback on supported devices.
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(8)
    }
    router.push(module.route)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'w-full rounded-2xl bg-white border border-slate-200 px-4 py-3.5 text-left',
        'flex items-center gap-3 transition-all duration-150',
        'hover:border-violet-300 hover:shadow-md hover:-translate-y-0.5',
        'active:scale-[0.98] active:shadow-sm',
      )}
    >
      <div className="text-2xl shrink-0 w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
        {module.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900 truncate">{module.label}</span>
          {module.required && info.status !== 'complete' && (
            <span className="text-[10px] text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">必填</span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-slate-500 truncate">{info.summary}</div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {statusIcon}
        <ChevronRight size={16} className="text-slate-300" />
      </div>
    </button>
  )
}
