'use client'

import { type ReactElement, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type BaseInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>

export interface TextFieldProps extends BaseInputProps {
  readonly label: string
  readonly value: string
  readonly onValueChange: (next: string) => void
  readonly tip?: string
  readonly required?: boolean
  readonly error?: string
  readonly suffix?: ReactElement
}

/**
 * Mobile-friendly text input with floating label, focus ring and optional tip.
 */
export function TextField(props: TextFieldProps): ReactElement {
  const { label, value, onValueChange, tip, required, error, suffix, className, ...rest } = props
  return (
    <label className="block">
      <div className="flex items-center gap-1 mb-1.5 px-1">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {required && <span className="text-rose-500 text-xs">*</span>}
      </div>
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border bg-white px-3.5 py-3 transition-all',
          'focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-100',
          error ? 'border-rose-400' : 'border-slate-200',
        )}
      >
        <input
          {...rest}
          value={value}
          onChange={(e): void => onValueChange(e.target.value)}
          className={cn(
            'flex-1 bg-transparent outline-none text-[15px] text-slate-900 placeholder:text-slate-400',
            className,
          )}
        />
        {suffix}
      </div>
      {error && <div className="mt-1 px-1 text-xs text-rose-500">{error}</div>}
      {!error && tip && <div className="mt-1 px-1 text-xs text-slate-400">💡 {tip}</div>}
    </label>
  )
}
