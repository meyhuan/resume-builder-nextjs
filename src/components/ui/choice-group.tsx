'use client'
import { cn } from '@/lib/utils'

export function ChoiceGroup({ id, label, options, value, onValueChange }: {
  readonly id: string; readonly label: string; readonly options: readonly string[]
  readonly value: string; readonly onValueChange: (value: string) => void
}) {
  const values = [...new Set([...options, ...(value && !options.includes(value) ? [value] : []), ''])]
  return <fieldset id={id} className="min-w-0 space-y-2" tabIndex={-1}>
    <legend className="text-sm font-medium">{label}</legend>
    <div className="flex flex-wrap gap-2">
      {values.map((option, index) => <label key={option} className="relative cursor-pointer">
        <input type="radio" name={id} value={option} checked={value === option} onChange={() => onValueChange(option)}
          className="peer sr-only" aria-label={`${label}：${option || '暂不填写'}`} id={`${id}-${index}`} />
        <span className={cn('flex min-h-11 items-center rounded-md border px-3 text-sm peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 active:bg-muted',
          value === option ? 'border-primary bg-muted text-primary' : 'bg-background hover:bg-muted')}>{option || '暂不填写'}</span>
      </label>)}
    </div>
  </fieldset>
}
