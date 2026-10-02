import { useEffect, useId, useState, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { GripHorizontal } from 'lucide-react';
import BlockActions from './block-actions';
import { useAppStore } from '@/state/store';
import { useHoverActions } from '@/hooks/use-hover-actions';
import { useResumeActionDock } from './resume-action-dock';

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

function getContextLabel(element: HTMLElement | null, blockType: string): string {
  const section = element?.closest('[data-resume-edit-region="section"]');
  const title = section?.querySelector('h2, h3')?.textContent?.trim() || blockType;
  const siblings = section ? [...section.querySelectorAll('[data-resume-edit-region="block"]')]
    .filter((block) => block.closest('[data-resume-edit-region="section"]') === section) : [];
  const index = element ? siblings.indexOf(element) : -1;
  const nameField = element?.querySelector('[data-resume-field-name="name"], [data-resume-field-name="school"], [data-resume-field-name="company"], [data-resume-field-name="organization"]');
  const name = nameField instanceof HTMLInputElement ? nameField.value.trim() : nameField?.textContent?.trim();
  if (name && !['项目名称', '学校名称', '公司名称', '社团 / 活动'].includes(name)) return `${title} · ${name}`;
  return index >= 0 ? `${title} · 第 ${index + 1} 条` : `${title}条目`;
}

function EditableBlockHoverWrapper(props: BlockWrapperProps): ReactElement {
  const { children, blockType, onAdd, onPolish, onGenerate, onDelete, onMoveUp, onMoveDown, dragHandleProps, dragHandleRef, showDragHandle = true, disableHover = false } = props;
  const { ref, isVisible: isHovered, onMouseEnter, onMouseLeave, onFocus, onBlur } = useHoverActions<HTMLDivElement>(disableHover);
  const dock = useResumeActionDock();
  const id = useId();
  const selected = dock?.activeId === id;
  const clear = dock?.clear;
  const select = dock?.select;
  useEffect(() => () => {
    // React can disconnect and reconnect effects/refs when a keyed row moves.
    // Clear only after the commit confirms that the owner really disappeared.
    queueMicrotask(() => { if (!ref.current?.isConnected) clear?.(id); });
  }, [clear, id, ref]);

  const [contextLabel, setContextLabel] = useState(`${blockType}条目`);
  useEffect(() => {
    if (!selected) return;
    const section = ref.current?.closest('[data-resume-edit-region="section"]');
    if (!section) return;
    const update = (): void => {
      if (ref.current?.isConnected) {
        const label = getContextLabel(ref.current, blockType);
        setContextLabel(label);
        select?.(id, label);
      }
    };
    const observer = new MutationObserver(update);
    observer.observe(section, { childList: true, characterData: true, subtree: true });
    queueMicrotask(update);
    return () => observer.disconnect();
  }, [selected, ref, blockType, id, select]);
  const selectBlock = (): void => {
    if (!dock) return;
    const label = getContextLabel(ref.current, blockType);
    setContextLabel(label);
    dock.select(id, label);
  };
  const actions = <BlockActions blockType={blockType} onAdd={onAdd} onPolish={onPolish}
    onGenerate={onGenerate} onDelete={onDelete} onMoveUp={onMoveUp} onMoveDown={onMoveDown}
    docked={Boolean(dock)} contextLabel={contextLabel}
    onReturnFocus={() => ref.current?.focus()} />;

  return (
    <div
      ref={ref}
      className={`group/block relative rounded ${props.flush ? 'flow-root' : 'mb-4 last:mb-0 pb-1'}`}
      data-resume-edit-region="block"
      data-resume-edit-state={disableHover ? 'editing' : isHovered ? 'active' : 'idle'}
      data-resume-edit-selected={selected || undefined}
      role="group"
      aria-label={`${blockType}条目`}
      tabIndex={0}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={() => { onFocus(); selectBlock(); }}
      onBlur={onBlur}
      onClick={selectBlock}
      onKeyDown={(event) => {
        if (event.altKey && event.key === 'F10' && dock?.host) {
          event.preventDefault();
          dock.host.querySelector<HTMLButtonElement>('button')?.focus();
        }
      }}
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

      {dock ? selected && !disableHover && dock.host ? createPortal(actions, dock.host) : null : isHovered ? actions : null}
    </div>
  );
}
