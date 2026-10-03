/* Hallmark · component: searchable choice · genre: modern-minimal · theme: existing
 * pre-emit critique: P5 H4 E4 S5 R5 V4 */
'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { Button } from './button'
import { Input } from './input'
import { cn } from '@/lib/utils'
import * as Popover from '@radix-ui/react-popover'
import { POPOVER_GAP, useStablePopoverPlacement } from '@/hooks/use-stable-popover-placement'

const PANEL_HEIGHT = 300

interface SearchChoiceProps {
  readonly id: string
  readonly label: string
  readonly value: string
  readonly options: readonly string[]
  readonly onValueChange: (value: string) => void
  readonly placeholder?: string
  readonly disabled?: boolean
}

/** Local suggestions, with an explicit custom choice so imported values survive. */
export function SearchChoice({ id, label, value, options, onValueChange, placeholder, disabled }: SearchChoiceProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const trigger = useRef<HTMLButtonElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const listId = useId()
  const placement = useStablePopoverPlacement(trigger, open, PANEL_HEIGHT)
  const search = query.trim()
  const available = [...new Set(value ? [value, ...options] : options)]
  const matches = available.filter(option => option.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
  const items = [
    ...matches.map(option => ({ value: option, label: option })),
    ...(search && !available.includes(search) ? [{ value: search, label: `使用“${search}”` }] : []),
    { value: '', label: '暂不填写' },
  ]
  const activeIndex = Math.min(active, items.length - 1)

  useEffect(() => {
    const option = document.getElementById(`${listId}-${activeIndex}`)
    if (!open || !list.current || !option) return
    const itemRect = option.getBoundingClientRect()
    const listRect = list.current.getBoundingClientRect()
    if (itemRect.top < listRect.top) list.current.scrollTop -= listRect.top - itemRect.top
    if (itemRect.bottom > listRect.bottom) list.current.scrollTop += itemRect.bottom - listRect.bottom
  }, [activeIndex, listId, open])

  function choose(next: string) {
    onValueChange(next)
    setOpen(false)
    trigger.current?.focus()
  }

  return <Popover.Root open={open} onOpenChange={next => {
    if (next) { setQuery(''); setActive(0) }
    setOpen(next)
  }}>
    <Popover.Trigger asChild>
    <Button ref={trigger} id={id} type="button" variant="outline" disabled={disabled}
      aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined}
      className="min-h-11 h-auto w-full justify-between gap-2 px-3 text-left font-normal hover:bg-muted/50 hover:text-foreground active:bg-muted data-[state=open]:border-primary data-[state=open]:bg-background data-[state=open]:text-foreground focus-visible:ring-2 focus-visible:ring-offset-2">
      <span className={cn('min-w-0 whitespace-normal break-words', !value && 'text-muted-foreground')}>{value || placeholder || `搜索或选择${label}`}</span>
      <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none', open && 'rotate-180 text-primary')} aria-hidden="true" />
    </Button>
    </Popover.Trigger>
    <Popover.Portal>
    <Popover.Content align="start" side={placement.side} sideOffset={POPOVER_GAP} avoidCollisions={false}
      style={{ height: Math.min(PANEL_HEIGHT, placement.maxHeight) }}
      className="z-50 flex w-[var(--radix-popover-trigger-width)] flex-col overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      // Body-portaled options are outside Dialog's scroll-lock boundary; allow their native scrolling.
      onWheel={event => event.stopPropagation()}
      onTouchMove={event => event.stopPropagation()}
      onOpenAutoFocus={event => { event.preventDefault(); input.current?.focus() }}>
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" aria-hidden="true" />
        <Input ref={input} role="combobox" aria-label={`搜索${label}`} aria-autocomplete="list"
          aria-expanded="true" aria-controls={listId} aria-activedescendant={`${listId}-${activeIndex}`}
          value={query} placeholder={`搜索${label}，也可自定义`} className="h-11 pl-9"
          onChange={event => { setQuery(event.target.value); setActive(0) }}
          onKeyDown={event => {
            if (event.nativeEvent.isComposing || event.keyCode === 229) return
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              setActive(current => (Math.min(current, items.length - 1) + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length)
            } else if (event.key === 'Enter') {
              event.preventDefault(); choose(items[activeIndex].value)
            } else if (event.key === 'Escape') {
              event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus()
            }
          }} />
      </div>
      <ul ref={list} id={listId} role="listbox" aria-label={`${label}选项`} className="mt-1 min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {items.map((item, index) => <li id={`${listId}-${index}`} key={item.value} role="option" aria-selected={value === item.value}
          className={cn('flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-sm px-3 py-2 text-sm break-words', index === activeIndex && 'bg-muted')}
          onPointerMove={() => setActive(index)} onPointerDown={event => event.preventDefault()} onClick={() => choose(item.value)}>
          <span>{item.label}</span>{value === item.value && <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />}
        </li>)}
      </ul>
      <p className="shrink-0 px-3 py-1 text-xs text-muted-foreground">常用选项；其他内容可搜索后直接使用。</p>
    </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
}
