import type { CSSProperties, ReactElement, ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import clsx from 'clsx'
import { DndIds } from '@/dnd/ids'

/**
 * SortableSection wraps a section with a drag handle and sortable behavior.
 */
export default function SortableSection(props: { sectionId: string; children: ReactNode }): ReactElement {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: `${DndIds.SECTION_SORT_ID_PREFIX}${props.sectionId}` })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.95 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <button
        type="button"
        aria-label="Drag section"
        title="Drag section"
        className={clsx(
          'absolute top-1 right-1 z-30 print:hidden cursor-grab p-1 h-7 w-7 border rounded bg-white shadow flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity',
          isDragging && 'opacity-100 pointer-events-auto'
        )}
        style={isDragging ? { pointerEvents: 'auto' } : undefined}
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {props.children}
    </div>
  )
}
