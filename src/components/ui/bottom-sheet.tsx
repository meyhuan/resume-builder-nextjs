'use client'

import { type ReactElement, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BottomSheetProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly title?: string
  readonly height?: string
  readonly children: ReactNode
  readonly showHandle?: boolean
  readonly showCloseButton?: boolean
  readonly contentClassName?: string
  readonly onCloseAutoFocus?: (event: Event) => void
}

/** A modal sheet with focus containment, scroll locking and a safe-area footer. */
export function BottomSheet({ open, onClose, title, height = '480px', children,
  showHandle = true, showCloseButton = true, contentClassName, onCloseAutoFocus }: BottomSheetProps): ReactElement {
  return <Dialog.Root open={open} onOpenChange={(next) => { if (!next) onClose() }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30" />
      <Dialog.Content aria-describedby={undefined} onCloseAutoFocus={onCloseAutoFocus}
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-white shadow-2xl"
        style={{ height, maxHeight: 'calc(100dvh - 24px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {showHandle && <div aria-hidden="true" className="flex shrink-0 justify-center pb-1 pt-3"><div className="h-1 w-10 rounded bg-slate-300" /></div>}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-2">
          <Dialog.Title className={cn('text-base font-semibold text-slate-900', !title && 'sr-only')}>{title || '选择'}</Dialog.Title>
          {showCloseButton && <Dialog.Close aria-label="关闭" className="flex size-11 items-center justify-center rounded-lg text-slate-500 active:bg-slate-100 focus-visible:outline-2 focus-visible:outline-violet-600"><X size={18} /></Dialog.Close>}
        </div>
        <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4', contentClassName)}>{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
