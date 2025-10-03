import { useState, useRef } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { UUID } from '@/entities/common/uuid';

const HOVER_DELAY_MS = 200;

/**
 * Section header with hover actions (add, delete, drag) - floating buttons.
 * Drag functionality should be bound via dragHandleProps from parent.
 */
export interface SectionHeaderProps {
  readonly sectionId: UUID;
  readonly title: string;
  readonly icon?: ReactNode;
  readonly themeColor: string;
  readonly onAdd?: () => void;
  readonly onDelete?: () => void;
  readonly dragHandleAttributes?: unknown;
  readonly dragHandleListeners?: unknown;
  readonly dragHandleRef?: (element: HTMLElement | null) => void;
}

export default function SectionHeader(props: SectionHeaderProps): ReactElement {
  const { title, icon, themeColor, onAdd, onDelete, dragHandleAttributes, dragHandleListeners, dragHandleRef } = props;
  const [isHovered, setIsHovered] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  function handleMouseEnter(): void {
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
      className="flex items-center gap-2 mb-3 relative py-1 px-2 rounded"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {icon}
      <h2 className="text-base font-bold flex-1" style={{ color: themeColor }}>
        {title}
      </h2>

      {isHovered ? (
        <div 
          className="absolute top-1 right-2 flex items-center gap-2 print:hidden bg-white shadow-md rounded px-2 py-1.5 border z-10"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {onAdd ? (
            <button
              type="button"
              onClick={onAdd}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-gray-100 transition-colors"
              title="添加"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <span>添加</span>
            </button>
          ) : null}

          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-red-50 hover:text-red-600 transition-colors"
              title="删除"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>删除</span>
            </button>
          ) : null}

          {dragHandleAttributes && dragHandleListeners && dragHandleRef ? (
            <button
              type="button"
              ref={dragHandleRef}
              {...(dragHandleAttributes as Record<string, unknown>)}
              {...(dragHandleListeners as Record<string, unknown>)}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-gray-100 transition-colors cursor-grab active:cursor-grabbing"
              title="拖动"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
              <span>拖动</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
