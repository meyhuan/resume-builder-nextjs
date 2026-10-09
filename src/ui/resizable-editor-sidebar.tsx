'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react'

export const EDITOR_SIDEBAR_DEFAULT_WIDTH = 480
export const EDITOR_SIDEBAR_MIN_WIDTH = 360
export const EDITOR_SIDEBAR_MAX_WIDTH = 640
export const EDITOR_SIDEBAR_STORAGE_KEY = 'resume-editor-sidebar-width-v1'
const CANVAS_MIN_WIDTH = 480
const DESKTOP_BREAKPOINT = 1024

function clampWidth(width: number, max = EDITOR_SIDEBAR_MAX_WIDTH): number {
  return Math.round(Math.min(max, Math.max(EDITOR_SIDEBAR_MIN_WIDTH, width)))
}

function readStoredWidth(): number {
  try {
    const raw = window.localStorage.getItem(EDITOR_SIDEBAR_STORAGE_KEY)
    const value = raw?.trim() ? Number(raw) : NaN
    if (Number.isFinite(value) && value >= EDITOR_SIDEBAR_MIN_WIDTH) return clampWidth(value)
  } catch {
    // Storage may be unavailable in private or embedded browsers.
  }
  return EDITOR_SIDEBAR_DEFAULT_WIDTH
}

function storeWidth(width: number): void {
  try {
    window.localStorage.setItem(EDITOR_SIDEBAR_STORAGE_KEY, String(width))
  } catch {
    // Resizing still works when local persistence is unavailable.
  }
}

export interface ResizableEditorSidebarProps {
  readonly children: ReactNode
  readonly open: boolean
  readonly label?: string
  readonly className?: string
}

export function ResizableEditorSidebar({
  children,
  open,
  label = '编辑工具',
  className = '',
}: ResizableEditorSidebarProps) {
  // Keep the server and first client render identical; restore storage after hydration.
  const [preferredWidth, setPreferredWidth] = useState(EDITOR_SIDEBAR_DEFAULT_WIDTH)
  const [maxWidth, setMaxWidth] = useState(EDITOR_SIDEBAR_MAX_WIDTH)
  const [isDragging, setIsDragging] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)
  const cleanupDragRef = useRef<(() => void) | null>(null)
  const width = clampWidth(preferredWidth, maxWidth)

  const cancelDrag = useCallback((updateState = true) => {
    cleanupDragRef.current?.()
    if (updateState) setIsDragging(false)
  }, [])

  useEffect(() => {
    const container = sidebarRef.current?.parentElement
    let previousMax = EDITOR_SIDEBAR_MAX_WIDTH
    let previousViewport = window.innerWidth
    const measure = () => {
      const available = container?.getBoundingClientRect().width || window.innerWidth
      const nextMax = clampWidth(available - CANVAS_MIN_WIDTH)
      if (nextMax !== previousMax || window.innerWidth !== previousViewport) cancelDrag()
      previousMax = nextMax
      previousViewport = window.innerWidth
      setMaxWidth(nextMax)
    }
    const frame = window.requestAnimationFrame(() => {
      setPreferredWidth(readStoredWidth())
      measure()
    })
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    if (container) observer?.observe(container)
    window.addEventListener('resize', measure)
    return () => {
      window.cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [cancelDrag])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (!open) cancelDrag()
    })
    return () => {
      window.cancelAnimationFrame(frame)
      cancelDrag(false)
    }
  }, [open, cancelDrag])

  const commitWidth = (nextWidth: number) => {
    cancelDrag()
    const next = clampWidth(nextWidth, maxWidth)
    setPreferredWidth(next)
    storeWidth(next)
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!open || window.innerWidth < DESKTOP_BREAKPOINT || event.button !== 0 || cleanupDragRef.current) return
    event.preventDefault()
    const handle = event.currentTarget
    const pointerId = event.pointerId
    const startX = event.clientX
    const startWidth = width
    let latestWidth = width
    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    handle.focus({ preventScroll: true })
    handle.setPointerCapture?.(pointerId)
    setIsDragging(true)

    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      latestWidth = clampWidth(startWidth + startX - e.clientX, maxWidth)
      setPreferredWidth(latestWidth)
    }
    const finish = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      storeWidth(latestWidth)
      cancelDrag()
    }
    const blur = () => cancelDrag()
    const cleanup = () => {
      cleanupDragRef.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
      window.removeEventListener('blur', blur)
      handle.removeEventListener('lostpointercapture', finish)
      if (handle.hasPointerCapture?.(pointerId)) handle.releasePointerCapture(pointerId)
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
    }
    cleanupDragRef.current = cleanup
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
    window.addEventListener('blur', blur)
    handle.addEventListener('lostpointercapture', finish)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 80 : 16
    const next = {
      ArrowLeft: width + step,
      ArrowRight: width - step,
      Home: EDITOR_SIDEBAR_MIN_WIDTH,
      End: maxWidth,
    }[event.key]
    if (next === undefined) return
    event.preventDefault()
    commitWidth(next)
  }

  return (
    <aside
      ref={sidebarRef}
      aria-label={label}
      data-editor-workspace
      data-sidebar-open={open ? 'true' : 'false'}
      data-sidebar-resizing={isDragging ? 'true' : 'false'}
      className={`print:hidden relative min-w-0 w-full md:w-[360px] lg:w-[var(--editor-sidebar-width)] lg:max-w-[max(360px,calc(100%_-_480px))] border-l border-slate-200 bg-white shrink-0 h-full overflow-hidden ${className}`}
      style={{ '--editor-sidebar-width': `${width}px` } as CSSProperties}
    >
      <div
        role="separator"
        aria-label="调整编辑工具栏宽度"
        aria-orientation="vertical"
        aria-valuemin={EDITOR_SIDEBAR_MIN_WIDTH}
        aria-valuemax={maxWidth}
        aria-valuenow={width}
        aria-valuetext={`${width} 像素`}
        tabIndex={open ? 0 : -1}
        title="拖动调整宽度，双击恢复默认宽度"
        data-testid="editor-sidebar-resize-handle"
        data-dragging={isDragging ? 'true' : 'false'}
        className="group absolute inset-y-0 left-0 z-20 hidden w-2 cursor-col-resize touch-none items-center justify-center outline-none lg:flex"
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
        onDoubleClick={() => commitWidth(EDITOR_SIDEBAR_DEFAULT_WIDTH)}
      >
        <span className="h-12 w-1 rounded-full bg-slate-200 transition-colors group-hover:bg-violet-300 group-focus-visible:bg-violet-500 group-data-[dragging=true]:bg-violet-500" />
      </div>
      {children}
    </aside>
  )
}
