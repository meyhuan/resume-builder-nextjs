import type { ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Sparkles, Wand2, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { trackAssistant } from '@/lib/ai/unified/analytics';
import { useAiImpression } from '@/lib/ai/unified/use-impression';

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
  readonly docked?: boolean;
  readonly contextLabel?: string;
  readonly onReturnFocus?: () => void;
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
    docked = false,
    contextLabel,
    onReturnFocus,
  } = props;
  const report = (feature: 'polish' | 'generate') => {
    if (window.matchMedia('(min-width: 768px)').matches)
      trackAssistant('entry_view', { entry: 'module', surface: 'block', feature, requestedFeature: feature });
  };
  const polishRef = useAiImpression<HTMLButtonElement>('polish', () => report('polish'), !!onPolish);
  const generateRef = useAiImpression<HTMLButtonElement>('generate', () => report('generate'), !!onGenerate);

  return (
    <div
      data-resume-block-actions="true"
      data-export-hide="true"
      role="group"
      aria-label={`${contextLabel || blockType}操作`}
      className={docked ? 'resume-docked-actions flex items-center gap-1 print:hidden text-slate-900' : 'absolute top-full right-0 mt-1 flex items-center gap-0.5 print:hidden bg-white shadow-md rounded-md px-1 py-0.5 border border-slate-200 z-10'}
      onKeyDown={(event) => {
        if (docked && event.key === 'Escape') { event.preventDefault(); onReturnFocus?.(); }
      }}
    >
      {docked ? <span className="resume-action-context mr-auto pr-3 text-xs font-medium text-slate-600" title={contextLabel}>{contextLabel}</span> : null}
      {onAdd ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onAdd}
          className="h-6 px-2 text-[11px] gap-1 text-slate-600 hover:!text-slate-900 hover:!bg-slate-100"
          title={docked ? '添加条目' : `添加${blockType}`}
        >
          <PlusCircle className="h-3 w-3" />
          <span>{docked ? '添加条目' : `添加${blockType}`}</span>
        </Button>
      ) : null}

      {onPolish ? (
        <Button
          ref={polishRef}
          variant="ghost"
          size="sm"
          onClick={onPolish}
          className="h-6 px-2 text-[11px] gap-1 text-purple-600 hover:!text-purple-700 hover:!bg-purple-50"
          title="AI润色"
        >
          <Sparkles className="h-3 w-3" />
          <span>AI润色</span>
        </Button>
      ) : null}

      {onGenerate ? (
        <Button
          ref={generateRef}
          variant="ghost"
          size="sm"
          onClick={onGenerate}
          className="h-6 px-2 text-[11px] gap-1 text-violet-600 hover:!text-violet-700 hover:!bg-violet-50"
          title="AI帮我写"
        >
          <Wand2 className="h-3 w-3" />
          <span>AI帮我写</span>
        </Button>
      ) : null}

      {onDelete ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-6 px-2 text-[11px] gap-1 text-slate-600 hover:!text-red-600 hover:!bg-red-50"
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
          disabled={!onMoveUp}
          className="h-6 w-6 px-0 disabled:opacity-50 disabled:cursor-not-allowed hover:!bg-slate-100 hover:!text-slate-900"
          title="上移"
          aria-label="上移"
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
          title="下移"
          aria-label="下移"
        >
          <ArrowDown className="h-3 w-3 text-slate-600" />
        </Button>
      ) : null}
    </div>
  );
}
