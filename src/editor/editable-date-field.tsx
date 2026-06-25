import { lazy, Suspense, useState } from 'react'
import type { ReactElement } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { CalendarIcon } from 'lucide-react'
import { useAppStore } from '@/state/store'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
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
  const parts = value.split('.')
  if (parts.length === 2) {
    const year = Number(parts[0])
    const month = Number(parts[1])
    if (!isNaN(year) && !isNaN(month)) {
      return new Date(year, month - 1, 1)
    }
  }
  return undefined
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
  const [open, setOpen] = useState(false)

  const selectedDate: Date | undefined = parseDate(value)
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
    setOpen(next)
    onOpenChange?.(next)
  }

  function handleMonthSelect(date: Date): void {
    const formatted = formatDate(date)
    setResume((draft) => {
      for (const section of draft.sections) {
        for (let i = 0; i < section.blocks.length; i++) {
          const block: ResumeBlock = section.blocks[i]
          if (block.id === blockId) {
            section.blocks[i] = { ...block, [fieldName]: formatted }
            return
          }
        }
      }
    })
    setPopoverOpen(false)
  }

  function handlePresent(): void {
    setResume((draft) => {
      for (const section of draft.sections) {
        for (let i = 0; i < section.blocks.length; i++) {
          const block: ResumeBlock = section.blocks[i]
          if (block.id === blockId) {
            section.blocks[i] = { ...block, [fieldName]: 'PRESENT' }
            return
          }
        }
      }
    })
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
          title={emptyLabel}
          className={cn(
            'inline-flex items-center gap-1 px-1 rounded hover:bg-gray-100 hover:!text-slate-900 transition-colors',
            !hasValue && emptyMode === 'hover'
              ? open
                ? 'inline-flex border border-dashed border-slate-300 text-slate-400 print:hidden'
                : 'hidden border border-dashed border-slate-300 text-slate-400 group-hover/block:inline-flex group-hover/section:inline-flex group-hover/section-edit:inline-flex print:hidden'
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
          className="z-[60] bg-white border rounded-md shadow-md"
          sideOffset={6}
          align="start"
        >
          <Suspense fallback={<div className="h-[220px] w-[220px]" />}>
            <MonthPicker
              selectedMonth={selectedDate}
              onMonthSelect={handleMonthSelect}
              minDate={new Date(1980, 0, 1)}
              maxDate={new Date(2050, 11, 31)}
            />
          </Suspense>
          
          {fieldName === 'endDate' ? (
            <div className="px-3 pb-3">
              <Button
                variant={value === 'PRESENT' ? 'default' : 'outline'}
                onClick={handlePresent}
                type="button"
                className="w-full"
              >
                {presentLabel}
              </Button>
            </div>
          ) : null}

          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
