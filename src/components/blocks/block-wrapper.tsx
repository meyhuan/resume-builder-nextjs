import { useState, useRef, useEffect } from 'react';
import type { ReactElement, ReactNode } from 'react';
import BlockActions from './block-actions';

/**
 * Wrapper for blocks with hover actions (floating buttons, no layout shift).
 * Supports DnD integration via dragHandleProps.
 */
export interface BlockWrapperProps {
  readonly children: ReactNode;
  readonly blockType: string;
  readonly onAdd?: () => void;
  readonly onPolish?: () => void;
  readonly onDelete?: () => void;
  readonly onMoveUp?: () => void;
  readonly onMoveDown?: () => void;
  readonly dragHandleProps?: Record<string, unknown>;
  readonly dragHandleRef?: (element: HTMLElement | null) => void;
  readonly showDragHandle?: boolean;
  readonly disableHover?: boolean;
}

const HOVER_DELAY_MS = 200;

export default function BlockWrapper(props: BlockWrapperProps): ReactElement {
  const { children, blockType, onAdd, onPolish, onDelete, onMoveUp, onMoveDown, dragHandleProps, dragHandleRef, showDragHandle = true, disableHover = false } = props;
  const [isHovered, setIsHovered] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (disableHover && isHovered) {
      setIsHovered(false);
    }
  }, [disableHover, isHovered]);

  function handleMouseEnter(): void {
    if (disableHover) return;
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setIsHovered(true);
  }

  function handleMouseLeave(): void {
    hideTimerRef.current = setTimeout(() => {
      setIsHovered(false);
    }, HOVER_DELAY_MS);
  }

  return (
    <div
      className="relative rounded mb-4 last:mb-0 pb-1"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {/* DnD Drag Handle - top right corner */}
      {showDragHandle && dragHandleProps && dragHandleRef && isHovered && !disableHover ? (
        <button
          type="button"
          ref={dragHandleRef}
          {...dragHandleProps}
          className="absolute top-2 right-2 z-20 print:hidden cursor-grab active:cursor-grabbing p-1 h-7 w-7 border rounded bg-white shadow-sm hover:shadow-md flex items-center justify-center transition-all"
          title="拖动"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      ) : null}

      {isHovered ? (
        <BlockActions
          blockType={blockType}
          onAdd={onAdd}
          onPolish={onPolish}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      ) : null}
    </div>
  );
}
