'use client';

import { useEffect, useRef, useState } from 'react';

/** Once per identity per mounted element, only when visible in the foreground.
 * No observer support means no exposure, never a fabricated denominator.
 */
export function useAiImpression<T extends HTMLElement>(
  identity: string,
  onVisible: () => void,
  enabled = true,
) {
  const [target, setTarget] = useState<T | null>(null);
  const callback = useRef(onVisible);
  useEffect(() => {
    callback.current = onVisible;
  }, [onVisible]);
  const seen = useRef(new Set<string>());
  useEffect(() => {
    if (
      !enabled ||
      !target ||
      seen.current.has(identity) ||
      typeof IntersectionObserver === 'undefined'
    )
      return;
    let intersects = false;
    const report = () => {
      if (
        !intersects ||
        document.visibilityState !== 'visible' ||
        seen.current.has(identity)
      )
        return;
      for (
        let node: HTMLElement | null = target;
        node;
        node = node.parentElement
      ) {
        const style = getComputedStyle(node);
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.visibility === 'collapse' ||
          Number(style.opacity || 1) === 0
        )
          return;
      }
      seen.current.add(identity);
      callback.current();
    };
    const observer = new IntersectionObserver(
      (entries) => {
        intersects = entries.some(
          (entry) => entry.isIntersecting && entry.intersectionRatio > 0,
        );
        report();
      },
      { threshold: 0 },
    );
    observer.observe(target);
    document.addEventListener('visibilitychange', report);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', report);
    };
  }, [enabled, identity, target]);
  return setTarget;
}
