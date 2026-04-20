'use client'

import { type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import type { ModuleConfig } from '@/entities/module/module-config'

interface AddMoreModulesProps {
  readonly emptyModules: readonly ModuleConfig[]
}

/**
 * Compact chips area for non-required modules the user has not touched yet.
 */
export function AddMoreModules({ emptyModules }: AddMoreModulesProps): ReactElement | null {
  const router = useRouter()
  if (emptyModules.length === 0) return null
  return (
    <div className="mt-5 px-5">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          想加更多？
        </span>
        <div className="flex-1 h-px bg-slate-100" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {emptyModules.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={(): void => router.push(m.route)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-left active:scale-[0.97] active:bg-slate-50 transition-all hover:border-violet-300"
          >
            <span className="text-lg shrink-0">{m.emoji}</span>
            <span className="flex-1 min-w-0 text-sm text-slate-700 truncate">{m.label}</span>
            <Plus size={12} className="text-slate-400 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}
