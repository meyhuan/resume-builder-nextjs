'use client'

import { useEffect, useRef, useState, type ReactElement } from 'react'
import { Calendar, Check, X } from 'lucide-react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { cn } from '@/lib/utils'

export interface MonthPickerFieldProps {
  readonly label: string
  /** YYYY-MM string, or empty, or '至今' for current. */
  readonly value: string
  readonly onValueChange: (next: string) => void
  readonly placeholder?: string
  readonly allowPresent?: boolean
  readonly required?: boolean
}

const CURRENT_YEAR: number = new Date().getFullYear()
// Range: 60 years back ~ 10 years forward. Future years are needed for
// expected-graduation dates and planned role changes.
const YEAR_PAST_SPAN: number = 60
const YEAR_FUTURE_SPAN: number = 10
const YEARS: readonly number[] = Array.from(
  { length: YEAR_PAST_SPAN + YEAR_FUTURE_SPAN + 1 },
  (_, i) => CURRENT_YEAR + YEAR_FUTURE_SPAN - i,
)
const MONTHS: readonly number[] = Array.from({ length: 12 }, (_, i) => i + 1)

/**
 * Mobile month picker with bottom-sheet scrollable columns.
 */
export function MonthPickerField(props: MonthPickerFieldProps): ReactElement {
  const { label, value, onValueChange, placeholder = '选择月份', allowPresent = false, required } = props
  const [open, setOpen] = useState<boolean>(false)
  const isPresent: boolean = value === '至今'
  const parsed: { year: number; month: number } | null = (() => {
    if (!value || isPresent) return null
    const [y, m] = value.split('-').map((s) => parseInt(s, 10))
    if (!y || !m) return null
    return { year: y, month: m }
  })()
  const [tempYear, setTempYear] = useState<number>(parsed?.year ?? CURRENT_YEAR)
  const [tempMonth, setTempMonth] = useState<number>(parsed?.month ?? new Date().getMonth() + 1)

  const openSheet = (): void => {
    if (parsed) {
      setTempYear(parsed.year)
      setTempMonth(parsed.month)
    }
    setOpen(true)
  }

  const confirm = (): void => {
    const mm: string = String(tempMonth).padStart(2, '0')
    onValueChange(`${tempYear}-${mm}`)
    setOpen(false)
  }

  const displayText: string = value || placeholder

  return (
    <div>
      <div className="flex items-center gap-1 mb-1.5 px-1">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {required && <span className="text-rose-500 text-xs">*</span>}
      </div>
      <div
        role="button"
        tabIndex={0}
        onClick={openSheet}
        onKeyDown={(e): void => { if (e.key === 'Enter' || e.key === ' ') openSheet() }}
        className={cn(
          'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3',
          'flex items-center justify-between text-left active:bg-slate-50 transition-colors cursor-pointer',
        )}
      >
        <span className="flex items-center gap-2">
          <Calendar size={16} className="text-slate-400" />
          <span className={cn('text-[15px]', value ? 'text-slate-900' : 'text-slate-400')}>{displayText}</span>
        </span>
        {value && (
          <button
            type="button"
            onClick={(e): void => {
              e.stopPropagation()
              onValueChange('')
            }}
            className="h-6 w-6 rounded flex items-center justify-center text-slate-400 hover:bg-slate-100"
            aria-label="清除"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <BottomSheet open={open} onClose={(): void => setOpen(false)} title={label} height="420px">
        <div className="flex gap-3 h-56 relative">
          {/* Centered selection band — iOS wheel-picker inspiration. */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 rounded-lg bg-violet-500/5 border-y border-violet-200/60" />
          <ScrollColumn label="年" options={YEARS} value={tempYear} onChange={setTempYear} suffix="年" />
          <ScrollColumn label="月" options={MONTHS} value={tempMonth} onChange={setTempMonth} suffix="月" />
        </div>
        <div className="mt-4 flex gap-2">
          {allowPresent && (
            <button
              type="button"
              onClick={(): void => {
                onValueChange('至今')
                setOpen(false)
              }}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium active:scale-95 transition-transform"
            >
              至今
            </button>
          )}
          <button
            type="button"
            onClick={confirm}
            className="flex-1 py-3 rounded-xl bg-violet-600 text-white text-sm font-medium active:scale-95 transition-transform"
          >
            确定
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}

interface ScrollColumnProps {
  readonly label: string
  readonly options: readonly number[]
  readonly value: number
  readonly onChange: (next: number) => void
  readonly suffix?: string
}

function ScrollColumn({ label, options, value, onChange, suffix }: ScrollColumnProps): ReactElement {
  const listRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  // Auto-scroll the active option into view when the sheet opens or value changes.
  useEffect((): void => {
    const el: HTMLButtonElement | null = selectedRef.current
    const container: HTMLDivElement | null = listRef.current
    if (!el || !container) return
    const offset: number = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2
    container.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' })
  }, [value])

  return (
    <div className="flex-1 flex flex-col">
      <div className="text-xs text-slate-400 text-center mb-1.5">{label}</div>
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white scroll-smooth"
      >
        {options.map((opt) => {
          const active: boolean = opt === value
          return (
            <button
              key={opt}
              ref={active ? selectedRef : undefined}
              type="button"
              onClick={(): void => onChange(opt)}
              className={cn(
                'w-full px-3 py-2.5 flex items-center justify-center gap-1.5 text-sm transition-all',
                active
                  ? 'bg-violet-50 text-violet-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50',
              )}
            >
              <span>{opt}{suffix}</span>
              {active && <Check size={14} className="text-violet-600" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
