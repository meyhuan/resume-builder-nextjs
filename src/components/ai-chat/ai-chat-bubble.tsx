'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, Minus, Sparkles } from 'lucide-react';
import { useEditorUiStore } from '@/state/editor-ui-store';
import { AiChatPanel } from '@/components/ai-chat/ai-chat-panel';

const WIN_W_DESKTOP = 440;
const WIN_H_DESKTOP = 620;
const MARGIN = 16;
const FEEDBACK_CLEARANCE = 88;
const MOBILE_BREAKPOINT = 640;

function getWinSize(): { w: number; h: number } {
  if (typeof window === 'undefined') return { w: WIN_W_DESKTOP, h: WIN_H_DESKTOP };
  if (window.innerWidth < MOBILE_BREAKPOINT) {
    return {
      w: Math.min(window.innerWidth - MARGIN * 2, 360),
      h: Math.min(window.innerHeight - 120, 480),
    };
  }
  return { w: WIN_W_DESKTOP, h: WIN_H_DESKTOP };
}

function defaultWindowPos(winW: number, winH: number): { left: number; top: number } {
  if (typeof window === 'undefined') return { left: 100, top: 100 };
  return {
    left: Math.max(MARGIN, window.innerWidth - winW - MARGIN),
    top: Math.max(MARGIN, window.innerHeight - winH - FEEDBACK_CLEARANCE),
  };
}

export function AiChatBubble(props: {
  readonly resumeId?: string;
}): React.ReactElement {
  const showAiChat = useEditorUiStore((state) => state.showAiChat);
  const toggleAiChat = useEditorUiStore((state) => state.toggleAiChat);
  const openModal = useEditorUiStore((state) => state.openModal);

  const [winSize, setWinSize] = useState(getWinSize);
  const [windowPos, setWindowPos] = useState<{ left: number; top: number } | null>(null);
  const windowDragRef = useRef<{
    startX: number;
    startY: number;
    origLeft: number;
    origTop: number;
  } | null>(null);

  useEffect(() => {
    const onResize = (): void => setWinSize(getWinSize());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const winPos = windowPos ?? defaultWindowPos(winSize.w, winSize.h);

  const onWindowMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    windowDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      origLeft: winPos.left,
      origTop: winPos.top,
    };
    const onMouseMove = (ev: MouseEvent): void => {
      if (!windowDragRef.current) return;
      setWindowPos({
        left: windowDragRef.current.origLeft + (ev.clientX - windowDragRef.current.startX),
        top: windowDragRef.current.origTop + (ev.clientY - windowDragRef.current.startY),
      });
    };
    const onMouseUp = (): void => {
      windowDragRef.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [winPos]);

  return (
    <div
      className="fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-opacity duration-200 print:hidden"
      style={{
        width: winSize.w,
        height: winSize.h,
        left: winPos.left,
        top: winPos.top,
        opacity: showAiChat ? 1 : 0,
        pointerEvents: showAiChat ? 'auto' : 'none',
      }}
    >
      <div
        className="flex cursor-move items-center justify-between bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-2.5"
        onMouseDown={onWindowMouseDown}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-white" />
          <span className="text-sm font-semibold text-white">AI 助手</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded p-1 text-white/80 hover:bg-white/20 hover:text-white"
            title="一键优化"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={() => openModal('optimize')}
          >
            <Sparkles className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded p-1 text-white/80 hover:bg-white/20 hover:text-white"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={toggleAiChat}
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <AiChatPanel resumeId={props.resumeId} hideTitle />
      </div>
    </div>
  );
}
