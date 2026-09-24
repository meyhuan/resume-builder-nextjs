import { SectionTitleText } from './section-title-text';
import React, { cloneElement, isValidElement } from 'react';
import { useState, useRef } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { UUID } from '@/entities/common/uuid';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, GripVertical } from 'lucide-react';
import { useAppStore } from '@/state/store';

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
  readonly wrapTitle?: boolean;
}

export default function SectionHeader(props: SectionHeaderProps): ReactElement {
  const readOnly = useAppStore((s) => s.readOnly);
  // In read-only mode, strip all mutating handlers so the header is purely presentational.
  const effectiveOnTitleChange = readOnly ? undefined : props.onTitleChange;
  const effectiveOnAdd = readOnly ? undefined : props.onAdd;
  const effectiveOnDelete = readOnly ? undefined : props.onDelete;
  const effectiveDragHandleAttributes = readOnly ? undefined : props.dragHandleAttributes;
  const effectiveDragHandleListeners = readOnly ? undefined : props.dragHandleListeners;
  const effectiveDragHandleRef = readOnly ? undefined : props.dragHandleRef;

  const { title, icon, themeColor, styles, layout = 'default' } = props;
  const onTitleChange = effectiveOnTitleChange;
  const onAdd = effectiveOnAdd;
  const onDelete = effectiveOnDelete;
  const dragHandleAttributes = effectiveDragHandleAttributes;
  const dragHandleListeners = effectiveDragHandleListeners;
  const dragHandleRef = effectiveDragHandleRef;

  const [isHovered, setIsHovered] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | number | null>(null);

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

  const renderTitle = (overrideColor?: string) => (
    <SectionTitleText as="h2" value={title} onCommit={onTitleChange}
      className={`font-bold tracking-widest ${styles?.className || ''}`}
      style={{ color: overrideColor || titleColor }} />
  );

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
        <div className={props.wrapTitle ? 'flex min-w-0 max-w-[calc(100%-24px)] items-center relative min-h-[32px] drop-shadow-sm' : 'flex items-center relative h-[32px] drop-shadow-sm'}>
          {/* Icon part */}
          <div className={props.wrapTitle ? 'self-stretch min-h-[32px] flex shrink-0 items-center justify-center w-[40px] z-20 rounded-l-sm' : 'h-full flex items-center justify-center w-[40px] z-20 rounded-l-sm'} style={{ backgroundColor: themeColor }}>
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
          <div className={props.wrapTitle ? 'bg-[#f8f8f8] min-w-0 min-h-[32px] flex items-center pl-3 pr-2 z-10 relative border-y border-[#ddd]' : 'bg-[#f8f8f8] h-full flex items-center pl-3 pr-2 z-10 relative border-y border-[#ddd]'}>
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
      <div className="min-w-0 flex-1 flex">
        {renderTitle()}
      </div>
      {actionsMenu}
    </div>
  );
}
