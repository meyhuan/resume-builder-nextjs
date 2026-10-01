import { useCallback, useEffect, useRef, useState } from 'react';
import type { FocusEvent, MouseEvent } from 'react';

/** One owner for a region and all of its descendants, including floating actions. */
export function useHoverActions<T extends HTMLElement>(disabled = false) {
  const ref = useRef<T>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerInside = useRef(false);
  const focusInside = useRef(false);
  const [visible, setVisible] = useState(false);

  const cancelHide = useCallback((): void => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => cancelHide, [cancelHide]);
  useEffect(() => {
    cancelHide();
    pointerInside.current = !disabled && Boolean(ref.current?.matches(':hover'));
    focusInside.current = !disabled && Boolean(ref.current?.contains(document.activeElement));
    // Reconcile the region after inline editing enables/disables its actions.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(pointerInside.current || focusInside.current);
  }, [disabled, cancelHide]);

  function isInternal(event: MouseEvent<T> | FocusEvent<T>): boolean {
    return event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget);
  }

  return {
    ref,
    isVisible: !disabled && visible,
    onMouseEnter(): void {
      if (disabled) return;
      pointerInside.current = true;
      cancelHide();
      setVisible(true);
    },
    onMouseLeave(event: MouseEvent<T>): void {
      if (isInternal(event)) return;
      pointerInside.current = false;
      cancelHide();
      if (disabled) return;
      timer.current = setTimeout(() => {
        timer.current = null;
        if (!focusInside.current) setVisible(false);
      }, 200);
    },
    onFocus(): void {
      if (disabled) return;
      focusInside.current = true;
      cancelHide();
      setVisible(true);
    },
    onBlur(event: FocusEvent<T>): void {
      if (isInternal(event)) return;
      focusInside.current = false;
      if (!pointerInside.current) {
        cancelHide();
        setVisible(false);
      }
    },
  };
}
