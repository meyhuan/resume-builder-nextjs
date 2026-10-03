'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactElement, type ReactNode } from 'react';

interface ActionDockContext {
  readonly activeId: string | null;
  readonly activeLabel: string;
  readonly select: (id: string, label: string) => void;
  readonly clear: (id?: string) => void;
}

const Context = createContext<ActionDockContext | null>(null);

interface BlockEditingActions {
  readonly onPolish?: () => void;
  readonly onGenerate?: () => void;
}
const BlockEditingContext = createContext<BlockEditingActions>({});
export const BlockEditingProvider = BlockEditingContext.Provider;
export function useBlockEditingActions(): BlockEditingActions {
  return useContext(BlockEditingContext);
}

export function useResumeActionDock(): ActionDockContext | null {
  return useContext(Context);
}

/** Shares explicit row selection; tools now belong to the row being edited. */
export function ResumeActionWorkspace({ children, className = '' }: {
  readonly children: ReactNode;
  readonly className?: string;
}): ReactElement {
  const [selection, setSelection] = useState<{ id: string; label: string } | null>(null);
  const activeId = selection?.id ?? null;
  const activeLabel = selection?.label ?? '';
  const select = useCallback((id: string, label: string) => {
    setSelection((current) => current?.id === id && current.label === label ? current : { id, label });
  }, []);
  const clear = useCallback((id?: string) => {
    setSelection((current) => id === undefined || current?.id === id ? null : current);
  }, []);
  const value = useMemo(() => ({ activeId, activeLabel, select, clear }), [activeId, activeLabel, select, clear]);

  return (
    <Context.Provider value={value}>
      <div data-resume-workspace className={`min-h-0 min-w-0 flex-1 flex flex-col overflow-hidden print:block print:overflow-visible ${className}`}
        onClickCapture={(event) => {
          // Portalled formats retain the same explicitly selected row.
          const target = event.target;
          if (target instanceof Element && !target.closest('[data-resume-edit-region="block"], [data-resume-inline-toolbar]')) clear();
        }}>
        {children}
      </div>
    </Context.Provider>
  );
}
