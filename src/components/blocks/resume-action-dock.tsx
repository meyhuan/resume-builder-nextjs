'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { useAppStore } from '@/state/store';
import { InlineToolbarControls } from '@/editor/inline-toolbar';

interface ActionDockContext {
  readonly activeId: string | null;
  readonly activeLabel: string;
  readonly host: HTMLDivElement | null;
  readonly formatHost: HTMLDivElement | null;
  readonly select: (id: string, label: string) => void;
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
  const [selection, setSelection] = useState<{ id: string; label: string } | null>(null);
  const activeId = selection?.id ?? null;
  const activeLabel = selection?.label ?? '';
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [formatHost, setFormatHost] = useState<HTMLDivElement | null>(null);
  const select = useCallback((id: string, label: string) => {
    setSelection((current) => current?.id === id && current.label === label ? current : { id, label });
  }, []);
  const clear = useCallback((id?: string) => {
    setSelection((current) => id === undefined || current?.id === id ? null : current);
  }, []);
  const value = useMemo(() => ({ activeId, activeLabel, host, formatHost, select, clear }), [activeId, activeLabel, host, formatHost, select, clear]);

  return (
    <Context.Provider value={value}>
      <div className={`min-h-0 min-w-0 flex-1 flex flex-col overflow-hidden print:block print:overflow-visible ${className}`}
        onClickCapture={(event) => {
          // Inspect ownership before a synchronous store update can replace
          // the clicked Move/Delete button and detach it from the dock.
          const target = event.target;
          if (target instanceof Element && !target.closest('[data-resume-edit-region="block"], [data-resume-action-dock], [data-resume-format-dock]')) clear();
        }}>
        {!readOnly ? <div ref={setFormatHost} data-resume-format-dock="true" data-export-hide="true"
          className="resume-format-dock shrink-0 border-b border-slate-200 bg-white px-3 print:hidden">
          <div data-resume-format-placeholder="true" className="resume-inline-toolbar-fixed">
            <span className="shrink-0 text-xs font-medium text-slate-600">文字格式</span>
            <InlineToolbarControls docked className="resume-inline-toolbar-buttons" />
            <span className="resume-format-hint ml-auto text-xs text-slate-500">点击正文开始编辑</span>
          </div>
        </div> : null}
        {children}
        {!readOnly ? (
          <div ref={setHost} data-resume-action-dock="true" data-export-hide="true"
            className="resume-action-dock shrink-0 border-t border-slate-200 bg-white px-3 print:hidden">
            <p data-resume-action-hint="true" className="m-0 text-xs text-slate-500">
              {activeId ? '当前条目的操作' : '点击经历条目，查看添加、AI 润色等操作'}
            </p>
          </div>
        ) : null}
      </div>
    </Context.Provider>
  );
}
