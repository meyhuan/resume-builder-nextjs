import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { useAiImpression } from '@/lib/ai/unified/use-impression';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('waits for foreground visibility, observes late-mounted targets and deduplicates rerenders', () => {
  let notify: IntersectionObserverCallback = () => {};
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: IntersectionObserverCallback) { notify = callback; }
    observe() {} disconnect() {}
  });
  const visible = vi.fn();
  const state = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
  function Menu({ open }: { open: boolean }) {
    const ref = useAiImpression<HTMLButtonElement>('menu', visible);
    return open ? <button ref={ref}>入口</button> : null;
  }
  const view = render(<Menu open={false} />);
  view.rerender(<Menu open />);
  const entry = screen.getByText('入口');
  const expose = () => act(() => notify([
    { target: entry, isIntersecting: true, intersectionRatio: 1,
      boundingClientRect: entry.getBoundingClientRect(), intersectionRect: entry.getBoundingClientRect(), rootBounds: null, time: 0 },
  ], {} as IntersectionObserver));
  expose();
  expect(visible).not.toHaveBeenCalled();
  state.mockReturnValue('visible');
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(visible).toHaveBeenCalledTimes(1);
  view.rerender(<Menu open />);
  expose();
  expect(visible).toHaveBeenCalledTimes(1);
});

it('does not count an intersecting but visually hidden ancestor', () => {
  let notify: IntersectionObserverCallback = () => {};
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: IntersectionObserverCallback) { notify = callback; }
    observe() {} disconnect() {}
  });
  const visible = vi.fn();
  function Hidden() {
    const ref = useAiImpression<HTMLButtonElement>('hidden', visible);
    return <div style={{ opacity: 0 }}><button ref={ref}>入口</button></div>;
  }
  render(<Hidden />);
  act(() => notify([{ isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry], {} as IntersectionObserver));
  expect(visible).not.toHaveBeenCalled();
});
