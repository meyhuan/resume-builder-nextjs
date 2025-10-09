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
    transition: isDragging ? undefined : transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {isDragging ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded p-4 flex items-center justify-center min-h-[60px]">
          <span className="text-gray-400 font-medium text-xs">移动到此处</span>
        </div>
      ) : (
        children({
          attributes: attributes as unknown,
          listeners: listeners as unknown,
          ref: setActivatorNodeRef,
        })
      )}
    </div>
  );
}
