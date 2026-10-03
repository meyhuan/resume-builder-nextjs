import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';

/** Keep formats immediately above their paragraph, including CSS zoom and scrolling. */
export function useAnchoredToolbar(
  anchorRef: RefObject<HTMLElement | null>,
  toolbarRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({ position: 'fixed', visibility: 'hidden' });
  useLayoutEffect(() => {
    if (!enabled) return;
    const anchor = anchorRef.current;
    const toolbar = toolbarRef.current;
    if (!anchor || !toolbar) return;
    const canvas = anchor.closest<HTMLElement>('[data-editor-canvas]');
    let frame = 0;
    const update = (): void => {
      const rect = anchor.getBoundingClientRect();
      const bounds = canvas?.getBoundingClientRect();
      const leftEdge = Math.max(8, (bounds?.left ?? 0) + 8);
      const rightEdge = Math.min(window.innerWidth - 8, (bounds?.right ?? window.innerWidth) - 8);
      const topEdge = Math.max(0, bounds?.top ?? 0);
      const bottomEdge = Math.min(window.innerHeight, bounds?.bottom ?? window.innerHeight);
      const maxWidth = Math.max(0, rightEdge - leftEdge);
      const width = Math.min(toolbar.offsetWidth, maxWidth);
      const height = toolbar.offsetHeight;
      const top = rect.top - height - 6;
      const left = Math.max(leftEdge, Math.min(rect.left + (rect.width - width) / 2, rightEdge - width));
      // Scrolling a paragraph away also scrolls its tools away; never pin tools
      // over another paragraph or the document header.
      const visible = rect.width > 0 && maxWidth > 0 && top >= topEdge && top + height <= bottomEdge;
      const next: CSSProperties = { position: 'fixed', left, top, maxWidth, visibility: visible ? 'visible' : 'hidden' };
      setStyle(current => current.left === left && current.top === top && current.maxWidth === maxWidth && current.visibility === next.visibility ? current : next);
    };
    const schedule = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(anchor);
    observer.observe(toolbar);
    if (canvas) observer.observe(canvas);
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
    };
  }, [anchorRef, toolbarRef, enabled]);
  return style;
}
