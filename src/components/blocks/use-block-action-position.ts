import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';

/** Keep local actions inside the visible canvas, even on zoomed/wide paper. */
export function useBlockActionPosition(ref: RefObject<HTMLDivElement | null>): CSSProperties | undefined {
  const [style, setStyle] = useState<CSSProperties>();
  useLayoutEffect(() => {
    const actions = ref.current;
    const owner = actions?.closest<HTMLElement>('[data-resume-edit-region="block"]');
    const canvas = actions?.closest<HTMLElement>('[data-editor-canvas]');
    const section = owner?.closest<HTMLElement>('[data-resume-edit-region="section"]');
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
      const height = actions.offsetHeight * scale;
      const topEdge = Math.max(0, bounds.top) + 4;
      const bottomEdge = Math.min(window.innerHeight, bounds.bottom) - 4;
      const sectionTop = section?.getBoundingClientRect().top;
      // On the first row, keep an upward-facing toolbar clear of module controls.
      const aboveAnchor = sectionTop !== undefined && sectionTop >= topEdge
        && section?.querySelector('[data-resume-edit-region="block"]') === owner ? sectionTop : row.top;
      const fitsBelow = row.bottom + 4 * scale + height <= bottomEdge;
      const fitsAbove = aboveAnchor - 4 * scale - height >= topEdge;
      const top = fitsBelow ? '100%' : fitsAbove ? 'auto'
        : (Math.max(topEdge, bottomEdge - height) - row.top) / scale;
      const bottom = !fitsBelow && fitsAbove ? '100%' : 'auto';
      const marginTop = fitsBelow ? 4 : 0;
      const marginBottom = !fitsBelow && fitsAbove ? (row.top - aboveAnchor) / scale + 4 : 0;
      setStyle(current => current?.right === offset && current?.maxWidth === maxWidth && current?.visibility === visibility
        && current?.top === top && current?.bottom === bottom && current?.marginTop === marginTop && current?.marginBottom === marginBottom
        ? current : { right: offset, maxWidth, visibility, top, bottom, marginTop, marginBottom });
    };
    const schedule = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(owner);
    observer.observe(canvas);
    observer.observe(actions);
    if (section) observer.observe(section);
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
