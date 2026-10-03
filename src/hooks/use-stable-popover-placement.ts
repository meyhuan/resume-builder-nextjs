'use client'

import { useLayoutEffect, useState, type RefObject } from 'react'

const EDGE = 12
export const POPOVER_GAP = 4

/** Keep placement independent of results; only a viewport resize can choose a new side. */
export function useStablePopoverPlacement(anchor: RefObject<HTMLElement | null>, open: boolean, preferredHeight: number, minWidth = 0) {
  const [placement, setPlacement] = useState<{ side: 'top' | 'bottom'; maxHeight: number; alignOffset: number }>({ side: 'bottom', maxHeight: preferredHeight, alignOffset: 0 })

  useLayoutEffect(() => {
    if (!open || !anchor.current) return
    function space() {
      const rect = anchor.current!.getBoundingClientRect()
      const viewport = window.visualViewport
      const top = viewport?.offsetTop ?? 0
      const bottom = top + (viewport?.height ?? window.innerHeight)
      return { top: Math.max(0, rect.top - top - EDGE - POPOVER_GAP), bottom: Math.max(0, bottom - rect.bottom - EDGE - POPOVER_GAP) }
    }
    const pickSide = (available: ReturnType<typeof space>): 'top' | 'bottom' => available.bottom >= preferredHeight || available.bottom >= available.top ? 'bottom' : 'top'
    let side = pickSide(space())
    const update = () => {
      const maxHeight = Math.floor(space()[side])
      const rect = anchor.current!.getBoundingClientRect()
      const width = Math.min(Math.max(rect.width, minWidth), window.innerWidth - EDGE * 2)
      const alignOffset = Math.min(0, window.innerWidth - EDGE - rect.left - width)
      setPlacement(current => current.side === side && current.maxHeight === maxHeight && current.alignOffset === alignOffset ? current : { side, maxHeight, alignOffset })
    }
    const resize = () => {
      // A smaller dialog can scroll the source field out of view; keep the open control reachable.
      anchor.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      side = pickSide(space())
      update()
    }
    update()
    window.addEventListener('resize', resize)
    window.addEventListener('scroll', update, true)
    window.visualViewport?.addEventListener('resize', resize)
    window.visualViewport?.addEventListener('scroll', update)
    const observer = new ResizeObserver(update)
    observer.observe(anchor.current)
    const dialog = anchor.current.closest('[role="dialog"]')
    if (dialog) observer.observe(dialog)
    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', update, true)
      window.visualViewport?.removeEventListener('resize', resize)
      window.visualViewport?.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [anchor, open, preferredHeight, minWidth])

  return placement
}
