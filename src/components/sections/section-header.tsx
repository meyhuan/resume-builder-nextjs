import { useState, useRef } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { UUID } from '@/entities/common/uuid';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, GripVertical } from 'lucide-react';

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
  const hideTimerRef = useRef<NodeJS.Timeout | number | null>(null);

  // eslint-disable-next-line react-hooks/refs
  const hasActions = Boolean(onAdd || onDelete || (dragHandleAttributes && dragHandleListeners && dragHandleRef));

  function handleMouseEnter(): void {
    if (!hasActions) return;
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setIsHovered(true);
  }

  function handleMouseLeave(): void {
    if (!hasActions) return;
    hideTimerRef.current = setTimeout(() => {
      setIsHovered(false);
    }, HOVER_DELAY_MS);
  }

  return (
    <div
      className={`flex items-center gap-2 mb-3 relative py-1 rounded transition-all duration-200 ${
        isHovered ? 'bg-gray-50 border border-gray-200' : 'border border-transparent'
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {icon}
      <h2 className="text-base font-bold flex-1" style={{ color: themeColor }}>
        {title}
      </h2>

      {isHovered && hasActions ? (
        <div 
          className="absolute top-1 right-2 flex items-center gap-1 print:hidden bg-white shadow-md rounded px-1.5 py-1 border z-10"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {onAdd ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAdd}
              className="h-7 text-xs gap-1"
              title="添加"
            >
              <PlusCircle className="h-3 w-3" />
              <span>添加</span>
            </Button>
          ) : null}

          {onDelete ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-7 text-xs gap-1 hover:bg-red-50 hover:text-red-600"
              title="删除"
            >
              <Trash2 className="h-3 w-3" />
              <span>删除</span>
            </Button>
          ) : null}

          {dragHandleAttributes && dragHandleListeners && dragHandleRef ? (
            <Button
              variant="ghost"
              size="sm"
              ref={dragHandleRef}
              {...(dragHandleAttributes as Record<string, unknown>)}
              {...(dragHandleListeners as Record<string, unknown>)}
              className="h-7 text-xs gap-1 cursor-grab active:cursor-grabbing"
              title="拖动"
            >
              <GripVertical className="h-3 w-3" />
              <span>拖动</span>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
