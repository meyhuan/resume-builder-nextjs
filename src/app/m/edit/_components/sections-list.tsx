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
import { Check } from 'lucide-react'
import type { Section } from '@/entities/resume/section'
import type { ModuleConfig } from '@/entities/module/module-config'
import { findModuleBySectionTitle } from '@/entities/module/module-config'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import { useSectionList } from '@/features/edit/draft/use-section-list'
import { htmlToPlainText } from '@/features/edit/form-fields/html-text'
import { SectionPreview } from './section-preview'

interface SectionsListProps {
  readonly sections: readonly Section[]
}

/**
 * Renders resume sections as a compact, task-oriented module list.
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
    <div className="mt-2 px-[18px]">
      {nonEmpty.length >= 2 && manageMode && (
        <div className="mb-2 flex justify-end px-1">
          <button
            type="button"
            onClick={(): void => setManageMode(false)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] text-slate-600 hover:bg-slate-100"
          >
            <Check size={12} /> 完成
          </button>
        </div>
      )}

      {manageMode ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {nonEmpty.map((s) => (
                <SortableSectionRow key={s.id} section={s} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="flex flex-col gap-2">
          {nonEmpty.map((s) => (
            <SectionPreviewWithAdd
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
  return section.blocks.every((block) => {
    switch (block.type) {
      case 'project':
        return !block.name && !block.role && !block.contentHtml
      case 'experience':
        return !block.company && !block.position && !block.contentHtml
      case 'education':
        return !block.school && !block.major && !block.degree
      case 'campus':
        return !block.organization && !block.position && !block.contentHtml
      default:
        return false
    }
  })
}

function SectionPreviewWithAdd(
  { section, module }: { readonly section: Section; readonly module: ModuleConfig | null },
): ReactElement {
  if (module?.isList && module.sectionTitle) {
    return <ListSectionPreview section={section} module={module} />
  }
  return <SectionPreview section={section} module={module} />
}

function ListSectionPreview(
  { section, module }: { readonly section: Section; readonly module: ModuleConfig },
): ReactElement {
  const { addBlock, blocks } = useSectionList(module.sectionTitle!)
  const onAddItem = useCallback((): number => {
    addBlock()
    return blocks.length
  }, [addBlock, blocks.length])
  return <SectionPreview section={section} module={module} onAddItem={onAddItem} />
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

export default SectionsList
