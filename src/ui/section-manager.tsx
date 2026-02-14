/**
 * SectionManager — 模块管理面板
 *
 * Allows reordering, removing, and adding resume sections.
 * 个人信息 and 求职意向 are pinned (non-draggable) at the top.
 * All other sections are drag-sortable via @dnd-kit.
 */
import { useState } from 'react'
import type { ReactElement } from 'react'
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, MinusCircle, PlusCircle, X } from 'lucide-react'
import { useAppStore } from '@/state/store'
import type { Section } from '@/entities/resume/section'

/** Props accepted by the top-level panel. */
export interface SectionManagerProps {
  readonly onClose: () => void
}

/**
 * 模块管理 panel rendered inside the right sidebar.
 */
export default function SectionManager(props: SectionManagerProps): ReactElement {
  const { onClose } = props
  const resume = useAppStore((s) => s.resume)
  const moveSection = useAppStore((s) => s.moveSection)
  const deleteSection = useAppStore((s) => s.deleteSection)
  const addSection = useAppStore((s) => s.addSection)
  const [showPhotoAvatar, setShowPhotoAvatar] = useState<boolean>(
    Boolean(resume.baseInfo?.avatarUrl)
  )

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event
    if (!over || active.id === over.id) return
    moveSection(String(active.id), String(over.id))
  }

  function handleAddCustomSection(): void {
    addSection('自定义模块')
  }

  const sectionIds: string[] = resume.sections.map((s) => s.id)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="text-lg font-bold text-slate-800">模块管理</h2>
        <button
          type="button"
          className="text-slate-400 hover:text-slate-600 transition-colors"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
        {/* Pinned: 个人信息 */}
        <PinnedRow label="个人信息">
          <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
            <input
              type="checkbox"
              className="accent-slate-600 w-3.5 h-3.5"
              checked={showPhotoAvatar}
              onChange={(e) => setShowPhotoAvatar(e.target.checked)}
            />
            照片
          </label>
        </PinnedRow>

        {/* Pinned: 求职意向 */}
        <PinnedRow label="求职意向">
          <button
            type="button"
            className="text-slate-300 hover:text-red-400 transition-colors"
            title="移除"
          >
            <MinusCircle size={18} />
          </button>
        </PinnedRow>

        {/* Draggable sections */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
            {resume.sections.map((section: Section) => (
              <SortableSectionRow
                key={section.id}
                section={section}
                onDelete={() => deleteSection(section.id)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Add module */}
        <div className="mt-6">
          <p className="text-sm font-medium text-slate-500 mb-2">添加模块</p>
          <button
            type="button"
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-violet-600 transition-colors px-2 py-2 rounded-lg hover:bg-violet-50 w-full"
            onClick={handleAddCustomSection}
          >
            <PlusCircle size={18} className="text-violet-500" />
            自定义模块
          </button>
        </div>
      </div>
    </div>
  )
}

/** A non-draggable pinned row (个人信息, 求职意向). */
function PinnedRow(props: {
  readonly label: string
  readonly children?: ReactElement
}): ReactElement {
  return (
    <div className="flex items-center justify-between px-3 py-3 mb-2 rounded-xl border border-slate-100 bg-white shadow-sm">
      <span className="text-sm font-medium text-slate-700">{props.label}</span>
      {props.children}
    </div>
  )
}

/** A draggable section row using @dnd-kit/sortable. */
function SortableSectionRow(props: {
  readonly section: Section
  readonly onDelete: () => void
}): ReactElement {
  const { section, onDelete } = props
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between px-3 py-3 mb-2 rounded-xl border border-slate-100 bg-white shadow-sm"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>
        <span className="text-sm font-medium text-slate-700">{section.title}</span>
      </div>
      <button
        type="button"
        className="text-slate-300 hover:text-red-400 transition-colors"
        title="移除"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        <MinusCircle size={18} />
      </button>
    </div>
  )
}
