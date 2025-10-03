import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DndIds } from '@/dnd/ids';

/**
 * Wrapper that provides DnD sortable functionality for sections.
 * Passes drag handle props to children.
 */
export interface SortableSectionWrapperProps {
  readonly sectionId: string;
  readonly children: (dragHandleProps: {
    attributes: unknown;
    listeners: unknown;
    ref: (element: HTMLElement | null) => void;
  }) => ReactNode;
}

export default function SortableSectionWrapper(props: SortableSectionWrapperProps): ReactElement {
  const { sectionId, children } = props;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ 
    id: `${DndIds.SECTION_SORT_ID_PREFIX}${sectionId}` 
  });
  
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {children({
        attributes: attributes as unknown,
        listeners: listeners as unknown,
        ref: setActivatorNodeRef,
      })}
    </div>
  );
}
