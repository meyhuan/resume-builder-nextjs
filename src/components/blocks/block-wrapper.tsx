import { useState, useRef, useEffect } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { GripHorizontal } from 'lucide-react';
import BlockActions from './block-actions';
import { useAppStore } from '@/state/store';

/**
 * Wrapper for blocks with hover actions (floating buttons, no layout shift).
 * Supports DnD integration via dragHandleProps.
 */
export interface BlockWrapperProps {
  readonly children: ReactNode;
  readonly blockType: string;
  readonly onAdd?: () => void;
  readonly onPolish?: () => void;
  readonly onGenerate?: () => void;
  readonly onDelete?: () => void;
  readonly onMoveUp?: () => void;
  readonly onMoveDown?: () => void;
  readonly dragHandleProps?: Record<string, unknown>;
  readonly dragHandleRef?: (element: HTMLElement | null) => void;
  readonly showDragHandle?: boolean;
  readonly disableHover?: boolean;
}

const HOVER_DELAY_MS = 200;
const HOVER_POLL_MS = 500;

export default function BlockWrapper(props: BlockWrapperProps): ReactElement {
  const readOnly = useAppStore((s) => s.readOnly);
  if (readOnly) {
    return <div className="relative rounded mb-4 last:mb-0 pb-1">{props.children}</div>;
  }
  return <EditableBlockHoverWrapper {...props} />;
}

function EditableBlockHoverWrapper(props: BlockWrapperProps): ReactElement {
  const { children, blockType, onAdd, onPolish, onGenerate, onDelete, onMoveUp, onMoveDown, dragHandleProps, dragHandleRef, showDragHandle = true, disableHover = false } = props;
  const [isHovered, setIsHovered] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disableHover && isHovered) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsHovered(false);
    }
  }, [disableHover, isHovered]);

  useEffect(() => {
    if (!isHovered || disableHover) return;
    const pollId = setInterval(() => {
      if (containerRef.current && !containerRef.current.matches(':hover')) {
        setIsHovered(false);
      }
    }, HOVER_POLL_MS);
    return (): void => { clearInterval(pollId); };
  }, [isHovered, disableHover]);

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
      ref={containerRef}
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
          <GripHorizontal size={14} strokeWidth={2} />
        </button>
      ) : null}

      {isHovered ? (
        <BlockActions
          blockType={blockType}
          onAdd={onAdd}
          onPolish={onPolish}
          onGenerate={onGenerate}
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
