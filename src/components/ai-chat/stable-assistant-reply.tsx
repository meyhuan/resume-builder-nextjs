'use client';
import { useLayoutEffect, useRef } from 'react';

/** Retain the live reply shell and its occupied space through final validation. */
export function StableAssistantReply({ children, busy }: { children: React.ReactNode; busy: boolean }) {
  const shell = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const height = useRef(0);
  useLayoutEffect(() => {
    if (!shell.current || !body.current) return;
    if (busy && height.current === 0) {
      const viewport = shell.current.closest('[data-testid="assistant-conversation"]');
      const article = shell.current.closest('[data-assistant-turn]');
      if (viewport && article) {
        // Reserve one reading viewport for a new reply, so later growth cannot
        // change the scroll range and pull the message's opening upwards.
        height.current = Math.max(0, viewport.clientHeight -
          (shell.current.getBoundingClientRect().top - article.getBoundingClientRect().top) - 24);
      }
    }
    const measure = () => {
      if (!shell.current || !body.current) return;
      height.current = Math.max(height.current, body.current.getBoundingClientRect().height);
      shell.current.style.minHeight = `${height.current}px`;
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(body.current);
    return () => observer.disconnect();
  }, [busy]);
  return <div ref={shell} data-assistant-reply aria-busy={busy} className="min-w-0">
    <div ref={body} className="space-y-3">{children}</div>
  </div>;
}
