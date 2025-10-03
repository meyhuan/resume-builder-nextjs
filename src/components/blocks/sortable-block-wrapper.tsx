import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * Wrapper that provides DnD sortable functionality for blocks.
 * Passes drag handle props to children.
 */
export interface SortableBlockWrapperProps {
  readonly blockId: string;
  readonly children: (dragHandleProps: {
    attributes: unknown;
    listeners: unknown;
    ref: (element: HTMLElement | null) => void;
  }) => ReactNode;
}

export default function SortableBlockWrapper(props: SortableBlockWrapperProps): ReactElement {
  const { blockId, children } = props;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ 
    id: blockId 
  });
  
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({
        attributes: attributes as unknown,
        listeners: listeners as unknown,
        ref: setActivatorNodeRef,
      })}
    </div>
  );
}
