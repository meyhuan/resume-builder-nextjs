"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { CalendarDays } from "lucide-react";

import { MonthPicker } from "@/components/ui/monthpicker";
import { cn } from "@/lib/utils";

interface ChineseMonthInputProps {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

interface ChineseDateInputProps {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

interface DateParts {
  year: number;
  month: number;
  day: number;
}

const MIN_MONTH = new Date(1950, 0, 1);
const MAX_MONTH = new Date(new Date().getFullYear() + 10, 11, 1);

export function ChineseMonthInput({
  id,
  value,
  onValueChange,
  className,
  placeholder = "请选择年月",
}: ChineseMonthInputProps): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const selectedMonth = parseMonth(value);
  const displayValue = selectedMonth
    ? formatChineseMonth(selectedMonth)
    : value || placeholder;

  function selectMonth(month: Date): void {
    onValueChange(formatStoredMonth(month));
    setOpen(false);
  }

  function selectCurrentMonth(): void {
    selectMonth(new Date());
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          id={id}
          type="button"
          aria-label={`${displayValue}，点击选择年月`}
          className={cn(
            "flex items-center justify-between text-left",
            !value && "text-slate-400",
            className,
          )}
        >
          <span>{displayValue}</span>
          <CalendarDays
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-slate-400"
          />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="start"
          sideOffset={4}
          avoidCollisions={false}
          className="z-50 w-[var(--radix-popover-trigger-width)] min-w-64 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-700 shadow-lg outline-none"
        >
          <MonthPicker
            selectedMonth={selectedMonth}
            onMonthSelect={selectMonth}
            minDate={MIN_MONTH}
            maxDate={MAX_MONTH}
            className="w-full"
          />
          <div className="flex items-center justify-between border-t border-slate-100 px-2 py-2">
            <button
              type="button"
              onClick={() => {
                onValueChange("");
                setOpen(false);
              }}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-500 outline outline-2 outline-offset-1 outline-transparent transition-colors hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-violet-600 active:bg-slate-100"
            >
              清除
            </button>
            <button
              type="button"
              onClick={selectCurrentMonth}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-violet-700 outline outline-2 outline-offset-1 outline-transparent transition-colors hover:bg-violet-50 focus-visible:outline-violet-600 active:bg-violet-100"
            >
              本月
            </button>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export function ChineseDateInput({
  id,
  value,
  onValueChange,
  className,
  placeholder = "请选择日期",
}: ChineseDateInputProps): React.ReactElement {
  const currentYear = new Date().getFullYear();
  const parsed = parseDate(value);
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DateParts>(
    parsed ?? { year: currentYear - 22, month: 1, day: 1 },
  );
  const displayValue = parsed
    ? formatChineseDate(parsed)
    : value || placeholder;
  const daysInMonth = new Date(draft.year, draft.month, 0).getDate();
  const years = Array.from({ length: currentYear - 1949 }, (_, index) =>
    Number(currentYear - index),
  );

  function changeOpen(nextOpen: boolean): void {
    if (nextOpen) {
      setDraft(parsed ?? { year: currentYear - 22, month: 1, day: 1 });
    }
    setOpen(nextOpen);
  }

  function updateDraft(next: Partial<DateParts>): void {
    setDraft((current) => {
      const merged = { ...current, ...next };
      const maximumDay = new Date(merged.year, merged.month, 0).getDate();
      return { ...merged, day: Math.min(merged.day, maximumDay) };
    });
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={changeOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          id={id}
          type="button"
          aria-label={`${displayValue}，点击选择日期`}
          className={cn(
            "flex items-center justify-between text-left",
            !value && "text-slate-400",
            className,
          )}
        >
          <span>{displayValue}</span>
          <CalendarDays
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-slate-400"
          />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="start"
          sideOffset={4}
          avoidCollisions={false}
          className="z-50 w-[var(--radix-popover-trigger-width)] min-w-72 rounded-xl border border-slate-200 bg-white p-4 text-slate-700 shadow-lg outline-none"
        >
          <div className="grid grid-cols-3 gap-2">
            <ChineseDateSelect
              label="年"
              value={draft.year}
              values={years}
              onChange={(year) => updateDraft({ year })}
            />
            <ChineseDateSelect
              label="月"
              value={draft.month}
              values={Array.from({ length: 12 }, (_, index) => index + 1)}
              onChange={(month) => updateDraft({ month })}
            />
            <ChineseDateSelect
              label="日"
              value={draft.day}
              values={Array.from(
                { length: daysInMonth },
                (_, index) => index + 1,
              )}
              onChange={(day) => updateDraft({ day })}
            />
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => {
                onValueChange("");
                setOpen(false);
              }}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-500 outline outline-2 outline-offset-1 outline-transparent transition-colors hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-violet-600 active:bg-slate-100"
            >
              清除
            </button>
            <button
              type="button"
              onClick={() => {
                onValueChange(formatStoredDate(draft));
                setOpen(false);
              }}
              className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white outline outline-2 outline-offset-1 outline-transparent transition-colors hover:bg-violet-700 focus-visible:outline-violet-600 active:bg-violet-800"
            >
              确定
            </button>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function ChineseDateSelect({
  label,
  value,
  values,
  onChange,
}: {
  label: "年" | "月" | "日";
  value: number;
  values: number[];
  onChange: (value: number) => void;
}): React.ReactElement {
  return (
    <label className="text-xs font-medium text-slate-500">
      <span className="mb-1.5 block">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline outline-2 outline-offset-1 outline-transparent hover:border-slate-300 focus-visible:border-violet-500 focus-visible:outline-violet-600"
      >
        {values.map((option) => (
          <option key={option} value={option}>
            {option}
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

function parseMonth(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || month < 1 || month > 12) return undefined;
  return new Date(year, month - 1, 1);
}

function formatStoredMonth(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function formatChineseMonth(value: Date): string {
  return `${value.getFullYear()}年${String(value.getMonth() + 1).padStart(2, "0")}月`;
}

function parseDate(value: string): DateParts | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  const candidate = new Date(parts.year, parts.month - 1, parts.day);
  if (
    candidate.getFullYear() !== parts.year ||
    candidate.getMonth() + 1 !== parts.month ||
    candidate.getDate() !== parts.day
  ) {
    return undefined;
  }
  return parts;
}

function formatStoredDate(value: DateParts): string {
  return `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
}

function formatChineseDate(value: DateParts): string {
  return `${value.year}年${String(value.month).padStart(2, "0")}月${String(value.day).padStart(2, "0")}日`;
}
