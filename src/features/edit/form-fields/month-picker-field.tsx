'use client'

import { useState, type ReactElement, type ReactNode } from 'react'
import { Calendar, X } from 'lucide-react'
import Picker, { type PickerValue } from 'react-mobile-picker'
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

type MonthPickerValue = PickerValue & {
  readonly year: string
  readonly month: string
}

function parseMonthValue(value: string): { year: number; month: number } | null {
  if (!value || value === '至今') return null
  const match: RegExpMatchArray | null = value.match(/^(\d{4})-(\d{2})$/)
  if (!match) return null

  const year: number = Number(match[1])
  const month: number = Number(match[2])
  if (!Number.isInteger(year) || !MONTHS.includes(month)) return null

  return { year, month }
}

/**
 * Mobile month picker with a stable two-column year/month selector.
 */
export function MonthPickerField(props: MonthPickerFieldProps): ReactElement {
  const { label, value, onValueChange, placeholder = '选择月份', allowPresent = false, required } = props
  const [open, setOpen] = useState<boolean>(false)
  const parsed: { year: number; month: number } | null = parseMonthValue(value)
  const [pickerValue, setPickerValue] = useState<MonthPickerValue>({
    year: String(parsed?.year ?? CURRENT_YEAR),
    month: String(parsed?.month ?? new Date().getMonth() + 1),
  })

  const openSheet = (): void => {
    if (parsed) {
      setPickerValue({ year: String(parsed.year), month: String(parsed.month) })
    } else {
      setPickerValue({ year: String(CURRENT_YEAR), month: String(new Date().getMonth() + 1) })
    }
    setOpen(true)
  }

  const confirm = (): void => {
    const mm: string = String(pickerValue.month).padStart(2, '0')
    onValueChange(`${pickerValue.year}-${mm}`)
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
            onKeyDown={(e): void => { e.stopPropagation() }}
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
        <div className="relative overflow-hidden rounded-xl border border-slate-100 bg-white">
          <Picker
            value={pickerValue}
            onChange={setPickerValue}
            height={224}
            itemHeight={40}
            wheelMode="natural"
            className="relative z-20"
          >
            <Picker.Column name="year">
              {YEARS.map((year) => (
                <Picker.Item key={year} value={String(year)}>
                  {({ selected }): ReactElement => (
                    <PickerItemContent selected={selected}>{year}年</PickerItemContent>
                  )}
                </Picker.Item>
              ))}
            </Picker.Column>
            <Picker.Column name="month">
              {MONTHS.map((month) => (
                <Picker.Item key={month} value={String(month)}>
                  {({ selected }): ReactElement => (
                    <PickerItemContent selected={selected}>{month}月</PickerItemContent>
                  )}
                </Picker.Item>
              ))}
            </Picker.Column>
          </Picker>
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

function PickerItemContent({ selected, children }: { readonly selected: boolean; readonly children: ReactNode }): ReactElement {
  return (
    <div
      className={cn(
        'flex h-10 items-center justify-center text-[17px] transition-colors',
        selected ? 'font-semibold text-violet-700' : 'font-normal text-slate-500',
      )}
    >
      {children}
    </div>
  )
}
