import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * MonthPicker component for selecting year and month
 * Based on shadcn-ui-monthpicker
 */
export interface MonthPickerProps {
  readonly selectedMonth?: Date;
  readonly onMonthSelect: (date: Date) => void;
  readonly minDate?: Date;
  readonly maxDate?: Date;
  readonly className?: string;
}

const MONTHS: ReadonlyArray<{ number: number; name: string }> = [
  { number: 1, name: "1月" },
  { number: 2, name: "2月" },
  { number: 3, name: "3月" },
  { number: 4, name: "4月" },
  { number: 5, name: "5月" },
  { number: 6, name: "6月" },
  { number: 7, name: "7月" },
  { number: 8, name: "8月" },
  { number: 9, name: "9月" },
  { number: 10, name: "10月" },
  { number: 11, name: "11月" },
  { number: 12, name: "12月" },
];

const DEFAULT_MIN_YEAR: number = 1980;
const DEFAULT_MAX_YEAR: number = 2050;
const YEAR_PAGE_SIZE: number = 12;
const COMPACT_CONTAINER_PADDING_CLASS: string = "p-3 w-72 max-w-full";
const HEADER_SPACING_CLASS: string = "mb-2";
const YEAR_GRID_GAP_CLASS: string = "gap-1";
const MONTH_GRID_GAP_CLASS: string = "gap-1";
const YEAR_RANGE_TEXT_CLASS: string = "text-sm font-medium";
const YEAR_BUTTON_CLASS: string = "h-9 w-full px-1 text-sm font-normal";
const MONTH_BUTTON_CLASS: string = "h-9 w-full text-sm font-normal";

function getYearBounds(
  minDate?: Date,
  maxDate?: Date,
): { minYear: number; maxYear: number } {
  const minYear: number = minDate?.getFullYear() ?? DEFAULT_MIN_YEAR;
  const maxYear: number = maxDate?.getFullYear() ?? DEFAULT_MAX_YEAR;
  return {
    minYear,
    maxYear: Math.max(minYear, maxYear),
  };
}

function clampYear(year: number, minYear: number, maxYear: number): number {
  return Math.min(Math.max(year, minYear), maxYear);
}

function computePageStart(
  year: number,
  minYear: number,
  maxYear: number,
): number {
  const clampedYear = clampYear(year, minYear, maxYear);
  const range = maxYear - minYear + 1;
  if (range <= YEAR_PAGE_SIZE) return minYear;
  const offset = (clampedYear - minYear) % YEAR_PAGE_SIZE;
  const start = clampedYear - offset;
  const maxStart = maxYear - YEAR_PAGE_SIZE + 1;
  return Math.min(Math.max(start, minYear), maxStart);
}

