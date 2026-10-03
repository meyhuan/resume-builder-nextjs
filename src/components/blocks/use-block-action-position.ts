import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';

/** Keep local actions inside the visible canvas, even on zoomed/wide paper. */
export function useBlockActionPosition(ref: RefObject<HTMLDivElement | null>): CSSProperties | undefined {
  const [style, setStyle] = useState<CSSProperties>();
  useLayoutEffect(() => {
    const actions = ref.current;
    const owner = actions?.closest<HTMLElement>('[data-resume-edit-region="block"]');
    const canvas = actions?.closest<HTMLElement>('[data-editor-canvas]');
    if (!actions || !owner || !canvas || typeof ResizeObserver === 'undefined') return;
    let frame = 0;
    const update = (): void => {
      const row = owner.getBoundingClientRect();
      const bounds = canvas.getBoundingClientRect();
      const scale = owner.offsetWidth > 0 ? row.width / owner.offsetWidth : 1;
      if (scale <= 0) return;
      const left = Math.max(row.left, bounds.left + 8);
      const right = Math.min(row.right, bounds.right - 8);
      const offset = Math.max(0, (row.right - right) / scale);
      const maxWidth = Math.max(0, (right - left) / scale);
      const visibility = maxWidth > 0 ? 'visible' : 'hidden';
      setStyle(current => current?.right === offset && current?.maxWidth === maxWidth && current?.visibility === visibility
        ? current : { right: offset, maxWidth, visibility });
    };
    const schedule = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(owner);
    observer.observe(canvas);
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
    };
  }, [ref]);
  return style;
}
