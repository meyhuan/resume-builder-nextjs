'use client'

import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { Sheet, type SheetRef } from 'react-modal-sheet'
import { motion, useMotionValue, useMotionValueEvent, type MotionValue } from 'motion/react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const SNAPS = [0, 30 / 75, 50 / 75, 1]
const PERCENTAGES = [0, 30, 50, 75]

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  scrollRef?: RefObject<HTMLDivElement | null>
  sorting?: boolean
}

/** Nonmodal sheet: the flow spacer keeps the underlying page's last item reachable. */
export function ResizableMobileSheet(props: Props) {
  return props.open ? <OpenSheet key="open" {...props} /> : null
}

function OpenSheet(props: Props) {
  const sheetRef = useRef<SheetRef>(null)
  const visibleHeight = useMotionValue(0)
  return <>
    <motion.div aria-hidden="true" style={{ height: visibleHeight }} />
    <Sheet ref={sheetRef} isOpen onClose={props.onClose} initialSnap={2} snapPoints={SNAPS}
      onOpenEnd={() => sheetRef.current?.snapTo(2)}
      detent="full" disableDismiss disableScrollLocking disableDrag={props.sorting} avoidKeyboard={false}
      unstyled style={{ top: 'auto', height: '75dvh', zIndex: 40 }}>
      <Sheet.Container><SheetBody {...props} visibleHeight={visibleHeight} /></Sheet.Container>
    </Sheet>
  </>
}

function SheetBody({ title, onClose, children, scrollRef, sorting, visibleHeight }: Props & { visibleHeight: MotionValue<number> }) {
  const { currentSnap = 2, height, snapTo, yInverted } = Sheet.useContext()
  const measuredHeight = useRef(height)
  const panelRef = useRef<HTMLElement>(null)
  useMotionValueEvent(yInverted, 'change', value => visibleHeight.set(value))
  useEffect(() => { visibleHeight.set(yInverted.get()) }, [visibleHeight, yInverted])
  useEffect(() => {
    if (measuredHeight.current > 0 && height > 0 && measuredHeight.current !== height) snapTo(currentSnap)
    measuredHeight.current = height
  }, [height, currentSnap, snapTo])
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    panelRef.current?.focus({ preventScroll: true })
    return () => { previousFocus?.focus({ preventScroll: true }) }
  }, [])
  const expanded = currentSnap === 3
  return <motion.section ref={panelRef} tabIndex={-1} role="dialog" aria-modal="false" aria-label={title}
    data-resizable-mobile-sheet
    onKeyDown={event => {
      if (event.key === 'Escape' && !sorting && event.target === event.currentTarget) onClose()
    }}
    className="flex min-h-0 flex-col rounded-t-2xl border-t border-slate-200/80 bg-white shadow-[0_-8px_30px_rgba(15,23,42,0.12)] outline-none"
    style={{ height: yInverted, overflow: 'clip', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
    <Sheet.Header className="relative flex shrink-0 touch-none items-center justify-between gap-2 border-b border-slate-100 px-4 pb-1 pt-3">
      <span aria-hidden className="absolute left-1/2 top-2 h-1 w-9 -translate-x-1/2 rounded-full bg-slate-300" />
      <div role="slider" tabIndex={sorting ? -1 : 0} aria-label="调整面板高度" aria-orientation="vertical"
        aria-valuemin={30} aria-valuemax={75} aria-valuenow={PERCENTAGES[currentSnap]} aria-disabled={sorting}
        className="flex min-h-11 flex-1 cursor-ns-resize items-center text-[15px] font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-600"
        onKeyDown={event => {
          if (sorting) return
          const next = event.key === 'ArrowUp' ? Math.min(3, currentSnap + 1) : event.key === 'ArrowDown' ? Math.max(1, currentSnap - 1) : event.key === 'Home' ? 1 : event.key === 'End' ? 3 : null
          if (next !== null) { event.preventDefault(); snapTo(next) }
          if (event.key === 'Escape') onClose()
        }}>{title}</div>
      <div className="flex items-center gap-1.5" onPointerDown={event => event.stopPropagation()}>
        <button type="button" disabled={sorting} aria-label={expanded ? '收起调整面板' : '展开调整面板'} aria-expanded={expanded}
          onClick={() => snapTo(expanded ? 1 : 3)} className="flex min-h-11 items-center">
          <span className="flex h-8 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-600">
            {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}{expanded ? '收起' : '展开'}
          </span>
        </button>
        <button type="button" disabled={sorting} onClick={onClose} className="flex min-h-11 items-center">
          <span className="flex h-8 items-center rounded-full bg-violet-600 px-3.5 text-xs font-semibold text-white">完成</span>
        </button>
      </div>
    </Sheet.Header>
    {/* v5.7 unstyled mode mutates shared scroll styles; styled content has no decoration. */}
    <Sheet.Content unstyled={false} scrollRef={scrollRef}
      disableScroll={({ currentSnap: snap }) => !sorting && snap !== 3}
      scrollClassName="px-4 py-3" className="min-h-0 flex-1">
      <div onPointerDown={event => {
        if ((event.target as Element).closest('button, input, select, textarea, [contenteditable="true"]')) event.stopPropagation()
      }}>{children}</div>
    </Sheet.Content>
  </motion.section>
}
