'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react'

export const EDITOR_SIDEBAR_MIN_WIDTH = 360
export const EDITOR_SIDEBAR_STORAGE_KEY = 'resume-editor-sidebar-width-v2'
const EDITOR_MIN_WIDTH = 720
const DESKTOP_BREAKPOINT = 1024
const RESPONSIVE_DEFAULT_MIN = 420
const RESPONSIVE_DEFAULT_MAX = 600
const RESPONSIVE_DEFAULT_PERCENT = 0.34

function clampWidth(width: number, max: number): number {
  return Math.round(Math.min(max, Math.max(EDITOR_SIDEBAR_MIN_WIDTH, width)))
}

function computeResponsiveDefault(availableWidth: number): number {
  // Calculate 34% of available width, clamped to [420, 600]px
  const responsiveWidth = Math.round(availableWidth * RESPONSIVE_DEFAULT_PERCENT)
  let defaultWidth = Math.max(RESPONSIVE_DEFAULT_MIN, Math.min(RESPONSIVE_DEFAULT_MAX, responsiveWidth))
  
  // Ensure remaining area is at least 720px
  const remaining = availableWidth - defaultWidth
  if (remaining < EDITOR_MIN_WIDTH) {
    defaultWidth = availableWidth - EDITOR_MIN_WIDTH
    // But never go below absolute minimum
    if (defaultWidth < EDITOR_SIDEBAR_MIN_WIDTH) {
      defaultWidth = EDITOR_SIDEBAR_MIN_WIDTH
    }
  }
  
  return Math.round(defaultWidth)
}

function readStoredWidth(): number | null {
  try {
    const raw = window.localStorage.getItem(EDITOR_SIDEBAR_STORAGE_KEY)
    const value = raw?.trim() ? Number(raw) : NaN
    if (Number.isFinite(value)) return value
  } catch {
    // Storage may be unavailable in private or embedded browsers.
  }
  return null
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
  // SSR-safe: start with a CSS-based responsive default to avoid hydration flash
  const [preferredWidth, setPreferredWidth] = useState<number | null>(null)
  const [maxWidth, setMaxWidth] = useState(RESPONSIVE_DEFAULT_MAX)
  const [isDragging, setIsDragging] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)
  const cleanupDragRef = useRef<(() => void) | null>(null)
  
  // Compute actual width with fallback logic
  const computedWidth = preferredWidth !== null ? clampWidth(preferredWidth, maxWidth) : null

  const cancelDrag = useCallback((updateState = true) => {
    cleanupDragRef.current?.()
    if (updateState) setIsDragging(false)
  }, [])

  useEffect(() => {
    const container = sidebarRef.current?.parentElement
    let previousMax = RESPONSIVE_DEFAULT_MAX
    let previousViewport = window.innerWidth
    
    const measure = () => {
      const available = container?.getBoundingClientRect().width || window.innerWidth
      // Max width ensures at least 720px remains for editor
      const nextMax = Math.max(EDITOR_SIDEBAR_MIN_WIDTH, available - EDITOR_MIN_WIDTH)
      
      if (nextMax !== previousMax || window.innerWidth !== previousViewport) {
        cancelDrag()
      }
      previousMax = nextMax
      previousViewport = window.innerWidth
      setMaxWidth(nextMax)
      
      // On first mount or when preferred width is null, set the responsive default
      setPreferredWidth((current) => {
        const stored = readStoredWidth()
        if (stored !== null) {
          // User has a stored preference, clamp it to current constraints
          return clampWidth(stored, nextMax)
        }
        // No stored preference, use responsive default
        return current !== null ? clampWidth(current, nextMax) : computeResponsiveDefault(available)
      })
    }
    
    const frame = window.requestAnimationFrame(measure)
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
    if (!open || window.innerWidth < DESKTOP_BREAKPOINT || event.button !== 0 || cleanupDragRef.current || computedWidth === null) return
    event.preventDefault()
    const handle = event.currentTarget
    const pointerId = event.pointerId
    const startX = event.clientX
    const startWidth = computedWidth
    let latestWidth = computedWidth
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
    if (computedWidth === null) return
    const step = event.shiftKey ? 80 : 16
    const next = {
      ArrowLeft: computedWidth + step,
      ArrowRight: computedWidth - step,
      Home: EDITOR_SIDEBAR_MIN_WIDTH,
      End: maxWidth,
    }[event.key]
    if (next === undefined) return
    event.preventDefault()
    commitWidth(next)
  }

  // For SSR and hydration: use CSS clamp for initial render to avoid flash
  const cssWidth = computedWidth !== null 
    ? `${computedWidth}px` 
    : `clamp(${RESPONSIVE_DEFAULT_MIN}px, ${RESPONSIVE_DEFAULT_PERCENT * 100}vw, min(${RESPONSIVE_DEFAULT_MAX}px, calc(100% - ${EDITOR_MIN_WIDTH}px)))`

  return (
    <aside
      ref={sidebarRef}
      aria-label={label}
      data-editor-workspace
      data-sidebar-open={open ? 'true' : 'false'}
      data-sidebar-resizing={isDragging ? 'true' : 'false'}
      className={`print:hidden relative min-w-0 w-full md:w-[360px] lg:w-[var(--editor-sidebar-width)] lg:max-w-[max(360px,calc(100%_-_720px))] border-l border-slate-200 bg-white shrink-0 h-full overflow-hidden ${className}`}
      style={{ '--editor-sidebar-width': cssWidth } as CSSProperties}
    >
      <div
        role="separator"
        aria-label="调整编辑工具栏宽度"
        aria-orientation="vertical"
        aria-valuemin={EDITOR_SIDEBAR_MIN_WIDTH}
        aria-valuemax={maxWidth}
        aria-valuenow={computedWidth ?? RESPONSIVE_DEFAULT_MIN}
        aria-valuetext={`${computedWidth ?? RESPONSIVE_DEFAULT_MIN} 像素`}
        tabIndex={open ? 0 : -1}
        title="拖动调整宽度，双击恢复默认宽度"
        data-testid="editor-sidebar-resize-handle"
        data-dragging={isDragging ? 'true' : 'false'}
        className="group absolute inset-y-0 left-0 z-20 hidden w-2 cursor-col-resize touch-none items-center justify-center outline-none lg:flex"
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
        onDoubleClick={() => {
          const container = sidebarRef.current?.parentElement
          const available = container?.getBoundingClientRect().width || window.innerWidth
          commitWidth(computeResponsiveDefault(available))
        }}
      >
        <span className="h-12 w-1 rounded-full bg-slate-200 transition-colors group-hover:bg-violet-300 group-focus-visible:bg-violet-500 group-data-[dragging=true]:bg-violet-500" />
      </div>
      {children}
    </aside>
  )
}
