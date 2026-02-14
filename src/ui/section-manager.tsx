/**
 * SectionManager — 模块管理面板
 *
 * Top: current resume sections (个人信息 pinned with photo toggle,
 *      求职意向 + other sections with remove ⊖ buttons).
 * Bottom: "添加模块" — 2-column grid of predefined section types
 *         that are NOT already present in the resume.
 */
import { useState, useMemo } from 'react'
import type { ReactElement, ReactNode } from 'react'
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
import { MinusCircle, PlusSquare, X } from 'lucide-react'
import { useAppStore } from '@/state/store'
import type { Section } from '@/entities/resume/section'
import { getSectionTypeRegistry } from '@/entities/blocks/block-factory'

/** Derive addable section labels from the central registry. */
const PREDEFINED_LABELS: readonly string[] = getSectionTypeRegistry().map((e) => e.label)

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

  const sectionIds: string[] = resume.sections.map((s) => s.id)
  const existingTitles: Set<string> = useMemo(
    () => new Set(resume.sections.map((s) => s.title)),
    [resume.sections]
  )
  const availableLabels: string[] = useMemo(
    () => PREDEFINED_LABELS.filter((label) => !existingTitles.has(label)),
    [existingTitles]
  )

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

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
        {/* Pinned: 个人信息 */}
        <SectionRow label="个人信息">
          <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
            <input
              type="checkbox"
              className="accent-violet-600 w-3.5 h-3.5 rounded"
              checked={showPhotoAvatar}
              onChange={(e) => setShowPhotoAvatar(e.target.checked)}
            />
            照片
          </label>
        </SectionRow>

        {/* Pinned: 求职意向 */}
        <SectionRow label="求职意向">
          <RemoveButton onClick={() => {/* TODO: toggle jobIntention visibility */}} />
        </SectionRow>

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

        {/* Add module grid */}
        {availableLabels.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-semibold text-slate-700 mb-3">添加模块</p>
            <div className="grid grid-cols-2 gap-2">
              {availableLabels.map((label) => (
                <button
                  key={label}
                  type="button"
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-100 bg-white text-sm text-slate-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 transition-all shadow-sm"
                  onClick={() => addSection(label)}
                >
                  <PlusSquare size={16} className="text-violet-500 shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** A static (non-draggable) section row. */
function SectionRow(props: {
  readonly label: string
  readonly children?: ReactNode
}): ReactElement {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 mb-2 rounded-lg border border-slate-100 bg-white shadow-sm">
      <span className="text-sm font-medium text-slate-700">{props.label}</span>
      {props.children}
    </div>
  )
}

/** Circular ⊖ remove button matching the screenshot. */
function RemoveButton(props: { readonly onClick: () => void }): ReactElement {
  return (
    <button
      type="button"
      className="text-slate-300 hover:text-red-400 transition-colors"
      title="移除"
      onClick={props.onClick}
    >
      <MinusCircle size={18} />
    </button>
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
      className="flex items-center justify-between px-4 py-3.5 mb-2 rounded-lg border border-slate-100 bg-white shadow-sm cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <span className="text-sm font-medium text-slate-700">{section.title}</span>
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
