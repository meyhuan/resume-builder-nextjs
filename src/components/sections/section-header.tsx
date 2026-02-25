import React, { cloneElement, isValidElement } from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { UUID } from '@/entities/common/uuid';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, GripVertical } from 'lucide-react';

import type { SectionHeaderStyles } from '@/templates/components/v2/types';

const HOVER_DELAY_MS = 200;

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
  readonly layout?: 'default' | 'ribbon';
}

export default function SectionHeader(props: SectionHeaderProps): ReactElement {
  const { title, icon, themeColor, styles, onTitleChange, onAdd, onDelete, dragHandleAttributes, dragHandleListeners, dragHandleRef, layout = 'default' } = props;
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

  const hasActions = Boolean(onAdd || onDelete || (dragHandleAttributes && dragHandleListeners && dragHandleRef !== undefined));

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
  const renderedIcon: ReactNode = isValidElement(icon) ? (
    <span style={{ color: iconColor }}>
      {cloneElement(icon as ReactElement<{ size?: string | number; className?: string }>, {
        size: styles?.icon?.size,
        className: styles?.icon?.className,
      })}
    </span>
  ) : icon;

  const actionsMenu = isHovered && hasActions ? (
    <div 
      className="absolute top-1 right-2 flex items-center gap-0.5 print:hidden bg-white shadow-md rounded-md px-1 py-0.5 border border-slate-200 z-10"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {onAdd && (
        <Button variant="ghost" size="sm" onClick={onAdd} className="h-6 px-2 text-[11px] gap-1 text-slate-600 hover:!text-slate-900 hover:!bg-slate-100" title="添加">
          <PlusCircle className="h-3 w-3" />
          <span>添加</span>
        </Button>
      )}
      {onDelete && (
        <Button variant="ghost" size="sm" onClick={onDelete} className="h-6 px-2 text-[11px] gap-1 text-slate-600 hover:!text-red-600 hover:!bg-red-50" title="删除">
          <Trash2 className="h-3 w-3" />
          <span>删除</span>
        </Button>
      )}
      {!!dragHandleAttributes && !!dragHandleListeners && !!dragHandleRef && (
        <Button
          variant="ghost" size="sm" ref={dragHandleRef}
          /* eslint-disable @typescript-eslint/no-explicit-any */
          {...(dragHandleAttributes as Record<string, any>)}
          {...(dragHandleListeners as Record<string, any>)}
          /* eslint-enable @typescript-eslint/no-explicit-any */
          className="h-6 w-6 px-0 text-[11px] gap-1 cursor-grab active:cursor-grabbing text-slate-600 hover:!text-slate-900 hover:!bg-slate-100" title="拖动"
        >
          <GripVertical className="h-3 w-3" />
          {/* <span>拖动</span> */}
        </Button>
      )}
    </div>
  ) : null;

  const renderTitle = (overrideColor?: string) => {
    const finalColor = overrideColor || titleColor;
    if (isEditing && onTitleChange) {
      return (
        <input
          ref={inputRef}
          className={`font-bold bg-transparent border-b-2 border-violet-400 outline-none px-0 py-0 w-32 ${styles?.className || ''}`}
          style={{ color: finalColor }}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit();
            if (e.key === 'Escape') cancelEdit();
          }}
        />
      );
    }
    return (
      <h2
        className={`font-bold tracking-widest ${onTitleChange ? 'cursor-text' : ''} ${styles?.className || ''}`}
        style={{ color: finalColor }}
        onClick={onTitleChange ? () => { setEditValue(title); setIsEditing(true); } : undefined}
      >
        {title}
      </h2>
    );
  };

  if (layout === 'ribbon') {
    return (
      <div
        className={`flex items-center w-full relative transition-all duration-200 group/header ${
          isHovered ? 'bg-gray-50' : ''
        } ${styles?.containerClassName || 'mb-4 mt-2'}`}
        style={{ fontSize: styles?.fontSize, fontWeight: styles?.fontWeight, lineHeight: styles?.lineHeight }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex items-center relative h-[32px] drop-shadow-sm">
          {/* Icon part */}
          <div className="h-full flex items-center justify-center w-[40px] z-20 rounded-l-sm" style={{ backgroundColor: themeColor }}>
            {isValidElement(icon) ? (
              <span style={{ color: '#fff' }}>
                {cloneElement(icon as ReactElement<{ size?: string | number; className?: string }>, {
                  size: styles?.icon?.size || '1.2em',
                  className: styles?.icon?.className,
                })}
              </span>
            ) : icon}
          </div>

          {/* Title part */}
          <div className="bg-[#f8f8f8] h-full flex items-center pl-3 pr-2 z-10 relative border-y border-[#ddd]">
            {renderTitle('#333')}
            
            {/* Arrow right */}
            <div className="absolute top-[-1px] -right-[16px] w-0 h-0 border-y-[16px] border-y-transparent border-l-[16px] border-l-[#f8f8f8] z-20"></div>
            <div className="absolute top-[-1px] -right-[17px] w-0 h-0 border-y-[16px] border-y-transparent border-l-[17px] border-l-[#ddd] z-10"></div>
          </div>
        </div>
        
        {/* Horizontal Line */}
        <div className="flex-1 h-[6px] bg-[#f0f0f0] ml-6 rounded-r"></div>

        {actionsMenu}
      </div>
    );
  }

  // Default Layout
  return (
    <div
      className={`flex items-center gap-2 relative rounded transition-all duration-200 ${
        isHovered ? 'bg-gray-50 border border-gray-200' : 'border border-transparent'
      } ${styles?.containerClassName || 'mb-3'}`}
      style={{ fontSize: styles?.fontSize, fontWeight: styles?.fontWeight, lineHeight: styles?.lineHeight }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {renderedIcon}
      <div className="flex-1 flex">
        {renderTitle()}
      </div>
      {actionsMenu}
    </div>
  );
}
