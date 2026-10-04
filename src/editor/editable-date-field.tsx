import { lazy, Suspense, useId, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { CalendarIcon } from 'lucide-react'
import { useAppStore } from '@/state/store'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { hasMeaningfulText } from '@/lib/resume-placeholders'

const MonthPicker = lazy(async () => {
  const module = await import('@/components/ui/monthpicker')
  return { default: module.MonthPicker }
})

/**
 * EditableDateField - Year/Month selector for resume date fields.
 * Uses shadcn-ui monthpicker component.
 */
export interface EditableDateFieldProps {
  readonly blockId: string
  readonly fieldName: 'startDate' | 'endDate'
  readonly value: string | undefined
  readonly className?: string
  readonly presentLabel?: string
  readonly showIcon?: boolean
  readonly emptyMode?: 'placeholder' | 'hover' | 'hidden'
  readonly onOpenChange?: (isOpen: boolean) => void
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value || value === 'PRESENT') return undefined
  const match = /^(\d{4})[.-](\d{1,2})$/.exec(value)
  if (!match) return undefined
  const year = Number(match[1]), month = Number(match[2])
  if (month < 1 || month > 12) return undefined
  const date = new Date(year, month - 1, 1)
  return date.getFullYear() === year ? date : undefined
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}.${month}`
}

function formatDisplay(val: string | undefined, presentLabel: string, emptyLabel = '选择'): string {
  if (!val) return emptyLabel
  if (val === 'PRESENT') return presentLabel
  return val
}

export default function EditableDateField(props: EditableDateFieldProps): ReactElement {
  const { blockId, fieldName, value, className, presentLabel = '至今', showIcon = false, emptyMode = 'placeholder', onOpenChange } = props
  const setResume = useAppStore((s) => s.setResume)
  const readOnly = useAppStore((s) => s.readOnly)
  const dateBlock = useAppStore((s) => s.resume.sections.flatMap(section => section.blocks).find(block => block.id === blockId))
  const [open, setOpen] = useState(false)
  const [activeField, setActiveField] = useState(fieldName)
  const [range, setRange] = useState<{ startDate?: string; endDate?: string }>({})
  const [pendingStart, setPendingStart] = useState(false)
  const panelId = useId()
  const startTab = useRef<HTMLButtonElement>(null)
  const endTab = useRef<HTMLButtonElement>(null)

  const selectedDate = parseDate(range[activeField])
  const startDate = parseDate(range.startDate)
  const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const allowPresent = !startDate || startDate <= currentMonth
  const hasValue = hasMeaningfulText(value)
  const emptyLabel = fieldName === 'startDate' ? '开始时间' : '结束时间'
  const displayText: string = hasValue ? formatDisplay(value, presentLabel) : emptyLabel

  if (readOnly) {
    if (!hasValue && emptyMode !== 'placeholder') return <></>
    return (
      <span className={cn('inline-flex items-center gap-1 px-1', className)}>
        {showIcon ? <CalendarIcon className="h-3 w-3" /> : null}
        <span>{displayText === '选择' ? '' : displayText}</span>
      </span>
    )
  }

  function setPopoverOpen(next: boolean): void {
    if (next) {
      setRange({
        startDate: dateBlock && 'startDate' in dateBlock ? dateBlock.startDate : undefined,
        endDate: dateBlock && 'endDate' in dateBlock ? dateBlock.endDate : undefined,
        [fieldName]: value,
      })
      setActiveField(fieldName)
      setPendingStart(false)
    }
    setOpen(next)
    onOpenChange?.(next)
  }

  function commitRange(next: typeof range): void {
    setResume((draft) => {
      for (const section of draft.sections) {
        for (let i = 0; i < section.blocks.length; i++) {
          const block = section.blocks[i]
          if (block.id === blockId && 'startDate' in block) {
            section.blocks[i] = { ...block, ...next }
            return
          }
        }
      }
    })
  }

  function selectField(next: 'startDate' | 'endDate', focus = false): void {
    setActiveField(next)
    if (focus) (next === 'startDate' ? startTab : endTab).current?.focus()
  }

  function handleMonthSelect(date: Date): void {
    if (activeField === 'endDate' && startDate && date < startDate) return
    const next = { ...range, [activeField]: formatDate(date) }
    setRange(next)
    if (activeField === 'startDate') {
      const end = next.endDate === 'PRESENT' ? currentMonth : parseDate(next.endDate)
      if (!next.endDate || (end && end < date)) {
        // Keep an incompatible start in the panel until its matching end is chosen.
        // A valid incomplete start can be saved immediately.
        const incompatible = Boolean(end && end < date)
        if (!incompatible) commitRange(next)
        setPendingStart(incompatible)
        selectField('endDate', true)
        return
      }
    }
    commitRange(next)
    setPopoverOpen(false)
  }

  function handlePresent(): void {
    if (!allowPresent) return
    commitRange({ ...range, endDate: 'PRESENT' })
    setPopoverOpen(false)
  }

  function handleClear(): void {
    commitRange({ ...range, [activeField]: '' })
    setPopoverOpen(false)
  }

  if (!hasValue && emptyMode === 'hidden') return <></>

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next): void => {
        setPopoverOpen(next)
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          data-resume-edit-field="true"
          data-resume-date-field={fieldName}
          data-resume-date-block={blockId}
          aria-label={`${emptyLabel}：${displayText}`}
          title={emptyLabel}
          className={cn(
            'inline-flex items-center gap-1 px-1 rounded transition-colors',
            !hasValue && emptyMode === 'hover'
              ? open
                ? 'inline-flex border border-dashed border-slate-300 text-slate-400 print:hidden'
                : 'hidden border border-dashed border-slate-300 text-slate-400 group-hover/block:inline-flex group-focus-within/block:inline-flex group-hover/section:inline-flex group-hover/section-edit:inline-flex print:hidden'
              : '',
            className
          )}
        >
          {showIcon ? <CalendarIcon className="h-3 w-3" /> : null}
          <span>{displayText}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          aria-label="经历起止时间"
          className="z-[60] max-h-[var(--radix-popover-content-available-height)] w-72 max-w-[calc(100vw-24px)] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white text-slate-700 shadow-lg"
          sideOffset={6}
          align="start"
          collisionPadding={12}
          onWheel={event => event.stopPropagation()}
          onTouchMove={event => event.stopPropagation()}
        >
          <div role="tablist" aria-label="选择开始或结束时间" className="grid grid-cols-2 gap-1 border-b border-slate-100 p-2">
            {(['startDate', 'endDate'] as const).map(field => (
              <button
                key={field}
                ref={field === 'startDate' ? startTab : endTab}
                type="button"
                role="tab"
                id={`${panelId}-${field}`}
                aria-controls={`${panelId}-calendar`}
                aria-label={`${field === 'startDate' ? '开始时间' : '结束时间'} ${formatDisplay(range[field], presentLabel, '未填写')}`}
                aria-selected={activeField === field}
                tabIndex={activeField === field ? 0 : -1}
                onClick={() => selectField(field)}
                onKeyDown={event => {
                  if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                    event.preventDefault()
                    selectField(event.key === 'Home' ? 'startDate' : event.key === 'End' ? 'endDate' : field === 'startDate' ? 'endDate' : 'startDate', true)
                  }
                }}
                className={cn('rounded-lg px-2 py-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-violet-500', activeField === field ? 'bg-violet-50 text-violet-700' : 'text-slate-500 hover:bg-slate-50')}
              >
                <span className="block text-xs">{field === 'startDate' ? '开始时间' : '结束时间'}</span>
                <span className="mt-1 block font-medium">{formatDisplay(range[field], presentLabel, '未填写')}</span>
              </button>
            ))}
          </div>
          <div id={`${panelId}-calendar`} role="tabpanel" aria-labelledby={`${panelId}-${activeField}`}>
          <Suspense fallback={<div className="h-80 w-72" />}>
            <MonthPicker
              key={`${activeField}:${range[activeField] ?? ''}`}
              selectedMonth={selectedDate}
              onMonthSelect={handleMonthSelect}
              minDate={activeField === 'endDate' && startDate ? startDate : new Date(1980, 0, 1)}
              maxDate={new Date(2050, 11, 31)}
            />
          </Suspense>
          </div>
          {activeField === 'endDate' && startDate ? (
            <p role="status" className="px-3 pb-3 text-xs leading-5 text-slate-500">
              {pendingStart ? '开始时间暂未保存，' : ''}请选择不早于 {formatDate(startDate)} 的结束时间{!allowPresent ? '；未来经历请选预计结束月份。' : '。'}
            </p>
          ) : null}
          <div className="flex items-center justify-between border-t border-slate-100 p-2">
            <Button variant="ghost" onClick={handleClear} type="button" className="text-slate-500">清除{activeField === 'startDate' ? '开始' : '结束'}时间</Button>
            {activeField === 'endDate' ? (
              <Button
                variant={range.endDate === 'PRESENT' ? 'default' : 'outline'}
                onClick={handlePresent}
                disabled={!allowPresent}
                type="button"
              >
                {presentLabel}
              </Button>
            ) : null}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
