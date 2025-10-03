import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Sparkles, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

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
      className="absolute bottom-0 right-0 flex items-center gap-1 print:hidden bg-white shadow-md rounded px-1.5 py-1 border z-10"
      style={{ transform: 'translateY(calc(100% + 4px))' }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {onAdd ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onAdd}
          className="h-7 text-xs gap-1"
          title={`添加${blockType}`}
        >
          <PlusCircle className="h-3 w-3" />
          <span>添加{blockType}</span>
        </Button>
      ) : null}

      {onPolish ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onPolish}
          className="h-7 text-xs gap-1 text-purple-600 hover:bg-purple-50 hover:text-purple-700"
          title="AI润色"
        >
          <Sparkles className="h-3 w-3" />
          <span>AI润色</span>
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

      {onMoveUp ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onMoveUp}
          className="h-7 text-xs gap-1"
          title="上移"
        >
          <ArrowUp className="h-3 w-3" />
          <span>上移</span>
        </Button>
      ) : null}

      {onMoveDown ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onMoveDown}
          className="h-7 text-xs gap-1"
          title="下移"
        >
          <ArrowDown className="h-3 w-3" />
          <span>下移</span>
        </Button>
      ) : null}
    </div>
  );
}
