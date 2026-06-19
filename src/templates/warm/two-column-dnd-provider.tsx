/**
 * TwoColumnDndProvider — custom DnD context for the Warm two-column template.
 *
 * Supports:
 * - Section reordering within left/right columns
 * - Cross-column drag for TextBlock-only sections
 * - Block reordering within sections
 */
import { useState, createContext, useContext } from 'react'
import type { ReactElement, ReactNode } from 'react'
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  DragOverlay,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Section } from '@/entities/resume/section'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import OverlaySection from '@/dnd/overlay-section'
import OverlayBlock from '@/dnd/overlay-block'
import { DndIds } from '@/dnd/ids'

/** Droppable IDs for the two columns. */
export const COLUMN_LEFT_ID = 'warm-column-left'
export const COLUMN_RIGHT_ID = 'warm-column-right'

/** Context exposing cross-column drag state to children. */
interface CrossColumnDragState {
  /** The section ID currently being dragged, or null. */
  readonly activeSectionId: string | null
  /** The column droppable ID the drag is currently hovering over, or null. */
  readonly hoverColumnId: string | null
  /** Which column the dragged section originally belongs to. */
  readonly sourceColumnId: string | null
  /** Whether the active section is allowed to move to the other column. */
  readonly canMoveAcrossColumns: boolean
}

const CrossColumnDragContext = createContext<CrossColumnDragState>({
  activeSectionId: null,
  hoverColumnId: null,
  sourceColumnId: null,
  canMoveAcrossColumns: false,
})

/** Hook to read cross-column drag state from any child. */
export function useCrossColumnDrag(): CrossColumnDragState {
  return useContext(CrossColumnDragContext)
}

/** Check if every block in a section is a TextBlock. */
export function isTextOnlySection(section: Section): boolean {
  return section.blocks.length > 0 && section.blocks.every((b) => b.type === 'text')
}

interface TwoColumnDndProviderProps {
  readonly leftSections: Section[]
  readonly rightSections: Section[]
  readonly allSections: Section[]
  readonly theme: ThemeTokens
  readonly children: ReactNode
  /** Called when a section reorders within the right column. */
  readonly onMoveSection: (activeSectionId: string, overSectionId: string) => void
  /** Called when a block reorders within the same section. */
  readonly onMoveWithinSection: (sectionId: string, activeId: string, overId: string) => void
  /** Called when a block moves to a different section. */
  readonly onMoveToSection: (fromSectionId: string, blockId: string, toSectionId: string, toIndex: number) => void
  /** Called when a TextBlock section moves from one column to the other. */
  readonly onMoveSectionToColumn: (sectionId: string, toColumn: 'left' | 'right') => void
  /** Which sections may move between columns. Defaults to text-only sections. */
  readonly canMoveSectionToColumn?: (section: Section) => boolean
  readonly renderSectionOverlay?: (sectionId: string) => ReactNode
}

/**
 * Droppable wrapper for a column.
 * Shows an inline drop placeholder when a section from the OTHER column hovers over this one.
 */
export function ColumnDroppable(props: {
  readonly id: string
  readonly children: ReactNode
  readonly className?: string
}): ReactElement {
  const { setNodeRef, isOver } = useDroppable({ id: props.id })
  const { activeSectionId, hoverColumnId, sourceColumnId, canMoveAcrossColumns } = useCrossColumnDrag()
  const isCrossColumnHover = activeSectionId !== null
    && canMoveAcrossColumns
    && hoverColumnId === props.id
    && sourceColumnId !== null
    && sourceColumnId !== props.id
  return (
    <div
      ref={setNodeRef}
      className={`relative ${props.className || ''} ${isOver || isCrossColumnHover ? 'ring-2 ring-violet-400/40' : ''}`.trim()}
    >
      {props.children}
    </div>
  )
}

/** Inline placeholder rendered inside the destination column's section list. */
export function CrossColumnPlaceholder(props: {
  readonly columnId: string
}): ReactElement | null {
  const { activeSectionId, hoverColumnId, sourceColumnId, canMoveAcrossColumns } = useCrossColumnDrag()
  const show = activeSectionId !== null
    && canMoveAcrossColumns
    && hoverColumnId === props.columnId
    && sourceColumnId !== null
    && sourceColumnId !== props.columnId
  if (!show) return null
  return (
    <div
      className="border-2 border-dashed border-violet-400/60 rounded-lg flex items-center justify-center bg-violet-50/40 pointer-events-none"
      style={{ height: '80px' }}
    >
      <span className="text-violet-500 text-xs font-medium">释放以移动到此列</span>
    </div>
  )
}

