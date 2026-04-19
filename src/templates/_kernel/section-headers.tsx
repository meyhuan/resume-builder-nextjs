import { useState } from 'react'
import type { ReactElement } from 'react'
import { PlusCircle, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SectionHeaderSpec } from './types'
import { hexToRgba } from './shared'

export interface KernelSectionHeaderProps {
  readonly title: string
  readonly themeColor: string
  readonly spec: SectionHeaderSpec
  readonly onTitleChange?: (t: string) => void
  readonly onAdd?: () => void
  readonly onDelete?: () => void
  readonly dragHandleAttributes?: unknown
  readonly dragHandleListeners?: unknown
  readonly dragHandleRef?: (el: HTMLElement | null) => void
}

export function KernelSectionHeader(props: KernelSectionHeaderProps): ReactElement {
  const { spec } = props
  switch (spec.variant) {
    case 'underline':
      return <UnderlineSectionHeader {...props} />
    case 'left-bar':
      return <LeftBarSectionHeader {...props} />
    case 'ribbon-banner':
      return <RibbonBannerSectionHeader {...props} />
    case 'dot-before':
      return <DotBeforeSectionHeader {...props} />
    case 'plain-bold':
      return <PlainBoldSectionHeader {...props} />
  }
}

// ---------------------------------------------------------------------------
// Shared action cluster
// ---------------------------------------------------------------------------

interface ActionProps {
  readonly onAdd?: () => void
  readonly onDelete?: () => void
  readonly dragHandleAttributes?: unknown
  readonly dragHandleListeners?: unknown
  readonly dragHandleRef?: (el: HTMLElement | null) => void
}

function useHoverActions(p: ActionProps): {
  readonly isHovered: boolean
  readonly handlers: { onMouseEnter: () => void; onMouseLeave: () => void }
  readonly actionsMenu: ReactElement | null
} {
  const { onAdd, onDelete, dragHandleAttributes, dragHandleListeners, dragHandleRef } = p
  const [isHovered, setIsHovered] = useState(false)
  const hasActions = Boolean(onAdd || onDelete || (dragHandleAttributes && dragHandleListeners && dragHandleRef !== undefined))
  const handlers = {
    onMouseEnter: () => { if (hasActions) setIsHovered(true) },
    onMouseLeave: () => { setIsHovered(false) },
  }
  const actionsMenu = isHovered && hasActions ? (
    <div className="absolute top-0 right-2 flex items-center gap-0.5 print:hidden bg-white shadow-md rounded-md px-1 py-0.5 border border-slate-200 z-10">
      {onAdd && (
        <Button variant="ghost" size="sm" onClick={onAdd} className="h-6 px-2 text-[11px] gap-1 text-slate-600 hover:!bg-slate-100" title="添加">
          <PlusCircle className="h-3 w-3" />
          <span>添加</span>
        </Button>
      )}
      {onDelete && (
        <Button variant="ghost" size="sm" onClick={onDelete} className="h-6 px-2 text-[11px] gap-1 text-slate-600 hover:!text-red-600 hover:!bg-red-50" title="删除">
          <Trash2 className="h-3 w-3" />
          <span>删除</span>
        </Button>
      )}
      {!!dragHandleAttributes && !!dragHandleListeners && !!dragHandleRef && (
        <Button
          variant="ghost" size="sm" ref={dragHandleRef}
          /* eslint-disable @typescript-eslint/no-explicit-any */
          {...(dragHandleAttributes as Record<string, any>)}
          {...(dragHandleListeners as Record<string, any>)}
          /* eslint-enable @typescript-eslint/no-explicit-any */
          className="h-6 w-6 px-0 cursor-grab active:cursor-grabbing text-slate-600 hover:!bg-slate-100" title="拖动"
        >
          <GripVertical className="h-3 w-3" />
        </Button>
      )}
    </div>
  ) : null
  return { isHovered, handlers, actionsMenu }
}

// ---------------------------------------------------------------------------
// Editable title (inline)
// ---------------------------------------------------------------------------

