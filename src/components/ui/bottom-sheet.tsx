'use client'

import { type ReactElement, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Props for the mobile bottom sheet component.
 */
export interface BottomSheetProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly title?: string
  readonly height?: string
  readonly children: ReactNode
  readonly showHandle?: boolean
  readonly showCloseButton?: boolean
  readonly contentClassName?: string
}

/**
 * Reusable mobile bottom sheet with fixed height, scrollable body,
 * backdrop overlay and slide-up animation.
 */
export function BottomSheet(props: BottomSheetProps): ReactElement {
  const {
    open,
    onClose,
    title,
    height = '480px',
    children,
    showHandle = true,
    showCloseButton = true,
    contentClassName,
  } = props
  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/30 transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 flex flex-col',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
        style={{ height }}
        role="dialog"
        aria-modal="true"
      >
        {showHandle && (
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1 w-10 rounded bg-slate-300" />
          </div>
        )}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-5 py-2 shrink-0 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900">{title ?? ''}</h3>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
                aria-label="关闭"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className={cn('flex-1 overflow-y-auto px-5 py-4', contentClassName)}>{children}</div>
      </div>
    </>
  )
}
