import { useRef } from 'react'
import { cleanup, render, act } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useTemplateImpressions } from './use-template-impressions'
const { track } = vi.hoisted(() => ({ track: vi.fn() }))
vi.mock('@/lib/analytics', () => ({ track }))
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); track.mockClear() })
it('requires sustained half visibility, cancels scroll-away, and deduplicates re-entry', () => {
  vi.useFakeTimers()
  let callback: IntersectionObserverCallback
  vi.stubGlobal('IntersectionObserver', class { constructor(cb: IntersectionObserverCallback) { callback = cb } observe() {} disconnect() {} })
  function Cards() { const ref = useRef<HTMLDivElement>(null); useTemplateImpressions(ref, 'all', 'test'); return <div ref={ref}><button data-template-id="simple">Template</button></div> }
  const { getByRole } = render(<Cards />)
  const target = getByRole('button')
  const visible = (ratio: number) => act(() => callback([{ target, isIntersecting: ratio > 0, intersectionRatio: ratio, time: 0, boundingClientRect: target.getBoundingClientRect(), intersectionRect: target.getBoundingClientRect(), rootBounds: null }], {} as IntersectionObserver))
  visible(0.4); act(() => vi.advanceTimersByTime(600)); expect(track).not.toHaveBeenCalled()
  visible(0.6); act(() => vi.advanceTimersByTime(300)); visible(0); act(() => vi.advanceTimersByTime(500)); expect(track).not.toHaveBeenCalled()
  visible(0.6); act(() => vi.advanceTimersByTime(500)); expect(track).toHaveBeenCalledTimes(1)
  expect(track).toHaveBeenCalledWith('template_impression', expect.objectContaining({ templateId: 'simple', position: 1, entry: 'test' }))
  visible(0); visible(1); act(() => vi.advanceTimersByTime(600)); expect(track).toHaveBeenCalledTimes(1)
})