export function MonthPicker(props: MonthPickerProps): React.ReactElement {
  const { selectedMonth, onMonthSelect, minDate, maxDate, className } = props;

  const { minYear, maxYear } = React.useMemo(
    () => getYearBounds(minDate, maxDate),
    [minDate, maxDate],
  );

  const initialYear = React.useMemo(() => {
    const baseYear = selectedMonth?.getFullYear() ?? new Date().getFullYear();
    return clampYear(baseYear, minYear, maxYear);
  }, [selectedMonth, minYear, maxYear]);

  const [displayYear, setDisplayYear] = React.useState<number>(initialYear);
  const [view, setView] = React.useState<'year' | 'month'>('month');
  const gridRef = React.useRef<HTMLDivElement>(null);
  const previousView = React.useRef(view);
  React.useLayoutEffect(() => {
    if (previousView.current !== view) {
      const grid = gridRef.current;
      const target = grid?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]:not([disabled])')
        ?? grid?.querySelector<HTMLButtonElement>('button:not([disabled])');
      target?.focus();
      previousView.current = view;
    }
  }, [view]);
  const [yearPageStart, setYearPageStart] = React.useState<number>(() =>
    computePageStart(initialYear, minYear, maxYear),
  );

  const selectedYear: number | undefined = selectedMonth?.getFullYear();
  const selectedMonthNum: number | undefined = selectedMonth
    ? selectedMonth.getMonth() + 1
    : undefined;

  function handleMonthClick(monthNum: number): void {
    const newDate = new Date(displayYear, monthNum - 1, 1);
    onMonthSelect(newDate);
  }

  function handleYearSelect(year: number): void {
    const clamped = clampYear(year, minYear, maxYear);
    setDisplayYear(clamped);
    setYearPageStart(computePageStart(clamped, minYear, maxYear));
    setView('month');
  }

  function handleYearPageBackward(): void {
    setYearPageStart((prev) => {
      if (prev <= minYear) return prev;
      const nextStart = prev - YEAR_PAGE_SIZE;
      return Math.max(nextStart, minYear);
    });
  }

  function handleYearPageForward(): void {
    setYearPageStart((prev) => {
      const maxStart = computePageStart(maxYear, minYear, maxYear);
      if (prev >= maxStart) return prev;
      const nextStart = prev + YEAR_PAGE_SIZE;
      return Math.min(nextStart, maxStart);
    });
  }

  function isMonthDisabled(monthNum: number): boolean {
    const date = new Date(displayYear, monthNum - 1, 1);
    if (
      minDate &&
      date < new Date(minDate.getFullYear(), minDate.getMonth(), 1)
    ) {
      return true;
    }
    if (
      maxDate &&
      date > new Date(maxDate.getFullYear(), maxDate.getMonth(), 1)
    ) {
      return true;
    }
    return false;
  }

  function isMonthSelected(monthNum: number): boolean {
    return selectedYear === displayYear && selectedMonthNum === monthNum;
  }

  return (
    <div className={cn(COMPACT_CONTAINER_PADDING_CLASS, className)}>
      <div
        className={cn(
          "flex items-center justify-between",
          HEADER_SPACING_CLASS,
        )}
      >
        <Button
          variant="outline"
          className="h-9 w-9 bg-transparent p-0 text-slate-500"
          onClick={view === 'year' ? handleYearPageBackward : () => setDisplayYear(year => Math.max(minYear, year - 1))}
          type="button"
          disabled={view === 'year' ? yearPageStart <= minYear : displayYear <= minYear}
          aria-label={view === 'year' ? '上一组年份' : '上一年'}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {view === 'year' ? <div className={YEAR_RANGE_TEXT_CLASS}>
          {yearPageStart}年至
          {Math.min(yearPageStart + YEAR_PAGE_SIZE - 1, maxYear)}年
        </div> : <Button
          type="button"
          variant="ghost"
          aria-label={`选择年份，当前${displayYear}年`}
          className="h-9 px-2 text-sm font-medium"
          onClick={() => { setYearPageStart(computePageStart(displayYear, minYear, maxYear)); setView('year'); }}
        >{displayYear}年 <span className="text-xs font-normal text-slate-400">切换年份</span></Button>}
        <Button
          variant="outline"
          className="h-9 w-9 bg-transparent p-0 text-slate-500"
          onClick={view === 'year' ? handleYearPageForward : () => setDisplayYear(year => Math.min(maxYear, year + 1))}
          type="button"
          disabled={
            view === 'year' ? yearPageStart >= computePageStart(maxYear, minYear, maxYear) : displayYear >= maxYear
          }
          aria-label={view === 'year' ? '下一组年份' : '下一年'}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {view === 'year' ? <div ref={gridRef} className={cn("grid grid-cols-3", YEAR_GRID_GAP_CLASS)}>
        {Array.from({ length: YEAR_PAGE_SIZE }).map((_, index) => {
          const year = yearPageStart + index;
          if (year > maxYear) return null;
          const disabled = year < minYear || year > maxYear;
          const selected = year === displayYear;

          return (
            <Button
              key={year}
              variant={selected ? "default" : "ghost"}
              onClick={() => handleYearSelect(year)}
              disabled={disabled}
              aria-pressed={selected}
              type="button"
              className={cn(
                YEAR_BUTTON_CLASS,
                selected &&
                  "bg-primary text-primary-foreground font-medium hover:bg-primary hover:text-primary-foreground",
              )}
            >
              {year}年
            </Button>
          );
        })}
      </div> : <>

      <div className="mb-2 text-xs text-slate-500" aria-live="polite">
        {displayYear}年 · 选择月份
      </div>

      <div ref={gridRef} className={cn("grid grid-cols-3", MONTH_GRID_GAP_CLASS)}>
        {MONTHS.map((month) => {
          const disabled = isMonthDisabled(month.number);
          const selected = isMonthSelected(month.number);

          return (
            <Button
              key={month.number}
              variant={selected ? "default" : "ghost"}
              onClick={() => handleMonthClick(month.number)}
              disabled={disabled}
              aria-pressed={selected}
              type="button"
              className={cn(
                MONTH_BUTTON_CLASS,
                selected &&
                  "bg-primary text-primary-foreground font-medium hover:bg-primary hover:text-primary-foreground",
              )}
            >
              {month.name}
            </Button>
          );
        })}
      </div>
      </>}
    </div>
  );
}
