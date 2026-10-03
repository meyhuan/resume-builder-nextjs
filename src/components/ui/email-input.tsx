'use client'

import { useEffect, useId, useRef, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Input } from './input'
import { cn } from '@/lib/utils'
import { POPOVER_GAP, useStablePopoverPlacement } from '@/hooks/use-stable-popover-placement'

const EMAIL_DOMAINS = ['qq.com', '163.com', '126.com', 'outlook.com', 'gmail.com', 'foxmail.com', 'yeah.net', 'hotmail.com']

/** Suggest complete addresses without committing a domain until the user chooses it. */
export function EmailInput({ id, value, onValueChange }: {
  readonly id: string
  readonly value: string
  readonly onValueChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [composing, setComposing] = useState(false)
  const [active, setActive] = useState(-1)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const listId = useId()
  const parts = value.trim().split('@')
  const local = parts[0]
  const domain = parts[1]?.toLowerCase() ?? ''
  const suggestions = local && !/\s/.test(value.trim()) && parts.length <= 2
    && !EMAIL_DOMAINS.includes(domain)
    ? EMAIL_DOMAINS.filter(option => option.startsWith(domain)).map(option => `${local}@${option}`)
    : []
  const visible = open && !composing && suggestions.length > 0
  const placement = useStablePopoverPlacement(input, visible, 248)
  const activeIndex = Math.min(active, suggestions.length - 1)

  useEffect(() => {
    const option = document.getElementById(`${listId}-${activeIndex}`)
    if (!visible || !list.current || !option) return
    const itemRect = option.getBoundingClientRect(), listRect = list.current.getBoundingClientRect()
    if (itemRect.top < listRect.top) list.current.scrollTop -= listRect.top - itemRect.top
    if (itemRect.bottom > listRect.bottom) list.current.scrollTop += itemRect.bottom - listRect.bottom
  }, [visible, activeIndex, listId])

  function choose(next: string) {
    onValueChange(next)
    setOpen(false)
    setActive(-1)
    input.current?.focus()
  }

  return <Popover.Root open={visible} onOpenChange={setOpen}>
    <Popover.Anchor asChild>
      <Input ref={input} id={id} type="email" inputMode="email" autoComplete="off" autoCapitalize="none" spellCheck={false}
        role="combobox" aria-autocomplete="list" aria-expanded={visible}
        aria-controls={visible ? listId : undefined}
        aria-activedescendant={visible && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        value={value}
        onFocus={() => setOpen(true)}
        onChange={event => { onValueChange(event.target.value); setActive(-1); setOpen(true) }}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={() => { setComposing(false); setActive(-1); setOpen(true) }}
        onKeyDown={event => {
          if (composing || event.nativeEvent.isComposing || event.keyCode === 229 || !visible) return
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setActive(current => event.key === 'ArrowDown'
              ? (current + 1) % suggestions.length
              : (current <= 0 ? suggestions.length - 1 : current - 1))
          } else if (event.key === 'Enter' && activeIndex >= 0) {
            event.preventDefault(); choose(suggestions[activeIndex])
          } else if (event.key === 'Escape') {
            event.preventDefault(); event.stopPropagation(); setOpen(false); setActive(-1)
          } else if (event.key === 'Tab') {
            setOpen(false); setActive(-1)
          }
        }} />
    </Popover.Anchor>
    <Popover.Portal>
      <Popover.Content align="start" side={placement.side} sideOffset={POPOVER_GAP} avoidCollisions={false}
        style={{ maxHeight: placement.maxHeight }}
        className="z-50 flex w-[var(--radix-popover-trigger-width)] flex-col overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        onOpenAutoFocus={event => event.preventDefault()}
        onCloseAutoFocus={event => event.preventDefault()}
        onInteractOutside={event => { if (event.detail.originalEvent.target === input.current) event.preventDefault() }}
        onWheel={event => event.stopPropagation()}
        onTouchMove={event => event.stopPropagation()}>
        <ul ref={list} id={listId} role="listbox" aria-label="常用邮箱后缀" className="min-h-0 max-h-60 overflow-y-auto overscroll-contain">
          {suggestions.map((address, index) => <li id={`${listId}-${index}`} key={address} role="option" aria-selected={index === activeIndex}
            className={cn('min-h-11 cursor-pointer rounded-sm px-3 py-3 text-sm leading-relaxed [overflow-wrap:anywhere] hover:bg-muted active:bg-muted', index === activeIndex && 'bg-muted')}
            onPointerMove={() => setActive(index)} onPointerDown={event => event.preventDefault()} onClick={() => choose(address)}>
            <span>{local}</span><span className="font-medium">{address.slice(local.length)}</span>
          </li>)}
        </ul>
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
}
