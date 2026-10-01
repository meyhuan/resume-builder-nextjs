import type { ReactElement, ReactNode } from 'react';
import { GripHorizontal } from 'lucide-react';
import BlockActions from './block-actions';
import { useAppStore } from '@/state/store';
import { useHoverActions } from '@/hooks/use-hover-actions';

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
  /** Disable legacy spacing when the template owns block and section gaps. */
  readonly flush?: boolean;
}

export default function BlockWrapper(props: BlockWrapperProps): ReactElement {
  const readOnly = useAppStore((s) => s.readOnly);
  if (readOnly) {
    return <div className={`group/block relative rounded ${props.flush ? 'flow-root' : 'mb-4 last:mb-0 pb-1'}`}>{props.children}</div>;
  }
  return <EditableBlockHoverWrapper {...props} />;
}

function EditableBlockHoverWrapper(props: BlockWrapperProps): ReactElement {
  const { children, blockType, onAdd, onPolish, onGenerate, onDelete, onMoveUp, onMoveDown, dragHandleProps, dragHandleRef, showDragHandle = true, disableHover = false } = props;
  const { ref, isVisible: isHovered, onMouseEnter, onMouseLeave, onFocus, onBlur } = useHoverActions<HTMLDivElement>(disableHover);

  return (
    <div
      ref={ref}
      className={`group/block relative rounded ${props.flush ? 'flow-root' : 'mb-4 last:mb-0 pb-1'}`}
      data-resume-edit-region="block"
      data-resume-edit-state={disableHover ? 'editing' : isHovered ? 'active' : 'idle'}
      role="group"
      aria-label={`${blockType}条目`}
      tabIndex={0}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      {children}

      {/* DnD Drag Handle - top right corner */}
      {showDragHandle && dragHandleProps && dragHandleRef && isHovered && !disableHover ? (
        <button
          type="button"
          data-export-hide="true"
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
        />
      ) : null}
    </div>
  );
}
