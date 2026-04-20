'use client'

import { useState, type ReactElement } from 'react'
import {
  DndContext,
  closestCenter,
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
import { KeyboardSensor } from '@dnd-kit/core'
import { Shuffle, Check } from 'lucide-react'
import type { Section } from '@/entities/resume/section'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import { findModuleBySectionTitle } from '@/entities/module/module-config'
import { SectionPreview } from './section-preview'
import { htmlToPlainText } from '@/features/edit/form-fields/html-text'

interface SectionsListProps {
  readonly sections: readonly Section[]
}

/**
 * Renders the resume's sections as previews. Supports a "reorder mode"
 * toggled by the user where each card gets a drag handle.
 */
export function SectionsList({ sections }: SectionsListProps): ReactElement | null {
  const reorder = useDraftStore((s) => s.reorderSections)
  const [manageMode, setManageMode] = useState<boolean>(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const nonEmpty: readonly Section[] = sections.filter((s) => !isSectionEmpty(s))
  if (nonEmpty.length === 0) return null

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIdx: number = sections.findIndex((s) => s.id === active.id)
    const toIdx: number = sections.findIndex((s) => s.id === over.id)
    if (fromIdx < 0 || toIdx < 0) return
    reorder(fromIdx, toIdx)
  }

  const items: string[] = nonEmpty.map((s) => s.id)

  return (
    <div className="mt-5 px-5">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          你的简历内容
        </span>
        <div className="flex-1 h-px bg-slate-100" />
        {nonEmpty.length >= 2 && (
          <button
            type="button"
            onClick={(): void => setManageMode((v) => !v)}
            className="text-[11px] text-violet-600 px-2 py-1 rounded hover:bg-violet-50 flex items-center gap-1"
          >
            {manageMode ? <><Check size={11} /> 完成</> : <><Shuffle size={11} /> 排序</>}
          </button>
        )}
      </div>

      {manageMode ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3">
              {nonEmpty.map((s) => (
                <SortableSectionRow key={s.id} section={s} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="flex flex-col gap-3">
          {nonEmpty.map((s) => (
            <SectionPreview
              key={s.id}
              section={s}
              module={findModuleBySectionTitle(s.title) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function isSectionEmpty(section: Section): boolean {
  if (section.blocks.length === 0) return true
  if (section.blocks.length === 1 && section.blocks[0].type === 'text') {
    return !htmlToPlainText(section.blocks[0].html)
  }
  return false
}

function SortableSectionRow({ section }: { readonly section: Section }): ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  const module = findModuleBySectionTitle(section.title) ?? null
  return (
    <div ref={setNodeRef} style={style}>
      <SectionPreview
        section={section}
        module={module}
        dragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

/* Re-export default noop to keep module shape */
export default SectionsList
