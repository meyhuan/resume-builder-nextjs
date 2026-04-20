'use client'

import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { cn } from '@/lib/utils'

export interface AutocompleteFieldProps {
  readonly label: string
  readonly value: string
  readonly onValueChange: (next: string) => void
  readonly options: readonly string[]
  readonly placeholder?: string
  readonly tip?: string
  readonly required?: boolean
  readonly maxResults?: number
  readonly allowFree?: boolean
}

/**
 * Text field with a dropdown list of fuzzy-matched suggestions.
 * Suggestions are filtered client-side.
 */
export function AutocompleteField(props: AutocompleteFieldProps): ReactElement {
  const {
    label,
    value,
    onValueChange,
    options,
    placeholder,
    tip,
    required,
    maxResults = 8,
    allowFree = true,
  } = props
  const [open, setOpen] = useState<boolean>(false)
  const ref = useRef<HTMLDivElement>(null)

  const matches: readonly string[] = useMemo((): readonly string[] => {
    const q: string = value.trim().toLowerCase()
    if (!q) return options.slice(0, maxResults)
    return options.filter((o) => o.toLowerCase().includes(q)).slice(0, maxResults)
  }, [value, options, maxResults])

  useEffect(() => {
    const onDocDown = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocDown)
    return (): void => document.removeEventListener('mousedown', onDocDown)
  }, [])

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-1 mb-1.5 px-1">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {required && <span className="text-rose-500 text-xs">*</span>}
      </div>
      <div
        className={cn(
          'flex items-center rounded-xl border bg-white px-3.5 py-3 transition-all',
          'focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-100 border-slate-200',
        )}
      >
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onFocus={(): void => setOpen(true)}
          onChange={(e): void => {
            onValueChange(e.target.value)
            setOpen(true)
          }}
          onKeyDown={(e): void => {
            if (e.key === 'Enter' && matches.length > 0) {
              e.preventDefault()
              onValueChange(matches[0])
              setOpen(false)
            }
          }}
          className="flex-1 bg-transparent outline-none text-[15px] text-slate-900 placeholder:text-slate-400"
        />
      </div>
      {open && matches.length > 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {matches.map((m) => (
            <button
              key={m}
              type="button"
              onClick={(): void => {
                onValueChange(m)
                setOpen(false)
              }}
              className="w-full px-3.5 py-2.5 text-left text-[15px] text-slate-700 hover:bg-violet-50 border-b border-slate-100 last:border-b-0"
            >
              {m}
            </button>
          ))}
          {allowFree && value.trim() && !matches.includes(value.trim()) && (
            <button
              type="button"
              onClick={(): void => setOpen(false)}
              className="w-full px-3.5 py-2.5 text-left text-sm text-violet-600 bg-violet-50/50"
            >
              使用「{value}」
            </button>
          )}
        </div>
      )}
      {tip && <div className="mt-1 px-1 text-xs text-slate-400">💡 {tip}</div>}
    </div>
  )
}
