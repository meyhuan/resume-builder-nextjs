'use client'

import { useId, useRef, useState } from 'react'
import { Calendar, X } from 'lucide-react'
import Picker, { type PickerValue } from 'react-mobile-picker'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { cn } from '@/lib/utils'
import { monthOrdinal, parseResumeMonth } from '@/lib/resume-month'

export interface MonthPickerFieldProps {
  readonly label: string
  /** Existing resumes use both YYYY.MM and YYYY-MM. */
  readonly value: string
  readonly onValueChange: (next: string) => void
  readonly placeholder?: string
  readonly allowPresent?: boolean
  readonly required?: boolean
  readonly minValue?: string
  readonly describedBy?: string
  readonly invalid?: boolean
  readonly compact?: boolean
}

export function MonthPickerField({ label, value, onValueChange, placeholder = '选择月份', allowPresent = false,
  required, minValue = '', describedBy, invalid, compact = false }: MonthPickerFieldProps) {
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const parsed = parseResumeMonth(value)
  const now = new Date()
  const currentYear = now.getFullYear()
  const minimum = parseResumeMonth(minValue)
  const firstYear = Math.min(currentYear - 60, parsed?.year ?? currentYear, minimum?.year ?? currentYear)
  const lastYear = Math.max(currentYear + 10, parsed?.year ?? currentYear, minimum?.year ?? currentYear)
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => lastYear - i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const [pickerValue, setPickerValue] = useState<PickerValue>({ year: String(parsed?.year ?? currentYear), month: String(parsed?.month ?? now.getMonth() + 1) })
  const candidate = `${pickerValue.year}.${String(pickerValue.month).padStart(2, '0')}`
  const minOrdinal = monthOrdinal(minValue)
  const tooEarly = minOrdinal != null && (monthOrdinal(candidate) ?? 0) < minOrdinal
  const presentAllowed = minOrdinal == null || minOrdinal <= currentYear * 12 + now.getMonth()

  function openSheet() {
    // Hide the text keyboard before opening a wheel above the safe area.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    const initial = parsed ?? minimum ?? { year: currentYear, month: now.getMonth() + 1 }
    setPickerValue({ year: String(initial.year), month: String(initial.month) })
    setOpen(true)
  }
  function choose(next: string) { onValueChange(next); setOpen(false) }

  return <div>
    <div id={`${id}-label`} className="mb-1.5 flex items-center gap-1 px-1 text-sm font-medium text-slate-700">
      {label}{required && <span aria-hidden="true" className="text-xs text-rose-500">*</span>}
    </div>
    <div className={cn('flex min-h-12 items-center rounded-xl border bg-white', invalid ? 'border-rose-500' : 'border-slate-200')}>
      <button ref={trigger} type="button" aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="dialog" aria-expanded={open}
        aria-required={required || undefined} aria-invalid={invalid || undefined} aria-describedby={describedBy}
        onClick={openSheet} className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-xl px-3.5 py-3 text-left active:bg-slate-50 focus-visible:outline-2 focus-visible:outline-violet-600">
        <Calendar size={16} aria-hidden="true" className="shrink-0 text-slate-400" />
        <span id={`${id}-value`} aria-label={parsed ? `${parsed.year}年${parsed.month}月` : undefined}
          className={cn('text-base', compact && 'whitespace-nowrap tabular-nums', value ? 'text-slate-900' : 'text-slate-400')}>
          {parsed ? compact ? `${parsed.year}.${String(parsed.month).padStart(2, '0')}` : `${parsed.year}年${parsed.month}月` : value || placeholder}
        </span>
      </button>
      {value && <button type="button" onClick={() => onValueChange('')} aria-label={`清除${label}`}
        className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-400 active:bg-slate-100 focus-visible:outline-2 focus-visible:outline-violet-600"><X size={16} /></button>}
    </div>
    <BottomSheet open={open} onClose={() => setOpen(false)} title={label} height="470px"
      onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus() }}>
      <div className="overflow-hidden rounded-xl border border-slate-100">
        <Picker value={pickerValue} onChange={setPickerValue} height={224} itemHeight={44} wheelMode="natural">
          <Picker.Column name="year" role="group" aria-label="年份">
            {years.map(year => <Picker.Item key={year} value={String(year)}>{({ selected }) =>
              <span className={cn('text-lg', selected ? 'font-semibold text-violet-700' : 'text-slate-500')}>{year}年</span>}
            </Picker.Item>)}
          </Picker.Column>
          <Picker.Column name="month" role="group" aria-label="月份" data-month-column>
            {months.map(month => <Picker.Item key={month} value={String(month)}>{({ selected }) =>
              <span className={cn('text-lg', selected ? 'font-semibold text-violet-700' : 'text-slate-500')}>{month}月</span>}
            </Picker.Item>)}
          </Picker.Column>
        </Picker>
      </div>
      <p role="status" className={cn('mt-3 min-h-5 text-sm', tooEarly ? 'text-rose-600' : 'text-slate-500')}>
        {tooEarly ? '结束月份不能早于开始月份' : `已选择 ${pickerValue.year}年${Number(pickerValue.month)}月`}
      </p>
      {allowPresent && !presentAllowed && <p className="mt-1 text-xs text-slate-500">开始月份在未来，不能选择“至今”。</p>}
      <div className="mt-3 flex gap-2">
        {allowPresent && <button type="button" disabled={!presentAllowed} onClick={() => choose('至今')}
          className="min-h-12 flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 disabled:opacity-40">至今</button>}
        <button type="button" disabled={tooEarly} onClick={() => choose(value.includes('-') ? candidate.replace('.', '-') : candidate)}
          className="min-h-12 flex-1 rounded-xl bg-violet-600 py-3 text-sm font-medium text-white disabled:opacity-40">确定</button>
      </div>
    </BottomSheet>
  </div>
}
