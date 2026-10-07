'use client'

import { useState, type ReactElement } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { X } from 'lucide-react'
import type { BaseInfo } from '@/entities/user/base-info'
import { useAppStore } from '@/state/store'
import { AvatarSizeControl } from './avatar-size-control'

/** Editor-only overlay. Portalling keeps controls unscaled and out of exported HTML. */
export function AvatarActions({ baseInfo, name, onUpload, maxScale = 1.4, hovered = false }: {
  readonly baseInfo: BaseInfo | null
  readonly name: string
  readonly onUpload: () => void
  readonly maxScale?: number
  readonly hovered?: boolean
}): ReactElement | null {
  const readOnly = useAppStore((state) => state.readOnly)
  const updateBaseInfo = useAppStore((state) => state.updateBaseInfo)
  const [open, setOpen] = useState(false)
  if (readOnly) return null
  return <div data-avatar-actions="true" data-export-hide="true" className="absolute inset-0 z-30 flex flex-col items-center justify-end gap-1 p-1 font-sans print:hidden pointer-events-none"
    onClick={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
    <button type="button" onClick={onUpload}
      className={`pointer-events-auto max-w-full rounded bg-slate-900/80 px-2 py-1 text-[11px] font-medium leading-normal text-white hover:bg-slate-900 focus:opacity-100 ${hovered || !baseInfo?.avatarUrl ? '' : 'opacity-0 [@media(hover:none)]:opacity-100'}`}>
      本地上传
    </button>
    {baseInfo?.avatarUrl && <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" className="pointer-events-auto max-w-full whitespace-nowrap rounded bg-white/95 px-2 py-1 text-[11px] font-medium leading-normal text-violet-700 shadow-sm hover:bg-violet-50" aria-label="调整照片大小">调整大小</button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side="right" align="start" sideOffset={12} collisionPadding={16}
          className="z-[70] w-64 max-w-[calc(100vw-32px)] rounded-xl border border-slate-200 bg-white p-4 font-sans text-slate-800 shadow-xl print:hidden"
          onClick={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-semibold">照片大小</h2>
            <Popover.Close aria-label="关闭照片大小设置" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"><X size={16} /></Popover.Close>
          </div>
          <AvatarSizeControl value={baseInfo.avatarSize} maxScale={maxScale} onChange={(avatarSize) => {
            const latest = useAppStore.getState().resume
            updateBaseInfo({ ...(latest.baseInfo ?? baseInfo), avatarSize }, latest.name || name)
          }} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>}
  </div>
}
