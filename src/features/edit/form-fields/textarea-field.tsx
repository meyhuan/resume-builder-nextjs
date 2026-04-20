'use client'

import { type ReactElement, type TextareaHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type BaseProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'>

export interface TextareaFieldProps extends BaseProps {
  readonly label: string
  readonly value: string
  readonly onValueChange: (next: string) => void
  readonly tip?: string
  readonly required?: boolean
  readonly error?: string
  readonly minRows?: number
  readonly toolbar?: ReactNode
}

/**
 * Auto-growing textarea field with optional toolbar (e.g. AI assist).
 */
export function TextareaField(props: TextareaFieldProps): ReactElement {
  const { label, value, onValueChange, tip, required, error, toolbar, minRows = 4, className, ...rest } = props
  return (
    <label className="block">
      <div className="flex items-center gap-1 mb-1.5 px-1">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {required && <span className="text-rose-500 text-xs">*</span>}
      </div>
      <div
        className={cn(
          'rounded-xl border bg-white transition-all',
          'focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-100',
          error ? 'border-rose-400' : 'border-slate-200',
        )}
      >
        <textarea
          {...rest}
          rows={minRows}
          value={value}
          onChange={(e): void => onValueChange(e.target.value)}
          className={cn(
            'w-full bg-transparent outline-none text-[15px] text-slate-900 placeholder:text-slate-400',
            'px-3.5 py-3 resize-none',
            className,
          )}
        />
        {toolbar && <div className="border-t border-slate-100 px-2 py-1.5">{toolbar}</div>}
      </div>
      {error && <div className="mt-1 px-1 text-xs text-rose-500">{error}</div>}
      {!error && tip && <div className="mt-1 px-1 text-xs text-slate-400">💡 {tip}</div>}
    </label>
  )
}
