import type { ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Sparkles, Wand2, Trash2, ArrowUp, ArrowDown } from "lucide-react";

/**
 * Actions shown when hovering over a block (floating, no layout shift).
 */
export interface BlockActionsProps {
  readonly blockType: string;
  readonly onAdd?: () => void;
  readonly onPolish?: () => void;
  readonly onGenerate?: () => void;
  readonly onDelete?: () => void;
  readonly onMoveUp?: () => void;
  readonly onMoveDown?: () => void;
  readonly onMouseEnter?: () => void;
  readonly onMouseLeave?: () => void;
}

export default function BlockActions(props: BlockActionsProps): ReactElement {
  const {
    blockType,
    onAdd,
    onPolish,
    onGenerate,
    onDelete,
    onMoveUp,
    onMoveDown,
    onMouseEnter,
    onMouseLeave,
  } = props;

  return (
    <div
      className="absolute bottom-0 right-0 flex items-center gap-0.5 print:hidden bg-white shadow-md rounded-md px-1 py-0.5 border border-slate-200 z-10"
      style={{ transform: "translateY(calc(100% - 12px))" }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {onAdd ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onAdd}
          className="h-6 px-2 text-[11px] gap-1 text-slate-600 hover:!text-slate-900 hover:!bg-slate-100"
          title={`Add ${blockType}`}
        >
          <PlusCircle className="h-3 w-3" />
          <span>Add {blockType}</span>
        </Button>
      ) : null}

      {onPolish ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onPolish}
          className="h-6 px-2 text-[11px] gap-1 text-purple-600 hover:!text-purple-700 hover:!bg-purple-50"
          title="AI Polish"
        >
          <Sparkles className="h-3 w-3" />
          <span>AI Polish</span>
        </Button>
      ) : null}

      {onGenerate ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onGenerate}
          className="h-6 px-2 text-[11px] gap-1 text-violet-600 hover:!text-violet-700 hover:!bg-violet-50"
          title="AI Write"
        >
          <Wand2 className="h-3 w-3" />
          <span>AI Write</span>
        </Button>
      ) : null}

      {onDelete ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-6 px-2 text-[11px] gap-1 text-slate-600 hover:!text-red-600 hover:!bg-red-50"
          title="Delete"
        >
          <Trash2 className="h-3 w-3" />
          <span>Delete</span>
        </Button>
      ) : null}
      {onMoveUp ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onMoveUp}
          disabled={!onMoveUp}
          className="h-6 w-6 px-0 disabled:opacity-50 disabled:cursor-not-allowed hover:!bg-slate-100 hover:!text-slate-900"
          title="Move up"
        >
          <ArrowUp className="h-3 w-3 text-slate-600" />
        </Button>
      ) : null}
      {onMoveDown ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onMoveDown}
          disabled={!onMoveDown}
          className="h-6 w-6 px-0 disabled:opacity-50 disabled:cursor-not-allowed hover:!bg-slate-100 hover:!text-slate-900"
          title="Move down"
        >
          <ArrowDown className="h-3 w-3 text-slate-600" />
        </Button>
      ) : null}
    </div>
  );
}
