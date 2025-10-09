import type { ReactElement, ReactNode } from 'react'
import { useState } from 'react'
import { DndContext, MouseSensor, TouchSensor, DragOverlay, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import OverlaySection from '@/dnd/overlay-section'
import OverlayBlock from '@/dnd/overlay-block'
import { DndIds } from '@/dnd/ids'

interface DragDropProviderProps {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
  readonly children: ReactNode
  readonly onMoveSection: (activeSectionId: string, overSectionId: string) => void
  readonly onMoveWithinSection: (sectionId: string, activeId: string, overId: string) => void
  readonly onMoveToSection: (fromSectionId: string, blockId: string, toSectionId: string, toIndex: number) => void
  readonly renderSectionOverlay?: (sectionId: string) => ReactNode
}

/**
 * DragDropProvider wires dnd-kit sensors, DndContext, overlay, and section SortableContext.
 * It delegates actual data mutations to callbacks provided by the caller.
 */
export default function DragDropProvider(props: DragDropProviderProps): ReactElement {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  const [active, setActive] = useState<{ kind: 'section' | 'block'; id: string } | null>(null)

  function findSectionIdByBlockId(blockId: string): string | undefined {
    for (const sec of props.resume.sections) {
      if (sec.blocks.some((b) => b.id === blockId)) return sec.id
    }
    return undefined
  }

  function indexOfBlock(sectionId: string, blockId: string): number {
    const sec = props.resume.sections.find((s) => s.id === sectionId)
    if (!sec) return -1
    return sec.blocks.findIndex((b) => b.id === blockId)
  }

  function handleDragStart(event: { active: { id: string | number } }): void {
    const id: string = String(event.active.id)
    if (id.startsWith(DndIds.SECTION_SORT_ID_PREFIX)) {
      setActive({ kind: 'section', id: id.replace(DndIds.SECTION_SORT_ID_PREFIX, '') })
    } else {
      setActive({ kind: 'block', id })
    }
  }

  function handleDragEnd(event: { active: { id: string | number }; over: { id: string | number } | null }): void {
    const activeId: string = String(event.active.id)
    const overId: string | undefined = event.over ? String(event.over.id) : undefined
    if (!overId || activeId === overId) {
      setActive(null)
      return
    }
    // Section-level sorting
    if (activeId.startsWith(DndIds.SECTION_SORT_ID_PREFIX)) {
      const activeSectionId: string = activeId.replace(DndIds.SECTION_SORT_ID_PREFIX, '')
      let overSectionId: string | undefined
      if (overId.startsWith(DndIds.SECTION_SORT_ID_PREFIX)) {
        overSectionId = overId.replace(DndIds.SECTION_SORT_ID_PREFIX, '')
      } else if (overId.startsWith(DndIds.SECTION_DROP_ID_PREFIX)) {
        overSectionId = overId.replace(DndIds.SECTION_DROP_ID_PREFIX, '')
      } else {
        overSectionId = findSectionIdByBlockId(overId)
      }
      if (overSectionId && overSectionId !== activeSectionId) {
        props.onMoveSection(activeSectionId, overSectionId)
      }
      setActive(null)
      return
    }
    // Block moves
    const fromSectionId = findSectionIdByBlockId(activeId)
    const toSectionId = overId.startsWith(DndIds.SECTION_DROP_ID_PREFIX) ? overId.replace(DndIds.SECTION_DROP_ID_PREFIX, '') : findSectionIdByBlockId(overId)
    if (!fromSectionId || !toSectionId) {
      setActive(null)
      return
    }
    if (fromSectionId === toSectionId) {
      props.onMoveWithinSection(fromSectionId, activeId, overId)
      setActive(null)
      return
    }
    const toIndex: number = overId.startsWith(DndIds.SECTION_DROP_ID_PREFIX) ? Number.MAX_SAFE_INTEGER : Math.max(0, indexOfBlock(toSectionId, overId))
    props.onMoveToSection(fromSectionId, activeId, toSectionId, toIndex)
    setActive(null)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart as never} onDragEnd={handleDragEnd as never} onDragCancel={(): void => setActive(null)}>
      <SortableContext items={props.resume.sections.map((s) => `${DndIds.SECTION_SORT_ID_PREFIX}${s.id}`)} strategy={verticalListSortingStrategy}>
        {props.children}
      </SortableContext>
      <DragOverlay dropAnimation={{ duration: 150, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
        {(() => {
          if (!active) return null
          if (active.kind === 'section') {
            if (props.renderSectionOverlay) {
              return (
                <div className="cursor-grabbing bg-white shadow-2xl rounded-lg">
                  {props.renderSectionOverlay(active.id)}
                </div>
              )
            }
            const title: string = props.resume.sections.find((s) => s.id === active.id)?.title ?? ''
            return <OverlaySection title={title} themeColor={props.theme.primaryColor} />
          }
          let html: string = '<p>Block</p>'
          for (const s of props.resume.sections) {
            const blk = s.blocks.find((b) => b.id === active.id)
            if (blk && blk.type === 'text') {
              html = blk.html
              break
            }
          }
          return <OverlayBlock html={html} />
        })()}
      </DragOverlay>
    </DndContext>
  )
}