export default function TwoColumnDndProvider(props: TwoColumnDndProviderProps): ReactElement {
  const {
    leftSections,
    rightSections,
    allSections,
    theme,
    children,
    onMoveSection,
    onMoveWithinSection,
    onMoveToSection,
    onMoveSectionToColumn,
    canMoveSectionToColumn,
    renderSectionOverlay,
  } = props

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  const [active, setActive] = useState<{ kind: 'section' | 'block'; id: string } | null>(null)
  const [hoverColumnId, setHoverColumnId] = useState<string | null>(null)

  function findSectionIdByBlockId(blockId: string): string | undefined {
    for (const sec of allSections) {
      if (sec.blocks.some((b) => b.id === blockId)) return sec.id
    }
    return undefined
  }

  function indexOfBlock(sectionId: string, blockId: string): number {
    const sec = allSections.find((s) => s.id === sectionId)
    if (!sec) return -1
    return sec.blocks.findIndex((b) => b.id === blockId)
  }

  function isInLeftColumn(sectionId: string): boolean {
    return leftSections.some((s) => s.id === sectionId)
  }

  function canSectionMoveAcrossColumns(section: Section | undefined): boolean {
    if (!section) return false
    return canMoveSectionToColumn ? canMoveSectionToColumn(section) : isTextOnlySection(section)
  }

  function handleDragStart(event: DragStartEvent): void {
    const id: string = String(event.active.id)
    if (id.startsWith(DndIds.SECTION_SORT_ID_PREFIX)) {
      setActive({ kind: 'section', id: id.replace(DndIds.SECTION_SORT_ID_PREFIX, '') })
    } else {
      setActive({ kind: 'block', id })
    }
    setHoverColumnId(null)
  }

  function handleDragOver(event: DragOverEvent): void {
    const overId = event.over ? String(event.over.id) : null
    if (!overId || !active || active.kind !== 'section') {
      setHoverColumnId(null)
      return
    }
    const activeSection = allSections.find((s) => s.id === active.id)
    if (!canSectionMoveAcrossColumns(activeSection)) {
      setHoverColumnId(null)
      return
    }
    if (overId === COLUMN_LEFT_ID || overId === COLUMN_RIGHT_ID) {
      setHoverColumnId(overId)
      return
    }
    // Hovering over a section/block — resolve which column it belongs to
    let targetSectionId: string | undefined
    if (overId.startsWith(DndIds.SECTION_SORT_ID_PREFIX)) {
      targetSectionId = overId.replace(DndIds.SECTION_SORT_ID_PREFIX, '')
    } else if (overId.startsWith(DndIds.SECTION_DROP_ID_PREFIX)) {
      targetSectionId = overId.replace(DndIds.SECTION_DROP_ID_PREFIX, '')
    } else {
      targetSectionId = findSectionIdByBlockId(overId)
    }
    if (targetSectionId) {
      setHoverColumnId(isInLeftColumn(targetSectionId) ? COLUMN_LEFT_ID : COLUMN_RIGHT_ID)
    } else {
      setHoverColumnId(null)
    }
  }

  /** Resolve the column droppable ID for the currently dragged section. */
  const sourceColumnId: string | null = active?.kind === 'section'
    ? (isInLeftColumn(active.id) ? COLUMN_LEFT_ID : COLUMN_RIGHT_ID)
    : null
  const activeSection = active?.kind === 'section' ? allSections.find((s) => s.id === active.id) : undefined

  function handleDragEnd(event: DragEndEvent): void {
    const activeId: string = String(event.active.id)
    const overId: string | undefined = event.over ? String(event.over.id) : undefined
    if (!overId || activeId === overId) {
      setActive(null)
      return
    }

    // Section-level moves
    if (activeId.startsWith(DndIds.SECTION_SORT_ID_PREFIX)) {
      const activeSectionId: string = activeId.replace(DndIds.SECTION_SORT_ID_PREFIX, '')
      const section = allSections.find((s) => s.id === activeSectionId)

      // Cross-column drop: dropped on a column droppable
      if (overId === COLUMN_LEFT_ID || overId === COLUMN_RIGHT_ID) {
        if (!canSectionMoveAcrossColumns(section)) {
          setActive(null)
          return
        }
        const targetColumn: 'left' | 'right' = overId === COLUMN_LEFT_ID ? 'left' : 'right'
        const currentlyLeft = isInLeftColumn(activeSectionId)
        if ((targetColumn === 'left' && !currentlyLeft) || (targetColumn === 'right' && currentlyLeft)) {
          onMoveSectionToColumn(activeSectionId, targetColumn)
        }
        setActive(null)
        return
      }

      // Same-column reorder (right column only — left column sections don't reorder)
      let overSectionId: string | undefined
      if (overId.startsWith(DndIds.SECTION_SORT_ID_PREFIX)) {
        overSectionId = overId.replace(DndIds.SECTION_SORT_ID_PREFIX, '')
      } else if (overId.startsWith(DndIds.SECTION_DROP_ID_PREFIX)) {
        overSectionId = overId.replace(DndIds.SECTION_DROP_ID_PREFIX, '')
      } else {
        overSectionId = findSectionIdByBlockId(overId)
      }

      if (overSectionId && overSectionId !== activeSectionId) {
        // Cross-column: dragged section onto a section in the other column
        const activeInLeft = isInLeftColumn(activeSectionId)
        const overInLeft = isInLeftColumn(overSectionId)
        if (activeInLeft !== overInLeft && canSectionMoveAcrossColumns(section)) {
          onMoveSectionToColumn(activeSectionId, overInLeft ? 'left' : 'right')
        } else if (activeInLeft === overInLeft) {
          // Same column reorder
          onMoveSection(activeSectionId, overSectionId)
        }
      }
      setActive(null)
      setHoverColumnId(null)
      return
    }

    // Block-level moves
    const fromSectionId = findSectionIdByBlockId(activeId)
    const toSectionId = overId.startsWith(DndIds.SECTION_DROP_ID_PREFIX)
      ? overId.replace(DndIds.SECTION_DROP_ID_PREFIX, '')
      : findSectionIdByBlockId(overId)
    if (!fromSectionId || !toSectionId) {
      setActive(null)
      return
    }
    if (fromSectionId === toSectionId) {
      onMoveWithinSection(fromSectionId, activeId, overId)
      setActive(null)
      return
    }
    const toIndex: number = overId.startsWith(DndIds.SECTION_DROP_ID_PREFIX)
      ? Number.MAX_SAFE_INTEGER
      : Math.max(0, indexOfBlock(toSectionId, overId))
    onMoveToSection(fromSectionId, activeId, toSectionId, toIndex)
    setActive(null)
    setHoverColumnId(null)
  }

  const leftSortIds = leftSections.map((s) => `${DndIds.SECTION_SORT_ID_PREFIX}${s.id}`)
  const rightSortIds = rightSections.map((s) => `${DndIds.SECTION_SORT_ID_PREFIX}${s.id}`)

  const crossColumnState: CrossColumnDragState = {
    activeSectionId: active?.kind === 'section' ? active.id : null,
    hoverColumnId,
    sourceColumnId,
    canMoveAcrossColumns: canSectionMoveAcrossColumns(activeSection),
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={(): void => { setActive(null); setHoverColumnId(null) }}
    >
      <CrossColumnDragContext.Provider value={crossColumnState}>
      <SortableContext items={[...leftSortIds, ...rightSortIds]} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
      <DragOverlay dropAnimation={{ duration: 150, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
        {(() => {
          if (!active) return null
          if (active.kind === 'section') {
            if (renderSectionOverlay) {
              return (
                <div className="cursor-grabbing bg-white shadow-2xl rounded-lg">
                  {renderSectionOverlay(active.id)}
                </div>
              )
            }
            const title: string = allSections.find((s) => s.id === active.id)?.title ?? ''
            return <OverlaySection title={title} themeColor={theme.primaryColor} />
          }
          let html: string = '<p>Block</p>'
          for (const s of allSections) {
            const blk = s.blocks.find((b) => b.id === active.id)
            if (blk && blk.type === 'text') {
              html = blk.html
              break
            }
          }
          return <OverlayBlock html={html} />
        })()}
      </DragOverlay>
      </CrossColumnDragContext.Provider>
    </DndContext>
  )
}
