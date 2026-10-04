'use client'

import { useId, useMemo, type ReactElement } from 'react'
import { AutocompleteInput, type AutocompleteOption } from '@/components/ui/autocomplete-input'

export interface AutocompleteFieldProps {
  readonly label: string
  readonly value: string
  readonly onValueChange: (next: string) => void
  readonly options: readonly string[] | readonly AutocompleteOption[]
  readonly placeholder?: string
  readonly tip?: string
  readonly required?: boolean
  readonly maxResults?: number
  readonly allowFree?: boolean
}

/** Mobile field styling around the same suggestion behavior used in the PC editor. */
export function AutocompleteField({ label, value, onValueChange, options, placeholder, tip, required, maxResults = 8, allowFree = true }: AutocompleteFieldProps): ReactElement {
  const id = useId()
  const suggestions = useMemo(() => options.map(option => typeof option === 'string'
    ? { value: option, label: option } : option), [options])
  return <div>
    <label htmlFor={id} className="mb-1.5 flex items-center gap-1 px-1 text-sm font-medium text-slate-700">
      {label}{required && <span className="text-rose-500 text-xs" aria-hidden="true">*</span>}
    </label>
    <AutocompleteInput id={id} aria-required={required || undefined} aria-describedby={tip ? `${id}-tip` : undefined}
      value={value} onValueChange={onValueChange} options={suggestions} placeholder={placeholder}
      maxResults={maxResults} allowCustom={allowFree} listLabel={`${label}建议`}
      className="h-auto min-h-12 rounded-xl border-slate-200 bg-white py-3 pl-3.5 text-base shadow-none focus-visible:border-violet-500 focus-visible:ring-4 focus-visible:ring-violet-100" />
    {tip && <div id={`${id}-tip`} className="mt-1 px-1 text-xs text-slate-400">{tip}</div>}
  </div>
}
