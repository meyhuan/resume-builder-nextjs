'use client';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

/** One scroll owner. Keep the latest reply's start visible instead of chasing its footer. */
export function useConversationScroll(sessionId: string) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const mode = useRef<'opening' | 'tail'>('opening');
  const frame = useRef<number | null>(null);
  const lastTop = useRef(0);
  const anchor = useRef<{ node: HTMLElement; offset: number } | null>(null);
  const [paused, setPaused] = useState(false);
  const cancel = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);
  const remember = useCallback(() => {
    const el = viewport.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    const node = [...el.querySelectorAll<HTMLElement>('[data-assistant-turn]')]
      .find(node => node.getBoundingClientRect().bottom > top);
    anchor.current = node ? { node, offset: node.getBoundingClientRect().top - top } : null;
    lastTop.current = el.scrollTop;
  }, []);
  const reconcile = useCallback(() => {
    frame.current = null;
    const el = viewport.current;
    if (!el) return;
    if (following.current) {
      const replies = el.querySelectorAll<HTMLElement>('[data-assistant-turn]');
      const reply = replies[replies.length - 1];
      // Grow until the reply reaches the top, then keep its opening in view.
      const opening = reply ? el.scrollTop + reply.getBoundingClientRect().top - el.getBoundingClientRect().top - 12 : el.scrollHeight;
      el.scrollTop = mode.current === 'tail' ? el.scrollHeight : Math.max(0, Math.min(el.scrollHeight - el.clientHeight, opening));
    } else if (anchor.current?.node.isConnected) {
      el.scrollTop += anchor.current.node.getBoundingClientRect().top - el.getBoundingClientRect().top - anchor.current.offset;
    }
    remember();
  }, [remember]);
  const pause = useCallback(() => {
    following.current = false; setPaused(true); cancel(); remember();
  }, [cancel, remember]);
  const follow = useCallback(() => {
    following.current = true; setPaused(false); anchor.current = null; cancel();
    mode.current = 'opening';
  }, [cancel]);
  useLayoutEffect(() => {
    following.current = true;
    anchor.current = null;
    mode.current = 'opening';
    cancel();
    let active = true;
    // Reset the indicator after synchronizing the DOM tracking, without a
    // cascading layout render or overriding a new user pause.
    queueMicrotask(() => { if (active && following.current) setPaused(false); });
    return () => { active = false; };
  }, [sessionId, cancel]);
  useLayoutEffect(() => { reconcile(); });
  useLayoutEffect(() => {
    if (!content.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      cancel();
      frame.current = requestAnimationFrame(reconcile);
    });
    observer.observe(content.current);
    return () => { observer.disconnect(); cancel(); };
  }, [cancel, reconcile, sessionId]);
  useLayoutEffect(() => cancel, [cancel]);
  return {
    viewport, content, paused, follow,
    onWheel: (e: React.WheelEvent) => { if (e.deltaY < 0) pause(); },
    onTouchStart: pause,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (['ArrowUp', 'PageUp', 'Home'].includes(e.key)) pause();
    },
    onScroll: () => {
      const el = viewport.current;
      if (!el) return;
      if (el.scrollTop < lastTop.current - 1) { following.current = false; setPaused(true); cancel(); }
      else if (el.scrollTop > lastTop.current + 1 && el.scrollHeight - el.scrollTop - el.clientHeight < 24) {
        following.current = true; mode.current = 'tail'; setPaused(false);
      } else if (el.scrollTop > lastTop.current + 1) {
        following.current = false; setPaused(true); cancel();
      }
      remember();
    },
    jumpToLatest: () => {
      follow();
      mode.current = 'tail';
      const el = viewport.current;
      if (el) { el.scrollTop = el.scrollHeight; remember(); }
    },
  };
}
