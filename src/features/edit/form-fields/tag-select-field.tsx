'use client'

import { type ReactElement } from 'react'
import { cn } from '@/lib/utils'

export interface TagSelectFieldProps {
  readonly label: string
  readonly options: readonly string[]
  readonly value: string
  readonly onValueChange: (next: string) => void
  readonly tip?: string
  readonly required?: boolean
  readonly allowClear?: boolean
}

/**
 * Horizontal pill-style single-select for short lists of options.
 */
export function TagSelectField(props: TagSelectFieldProps): ReactElement {
  const { label, options, value, onValueChange, tip, required, allowClear = true } = props
  return (
    <div>
      <div className="flex items-center gap-1 mb-1.5 px-1">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {required && <span className="text-rose-500 text-xs">*</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active: boolean = opt === value
          return (
            <button
              key={opt}
              type="button"
              onClick={(): void => {
                if (active && allowClear) {
                  onValueChange('')
                } else {
                  onValueChange(opt)
                }
              }}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-sm border transition-all active:scale-95',
                active
                  ? 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-600/20'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-violet-300',
              )}
            >
              {opt}
            </button>
          )
        })}
      </div>
      {tip && <div className="mt-1.5 px-1 text-xs text-slate-400">💡 {tip}</div>}
    </div>
  )
}
