'use client'

import { useLayoutEffect, useState, type RefObject } from 'react'

const EDGE = 12
export const POPOVER_GAP = 4

/** Keep placement independent of results; only a viewport resize can choose a new side. */
export function useStablePopoverPlacement(anchor: RefObject<HTMLElement | null>, open: boolean, preferredHeight: number) {
  const [placement, setPlacement] = useState<{ side: 'top' | 'bottom'; maxHeight: number }>({ side: 'bottom', maxHeight: preferredHeight })

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
      setPlacement(current => current.side === side && current.maxHeight === maxHeight ? current : { side, maxHeight })
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
  }, [anchor, open, preferredHeight])

  return placement
}
