'use client'

import { useId } from 'react'
import { MonthPickerField } from './month-picker-field'
import { monthRangeError } from '@/lib/resume-month'

export function MonthRangeField({ start, end, onStartChange, onEndChange }: {
  readonly start: string; readonly end: string
  readonly onStartChange: (next: string) => void; readonly onEndChange: (next: string) => void
}) {
  const errorId = useId()
  const error = monthRangeError(start, end)
  return <div>
    <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
      <MonthPickerField label="开始时间" value={start} onValueChange={onStartChange} required compact />
      <MonthPickerField label="结束时间" value={end} onValueChange={onEndChange} allowPresent minValue={start}
        invalid={!!error} describedBy={error ? errorId : undefined} compact />
    </div>
    {error && <p id={errorId} role="alert" className="mt-2 px-1 text-sm text-rose-600">{error}</p>}
  </div>
}
