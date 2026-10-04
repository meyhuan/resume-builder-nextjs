'use client'

import { useId } from 'react'
import { EmailInput } from '@/components/ui/email-input'

export function EmailField({ value, onValueChange, required }: {
  readonly value: string
  readonly onValueChange: (next: string) => void
  readonly required?: boolean
}) {
  const id = useId()
  return <div>
    <label htmlFor={id} className="mb-1.5 flex items-center gap-1 px-1 text-sm font-medium text-slate-700">
      邮箱{required && <span aria-hidden="true" className="text-xs text-rose-500">*</span>}
    </label>
    <EmailInput id={id} value={value} onValueChange={onValueChange} required={required}
      className="h-auto min-h-12 rounded-xl border-slate-200 bg-white px-3.5 py-3 text-base shadow-none focus-visible:border-violet-500 focus-visible:ring-4 focus-visible:ring-violet-100" />
  </div>
}
