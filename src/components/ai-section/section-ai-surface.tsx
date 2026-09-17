'use client';

import { createContext, useContext, useEffect, useState, type HTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useEditorUiStore } from '@/state/editor-ui-store';
import { cn } from '@/lib/utils';
import * as ModalSheet from '@/components/ui/sheet';

const Docked = createContext(false);

/** Inline host for the existing section forms; no overlay or focus trap. */
export function Sheet({ open, task, children, onOpenChange }: {
  open: boolean;
  task: 'polish' | 'generate';
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const target = useEditorUiStore((state) => state.sectionAiTarget);
  const activePanel = useEditorUiStore((state) => state.activePanel);
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    // The portal host is a sibling DOM node, available only after the editor commits.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHost(document.getElementById('editor-section-ai'));
  }, []);
  if (!host) return <ModalSheet.Sheet open={open} onOpenChange={onOpenChange}>{children}</ModalSheet.Sheet>;
  if (!open) return null;
  return createPortal(<Docked.Provider value={true}><div hidden={activePanel !== task} className={activePanel === task ? "h-full min-h-0 flex flex-col" : "hidden"}><p className="shrink-0 border-b border-slate-100 px-5 py-3 text-xs leading-relaxed text-slate-600">正在编辑：{target || '当前段落'}</p><div className="min-h-0 flex-1">{children}</div></div></Docked.Provider>, host);
}

export function SheetContent({ children, className }: HTMLAttributes<HTMLDivElement> & { side?: string }) {
  const docked = useContext(Docked);
  if (!docked) return <ModalSheet.SheetContent className={className}>{children}</ModalSheet.SheetContent>;
  return <section className={cn('h-full min-h-0 flex flex-col bg-white', className)}>{children}</section>;
}
export function SheetHeader(props: HTMLAttributes<HTMLDivElement>) {
  const docked = useContext(Docked);
  if (!docked) return <ModalSheet.SheetHeader {...props} />;
  return <div {...props} className={cn('shrink-0 space-y-1.5 px-5 pt-5 pb-4', props.className)} />;
}
export function SheetTitle(props: HTMLAttributes<HTMLHeadingElement>) {
  const docked = useContext(Docked);
  if (!docked) return <ModalSheet.SheetTitle {...props} />;
  return <h2 {...props} className={cn('text-lg font-semibold text-slate-900', props.className)} />;
}
export function SheetDescription(props: HTMLAttributes<HTMLParagraphElement>) {
  const docked = useContext(Docked);
  if (!docked) return <ModalSheet.SheetDescription {...props} />;
  return <p {...props} className={cn('text-sm text-slate-500', props.className)} />;
}
export function SheetFooter(props: HTMLAttributes<HTMLDivElement>) {
  const docked = useContext(Docked);
  if (!docked) return <ModalSheet.SheetFooter {...props} />;
  return <div {...props} className={cn('flex flex-wrap items-center gap-3 px-5 py-4 border-t border-slate-100 shrink-0', props.className)} />;
}
