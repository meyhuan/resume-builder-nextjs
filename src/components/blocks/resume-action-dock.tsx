'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { useAppStore } from '@/state/store';

interface ActionDockContext {
  readonly activeId: string | null;
  readonly host: HTMLDivElement | null;
  readonly select: (id: string) => void;
  readonly clear: (id?: string) => void;
}

const Context = createContext<ActionDockContext | null>(null);

export function useResumeActionDock(): ActionDockContext | null {
  return useContext(Context);
}

/** The dock lives outside the printable paper and its scrolling viewport. */
export function ResumeActionWorkspace({ children, className = '' }: {
  readonly children: ReactNode;
  readonly className?: string;
}): ReactElement {
  const readOnly = useAppStore((state) => state.readOnly);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const select = useCallback((id: string) => setActiveId(id), []);
  const clear = useCallback((id?: string) => {
    setActiveId((current) => id === undefined || current === id ? null : current);
  }, []);
  const value = useMemo(() => ({ activeId, host, select, clear }), [activeId, host, select, clear]);

  return (
    <Context.Provider value={value}>
      <div className={`min-h-0 min-w-0 flex-1 flex flex-col overflow-hidden print:block print:overflow-visible ${className}`}
        onClickCapture={(event) => {
          // Inspect ownership before a synchronous store update can replace
          // the clicked Move/Delete button and detach it from the dock.
          const target = event.target;
          if (target instanceof Element && !target.closest('[data-resume-edit-region="block"], [data-resume-action-dock]')) clear();
        }}>
        {children}
        {!readOnly ? (
          <div ref={setHost} data-resume-action-dock="true" data-export-hide="true"
            className="resume-action-dock shrink-0 border-t border-slate-200 bg-white px-3 print:hidden">
            <p data-resume-action-hint="true" className="m-0 text-xs text-slate-500">
              {activeId ? '完成正文编辑后，可使用条目操作' : '点击经历条目，查看添加、AI 润色等操作'}
            </p>
          </div>
        ) : null}
      </div>
    </Context.Provider>
  );
}
