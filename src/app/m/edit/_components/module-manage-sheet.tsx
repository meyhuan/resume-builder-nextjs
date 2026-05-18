'use client'

import { useCallback, useState, type ReactElement } from 'react'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { Section } from '@/entities/resume/section'
import { findModuleBySectionTitle } from '@/entities/module/module-config'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import { createLogger } from '@/lib/logger'
import { cn } from '@/lib/utils'

const log = createLogger('m/edit/module-manage-sheet')

interface ModuleManageSheetProps {
  readonly open: boolean
  readonly onClose: () => void
}

/**
 * Bottom sheet for module management: drag-reorder and delete sections.
 */
export function ModuleManageSheet({ open, onClose }: ModuleManageSheetProps): ReactElement {
  const draft = useDraftStore((s) => s.draft)
  const reorder = useDraftStore((s) => s.reorderSections)
  const removeSection = useDraftStore((s) => s.removeSection)

  const sections = draft?.sections ?? []

  const [pendingRemove, setPendingRemove] = useState<Section | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent): void => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const fromIdx = sections.findIndex((s) => s.id === active.id)
      const toIdx = sections.findIndex((s) => s.id === over.id)
      if (fromIdx < 0 || toIdx < 0) return
      log.info('reorder', { fromIdx, toIdx })
      reorder(fromIdx, toIdx)
    },
    [sections, reorder],
  )

  const handleConfirmRemove = useCallback((): void => {
    if (!pendingRemove) return
    log.info('remove section', { id: pendingRemove.id, title: pendingRemove.title })
    removeSection(pendingRemove.id)
    toast.success(`已移除「${pendingRemove.title}」`)
    setPendingRemove(null)
  }, [pendingRemove, removeSection])

  const items = sections.map((s) => s.id)

  const pendingLabel =
    pendingRemove
      ? (findModuleBySectionTitle(pendingRemove.title)?.label ?? pendingRemove.title)
      : ''

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title="模块管理"
        height="75dvh"
        contentClassName="pb-safe"
      >
        <p className="mb-3 text-[12px] text-slate-400">
          长按拖动调整顺序；点击红色删除按钮移除模块。
        </p>

        {sections.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-slate-400">
            暂无模块，请先在编辑页添加内容
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {sections.map((section) => (
                  <SortableManageRow
                    key={section.id}
                    section={section}
                    onRequestRemove={setPendingRemove}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </BottomSheet>

      <ConfirmDialog
        open={!!pendingRemove}
        onOpenChange={(v): void => { if (!v) setPendingRemove(null) }}
        title={`删除「${pendingLabel}」`}
        description={`删除后该模块的所有内容将丢失，且无法恢复。确定要删除吗？`}
        confirmText="删除"
        cancelText="取消"
        variant="destructive"
        onConfirm={handleConfirmRemove}
      />
    </>
  )
}

interface ManageRowProps {
  readonly section: Section
  readonly onRequestRemove: (section: Section) => void
}

function SortableManageRow({ section, onRequestRemove }: ManageRowProps): ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const moduleConfig = findModuleBySectionTitle(section.title)
  const label = moduleConfig?.label ?? section.title
  const isRequired = moduleConfig?.required ?? false

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 rounded-[14px] border border-[#edf0f5] bg-white px-3 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-shadow',
        isDragging && 'ring-2 ring-violet-300 shadow-lg',
      )}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex h-8 w-6 shrink-0 touch-none cursor-grab items-center justify-center text-slate-300 active:cursor-grabbing"
      >
        <GripVertical size={17} />
      </div>

      {/* Label + subtitle */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-slate-900">{label}</div>
        <div className="mt-0.5 text-[11px] text-slate-400">
          {section.blocks.length > 0 ? `${section.blocks.length} 条内容` : '未填写'}
        </div>
      </div>

      {/* Delete button — only for non-required modules */}
      {isRequired ? (
        <div className="h-8 w-8 shrink-0" />
      ) : (
        <button
          type="button"
          onClick={(): void => onRequestRemove(section)}
          aria-label={`删除${label}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-red-400 transition-colors hover:bg-red-50 active:bg-red-100"
        >
          <Trash2 size={15} strokeWidth={2.2} />
        </button>
      )}
    </div>
  )
}
