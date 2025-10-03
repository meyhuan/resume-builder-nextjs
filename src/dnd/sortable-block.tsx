import type { CSSProperties, ReactElement, ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import clsx from 'clsx'

/**
 * SortableBlock wraps a block with a drag handle and optional delete button.
 */
interface SortableBlockProps {
  readonly id: string
  readonly children: ReactNode
  readonly onDelete?: () => void
  readonly className?: string
  readonly style?: CSSProperties
}

export default function SortableBlock(props: SortableBlockProps): ReactElement {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: props.id })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    ...props.style,
  }
  return (
    <article
      ref={setNodeRef}
      style={style}
      className={clsx('relative group border border-transparent hover:border-gray-300 rounded p-1', props.className)}
    >
      <button
        type="button"
        aria-label="Drag block"
        title="Drag"
        className={clsx(
          'absolute top-1 right-1 z-20 print:hidden cursor-grab text-xs p-1 h-6 w-6 border rounded bg-white shadow flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity',
          isDragging && 'opacity-100 pointer-events-auto'
        )}
        style={isDragging ? { pointerEvents: 'auto' } : undefined}
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {props.onDelete ? (
        <div className="absolute top-1 right-10 z-10 print:hidden opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
          <button type="button" aria-label="Delete block" className="text-xs px-2 py-0.5 border rounded bg-white hover:bg-red-50" onClick={props.onDelete}>
            Delete
          </button>
        </div>
      ) : null}
      {props.children}
    </article>
  )
}
