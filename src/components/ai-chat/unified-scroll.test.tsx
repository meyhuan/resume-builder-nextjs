import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useConversationScroll } from './use-conversation-scroll';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('cancels queued follow on upward wheel, preserves reading position and resumes explicitly', () => {
  let resized = () => {};
  const frames = new Map<number, FrameRequestCallback>();
  let next = 0;
  const disconnected = vi.fn();
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { resized = callback; }
    observe() {}
    disconnect = disconnected;
  });
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { frames.set(++next, fn); return next; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  function Harness() {
    const { viewport, content, onWheel, onScroll, jumpToLatest, paused } = useConversationScroll('session');
    return <><div data-testid="viewport" ref={viewport} onWheel={onWheel} onScroll={onScroll}>
      <div ref={content}><article data-assistant-turn="one">Reply</article></div>
    </div><button onClick={jumpToLatest}>{paused ? 'Resume' : 'Following'}</button></>;
  }
  const view = render(<Harness />);
  const viewport = view.getByTestId('viewport');
  Object.defineProperties(viewport, { scrollHeight: { value: 2000 }, clientHeight: { value: 400 } });
  viewport.scrollTop = 700;
  act(() => resized());
  expect(frames.size).toBe(1);
  fireEvent.wheel(viewport, { deltaY: -100 });
  expect(frames.size).toBe(0);
  viewport.scrollTop = 600;
  fireEvent.scroll(viewport);
  act(() => { resized(); const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(0)); });
  expect(viewport.scrollTop).toBe(600);
  fireEvent.click(view.getByText('Resume'));
  expect(viewport.scrollTop).toBe(2000);
  act(() => resized());
  view.unmount();
  expect(frames.size).toBe(0);
  expect(disconnected).toHaveBeenCalled();
});
