import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * MonthPicker component for selecting year and month
 * Based on shadcn-ui-monthpicker
 */
export interface MonthPickerProps {
  readonly selectedMonth?: Date
  readonly onMonthSelect: (date: Date) => void
  readonly minDate?: Date
  readonly maxDate?: Date
  readonly className?: string
}

const MONTHS: ReadonlyArray<{ number: number; name: string }> = [
  { number: 1, name: '一月' },
  { number: 2, name: '二月' },
  { number: 3, name: '三月' },
  { number: 4, name: '四月' },
  { number: 5, name: '五月' },
  { number: 6, name: '六月' },
  { number: 7, name: '七月' },
  { number: 8, name: '八月' },
  { number: 9, name: '九月' },
  { number: 10, name: '十月' },
  { number: 11, name: '十一月' },
  { number: 12, name: '十二月' },
]

const DEFAULT_MIN_YEAR: number = 1980
const DEFAULT_MAX_YEAR: number = 2050
const YEAR_PAGE_SIZE: number = 8
const COMPACT_CONTAINER_PADDING_CLASS: string = 'p-2'
const HEADER_SPACING_CLASS: string = 'mb-2'
const YEAR_GRID_GAP_CLASS: string = 'gap-1.5'
const MONTH_GRID_GAP_CLASS: string = 'gap-1.5'
const YEAR_RANGE_TEXT_CLASS: string = 'text-sm font-semibold'
const YEAR_BUTTON_CLASS: string = 'h-8 px-2 text-sm'
const MONTH_BUTTON_CLASS: string = 'h-8 px-2 text-sm'

function getYearBounds(minDate?: Date, maxDate?: Date): { minYear: number; maxYear: number } {
  const minYear: number = minDate?.getFullYear() ?? DEFAULT_MIN_YEAR
  const maxYear: number = maxDate?.getFullYear() ?? DEFAULT_MAX_YEAR
  return {
    minYear,
    maxYear: Math.max(minYear, maxYear),
  }
}

function clampYear(year: number, minYear: number, maxYear: number): number {
  return Math.min(Math.max(year, minYear), maxYear)
}

function computePageStart(year: number, minYear: number, maxYear: number): number {
  const clampedYear = clampYear(year, minYear, maxYear)
  const range = maxYear - minYear + 1
  if (range <= YEAR_PAGE_SIZE) return minYear
  const offset = (clampedYear - minYear) % YEAR_PAGE_SIZE
  const start = clampedYear - offset
  const maxStart = maxYear - YEAR_PAGE_SIZE + 1
  return Math.min(Math.max(start, minYear), maxStart)
}

export function MonthPicker(props: MonthPickerProps): React.ReactElement {
  const { selectedMonth, onMonthSelect, minDate, maxDate, className } = props

  const { minYear, maxYear } = React.useMemo(() => getYearBounds(minDate, maxDate), [minDate, maxDate])

  const initialYear = React.useMemo(() => {
    const baseYear = selectedMonth?.getFullYear() ?? new Date().getFullYear()
    return clampYear(baseYear, minYear, maxYear)
  }, [selectedMonth, minYear, maxYear])

  const [displayYear, setDisplayYear] = React.useState<number>(initialYear)
  const [yearPageStart, setYearPageStart] = React.useState<number>(() => computePageStart(initialYear, minYear, maxYear))

  const selectedYear: number | undefined = selectedMonth?.getFullYear()
  const selectedMonthNum: number | undefined = selectedMonth ? selectedMonth.getMonth() + 1 : undefined

  function handleMonthClick(monthNum: number): void {
    const newDate = new Date(displayYear, monthNum - 1, 1)
    onMonthSelect(newDate)
  }

  function handleYearSelect(year: number): void {
    const clamped = clampYear(year, minYear, maxYear)
    setDisplayYear(clamped)
    setYearPageStart(computePageStart(clamped, minYear, maxYear))
  }

  function handleYearPageBackward(): void {
    setYearPageStart((prev) => {
      if (prev <= minYear) return prev
      const nextStart = prev - YEAR_PAGE_SIZE
      return Math.max(nextStart, minYear)
    })
  }

  function handleYearPageForward(): void {
    setYearPageStart((prev) => {
      const maxStart = computePageStart(maxYear, minYear, maxYear)
      if (prev >= maxStart) return prev
      const nextStart = prev + YEAR_PAGE_SIZE
      return Math.min(nextStart, maxStart)
    })
  }

  function isMonthDisabled(monthNum: number): boolean {
    const date = new Date(displayYear, monthNum - 1, 1)
    if (minDate && date < new Date(minDate.getFullYear(), minDate.getMonth(), 1)) {
      return true
    }
    if (maxDate && date > new Date(maxDate.getFullYear(), maxDate.getMonth(), 1)) {
      return true
    }
    return false
  }

  function isMonthSelected(monthNum: number): boolean {
    return selectedYear === displayYear && selectedMonthNum === monthNum
  }

  return (
    <div className={cn(COMPACT_CONTAINER_PADDING_CLASS, className)}>
      <div className={cn('flex items-center justify-between', HEADER_SPACING_CLASS)}>
        <Button
          variant="outline"
          size="icon"
          onClick={handleYearPageBackward}
          type="button"
          disabled={yearPageStart <= minYear}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <div className={YEAR_RANGE_TEXT_CLASS}>
          {yearPageStart} - {Math.min(yearPageStart + YEAR_PAGE_SIZE - 1, maxYear)}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleYearPageForward}
          type="button"
          disabled={yearPageStart >= computePageStart(maxYear, minYear, maxYear)}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className={cn('grid grid-cols-4', YEAR_GRID_GAP_CLASS, 'mb-3')}>
        {Array.from({ length: YEAR_PAGE_SIZE }).map((_, index) => {
          const year = yearPageStart + index
          if (year > maxYear) return null
          const disabled = year < minYear || year > maxYear
          const selected = year === displayYear

          return (
            <Button
              key={year}
              variant={selected ? 'default' : 'outline'}
              onClick={() => handleYearSelect(year)}
              disabled={disabled}
              type="button"
              className={cn(YEAR_BUTTON_CLASS, selected && 'bg-primary text-primary-foreground')}
            >
              {year}
            </Button>
          )
        })}
      </div>

      <div className={cn('grid grid-cols-3', MONTH_GRID_GAP_CLASS)}>
        {MONTHS.map((month) => {
          const disabled = isMonthDisabled(month.number)
          const selected = isMonthSelected(month.number)
          
          return (
            <Button
              key={month.number}
              variant={selected ? 'default' : 'outline'}
              onClick={() => handleMonthClick(month.number)}
              disabled={disabled}
              type="button"
              className={cn(
                MONTH_BUTTON_CLASS,
                selected && 'bg-primary text-primary-foreground'
              )}
            >
              {month.name}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
