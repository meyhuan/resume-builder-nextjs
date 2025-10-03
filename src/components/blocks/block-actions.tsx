import type { ReactElement } from 'react';

/**
 * Actions shown when hovering over a block (floating, no layout shift).
 */
export interface BlockActionsProps {
  readonly blockType: string;
  readonly onAdd?: () => void;
  readonly onPolish?: () => void;
  readonly onDelete?: () => void;
  readonly onMoveUp?: () => void;
  readonly onMoveDown?: () => void;
  readonly onMouseEnter?: () => void;
  readonly onMouseLeave?: () => void;
}

export default function BlockActions(props: BlockActionsProps): ReactElement {
  const { blockType, onAdd, onPolish, onDelete, onMoveUp, onMoveDown, onMouseEnter, onMouseLeave } = props;

  return (
    <div 
      className="absolute bottom-0 right-0 flex items-center gap-2 print:hidden bg-white shadow-md rounded px-2 py-1.5 border z-10"
      style={{ transform: 'translateY(calc(100% + 4px))' }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {onAdd ? (
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-gray-100 transition-colors"
          title={`添加${blockType}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          <span>添加{blockType}</span>
        </button>
      ) : null}

      {onPolish ? (
        <button
          type="button"
          onClick={onPolish}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-purple-50 transition-colors text-purple-600"
          title="AI润色"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <span>AI润色</span>
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

      {onMoveUp ? (
        <button
          type="button"
          onClick={onMoveUp}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-gray-100 transition-colors"
          title="上移"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="18 15 12 9 6 15" />
          </svg>
          <span>上移</span>
        </button>
      ) : null}

      {onMoveDown ? (
        <button
          type="button"
          onClick={onMoveDown}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-gray-100 transition-colors"
          title="下移"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span>下移</span>
        </button>
      ) : null}
    </div>
  );
}
