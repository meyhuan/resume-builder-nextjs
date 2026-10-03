'use client'
import { cn } from '@/lib/utils'

export function ChoiceGroup({ id, label, options, value, onValueChange, layout = 'inline', optional = false }: {
  readonly id: string; readonly label: string; readonly options: readonly string[]
  readonly value: string; readonly onValueChange: (value: string) => void
  readonly layout?: 'inline' | 'grid'; readonly optional?: boolean
}) {
  const values = [...new Set([...options, ...(value && !options.includes(value) ? [value] : []), ''])]
  return <fieldset id={id} className="min-w-0 space-y-2" tabIndex={-1}>
    <legend className="text-sm font-medium">{label}{optional && <span className="font-normal text-muted-foreground">（选填）</span>}</legend>
    <div className={cn('gap-2', layout === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2' : 'flex flex-wrap')}>
      {values.map((option, index) => <label key={option} className="relative min-w-0 cursor-pointer">
        <input type="radio" name={id} value={option} checked={value === option} onChange={() => onValueChange(option)}
          className="peer sr-only" aria-label={`${label}：${option || '暂不填写'}`} id={`${id}-${index}`} />
        <span className={cn('flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-sm peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 active:bg-muted',
          value === option ? 'border-primary bg-muted text-primary' : 'bg-background hover:bg-muted')}>
          {layout === 'grid' && <span aria-hidden="true" className="flex size-4 shrink-0 items-center justify-center rounded-full border border-current">
            {value === option && <span className="size-2 rounded-full bg-current" />}
          </span>}
          <span className="min-w-0 break-words">{option || '暂不填写'}</span>
        </span>
      </label>)}
    </div>
  </fieldset>
}