function EditableTitle(props: {
  readonly title: string
  readonly color?: string
  readonly onTitleChange?: (v: string) => void
  readonly className?: string
}): ReactElement {
  const { title, color, onTitleChange, className } = props
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(title)
  if (editing && onTitleChange) {
    return (
      <input
        autoFocus
        className={`font-bold bg-transparent border-b-2 border-violet-400 outline-none ${className || ''}`}
        style={{ color }}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          const t = value.trim()
          if (t && t !== title) onTitleChange(t)
          setEditing(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') { setValue(title); setEditing(false) }
        }}
      />
    )
  }
  return (
    <h2
      className={`font-bold ${onTitleChange ? 'cursor-text' : ''} ${className || ''}`}
      style={{ color }}
      onClick={() => { if (onTitleChange) { setValue(title); setEditing(true) } }}
    >
      {title}
    </h2>
  )
}

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

function UnderlineSectionHeader(props: KernelSectionHeaderProps): ReactElement {
  const { title, themeColor, spec, onTitleChange } = props
  const { handlers, actionsMenu } = useHoverActions(props)
  const color = spec.variant === 'underline' ? (spec.color ?? themeColor) : themeColor
  const thickness = spec.variant === 'underline' ? (spec.thickness ?? 2) : 2
  return (
    <div className="relative pb-1 mb-3" style={{ borderBottom: `${thickness}px solid ${color}` }} {...handlers}>
      <EditableTitle title={title} color="#111827" onTitleChange={onTitleChange} className="text-[1.25em] tracking-wide" />
      {actionsMenu}
    </div>
  )
}

function LeftBarSectionHeader(props: KernelSectionHeaderProps): ReactElement {
  const { title, themeColor, spec, onTitleChange } = props
  const { handlers, actionsMenu } = useHoverActions(props)
  const color = spec.variant === 'left-bar' ? (spec.color ?? themeColor) : themeColor
  const gradient = spec.variant === 'left-bar' && spec.fillGradient
  return (
    <div
      className="relative w-full mb-4 pl-4 py-1"
      style={{
        borderLeft: `3px solid ${color}`,
        background: gradient ? `linear-gradient(90deg, ${hexToRgba(color, 0.1)} 0%, transparent 100%)` : undefined,
      }}
      {...handlers}
    >
      <EditableTitle title={title} color="#111827" onTitleChange={onTitleChange} className="text-[1.15em]" />
      {actionsMenu}
    </div>
  )
}

function RibbonBannerSectionHeader(props: KernelSectionHeaderProps): ReactElement {
  const { title, spec, onTitleChange } = props
  const { handlers, actionsMenu } = useHoverActions(props)
  if (spec.variant !== 'ribbon-banner') return <></>
  const height = spec.height ?? 30
  return (
    <div className="relative mb-4" {...handlers}>
      <div className="flex items-stretch">
        <div
          className="relative flex items-center pl-4 pr-10"
          style={{
            height,
            background: `linear-gradient(90deg, ${spec.from} 0%, ${spec.to} 100%)`,
            borderTopLeftRadius: 4,
            borderBottomLeftRadius: 4,
          }}
        >
          <EditableTitle title={title} color="#ffffff" onTitleChange={onTitleChange} className="text-[1.05em] relative z-10" />
          {spec.angleTail !== false && (
            <div
              className="absolute top-0 right-0 h-full"
              style={{
                width: height * 0.8,
                transform: `translateX(${height * 0.8}px)`,
                background: `linear-gradient(135deg, ${spec.to} 50%, transparent 50%)`,
              }}
            />
          )}
        </div>
        <div className="flex-1" />
      </div>
      {actionsMenu}
    </div>
  )
}

function DotBeforeSectionHeader(props: KernelSectionHeaderProps): ReactElement {
  const { title, themeColor, spec, onTitleChange } = props
  const { handlers, actionsMenu } = useHoverActions(props)
  const dotColor = spec.variant === 'dot-before' ? (spec.dotColor ?? themeColor) : themeColor
  return (
    <div className="relative flex items-center gap-2 mb-3" {...handlers}>
      <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
      <EditableTitle title={title} color="#111827" onTitleChange={onTitleChange} className="text-[1.15em]" />
      {actionsMenu}
    </div>
  )
}

function PlainBoldSectionHeader(props: KernelSectionHeaderProps): ReactElement {
  const { title, onTitleChange } = props
  const { handlers, actionsMenu } = useHoverActions(props)
  return (
    <div className="relative mb-2" {...handlers}>
      <EditableTitle title={title} color="#111827" onTitleChange={onTitleChange} className="text-[1.2em]" />
      {actionsMenu}
    </div>
  )
}
