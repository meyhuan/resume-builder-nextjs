import React, { cloneElement, isValidElement } from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { UUID } from '@/entities/common/uuid';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, GripVertical } from 'lucide-react';

import type { SectionHeaderStyles } from '@/templates/components/v2/types';

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
  readonly styles?: SectionHeaderStyles;
  readonly onTitleChange?: (newTitle: string) => void;
  readonly onAdd?: () => void;
  readonly onDelete?: () => void;
  readonly dragHandleAttributes?: unknown;
  readonly dragHandleListeners?: unknown;
  readonly dragHandleRef?: (element: HTMLElement | null) => void;
}

export default function SectionHeader(props: SectionHeaderProps): ReactElement {
  const { title, icon, themeColor, styles, onTitleChange, onAdd, onDelete, dragHandleAttributes, dragHandleListeners, dragHandleRef } = props;
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | number | null>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commitEdit = useCallback((): void => {
    const trimmed: string = editValue.trim();
    if (trimmed && trimmed !== title && onTitleChange) {
      onTitleChange(trimmed);
    } else {
      setEditValue(title);
    }
    setIsEditing(false);
  }, [editValue, title, onTitleChange]);

  const cancelEdit = useCallback((): void => {
    setEditValue(title);
    setIsEditing(false);
  }, [title]);

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

  const iconColor = styles?.icon?.color || themeColor;
  const titleColor = styles?.color || themeColor;
  const renderedIcon = isValidElement(icon) ? (
    <span style={{ color: iconColor }}>
      {cloneElement(icon as ReactElement<{ size?: string | number; className?: string }>, {
        size: styles?.icon?.size,
        className: styles?.icon?.className,
      })}
    </span>
  ) : icon;

  return (
    <div
      className={`flex items-center gap-2 relative py-1 rounded transition-all duration-200 ${
        isHovered ? 'bg-gray-50 border border-gray-200' : 'border border-transparent'
      } ${styles?.containerClassName || 'mb-3'}`}
      style={{ fontSize: styles?.fontSize, fontWeight: styles?.fontWeight }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {renderedIcon}
      {isEditing && onTitleChange ? (
        <input
          ref={inputRef}
          className={`font-bold flex-1 bg-transparent border-b-2 border-violet-400 outline-none px-0 py-0 ${styles?.className || ''}`}
          style={{ color: titleColor }}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit();
            if (e.key === 'Escape') cancelEdit();
          }}
        />
      ) : (
        <h2
          className={`font-bold flex-1 ${onTitleChange ? 'cursor-text' : ''} ${styles?.className || ''}`}
          style={{ color: titleColor }}
          onClick={onTitleChange ? () => { setEditValue(title); setIsEditing(true); } : undefined}
        >
          {title}
        </h2>
      )}

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
