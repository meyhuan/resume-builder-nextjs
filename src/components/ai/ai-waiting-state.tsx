'use client';

import { useEffect, useState, type ReactElement } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function AiWaitingState(props: {
  readonly messages: readonly string[];
  readonly hint: string;
  readonly onCancel: () => void;
  readonly className?: string;
}): ReactElement {
  const [messageIdx, setMessageIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setMessageIdx(0);
    setElapsed(0);
    const messageTimer = window.setInterval(() => {
      setMessageIdx((index) => (index + 1) % props.messages.length);
    }, 2800);
    const elapsedTimer = window.setInterval(() => {
      setElapsed((seconds) => seconds + 1);
    }, 1000);
    return () => {
      window.clearInterval(messageTimer);
      window.clearInterval(elapsedTimer);
    };
  }, [props.messages]);

  return (
    <div className={cn('flex flex-col items-center justify-center gap-5 px-6 py-12', props.className)}>
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-violet-100 opacity-40 animate-ping" />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-violet-100">
          <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
        </div>
      </div>
      <div className="space-y-1 text-center">
        <p className="text-sm font-semibold text-slate-700">{props.messages[messageIdx]}</p>
        <p className="text-xs text-slate-400">{props.hint}</p>
        <p className="text-xs text-slate-400">已等待 {elapsed} 秒</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-slate-400 hover:text-slate-600"
        onClick={props.onCancel}
      >
        取消
      </Button>
    </div>
  );
}

export function isAbortError(error: unknown): boolean {
  return (error instanceof DOMException && error.name === 'AbortError')
    || (error instanceof Error && error.name === 'AbortError');
}
