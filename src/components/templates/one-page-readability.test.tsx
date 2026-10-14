import { useRef, useState } from 'react'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { useOnePageMode } from '@/hooks/use-one-page-mode'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import type { AdjustableTokens, OnePageStrategy } from '@/entities/editor/editor-meta'
import { fitOnePagePrintFrame } from '@/lib/one-page-layout'

vi.mock('sonner', () => ({ toast: { info: vi.fn(), success: vi.fn(), warning: vi.fn() } }))
const initialTheme: ThemeTokens = { primaryColor: '#7c3aed', textColor: '#171717', fontFamily: 'sans-serif', fontSize: 14, lineHeight: 1.6, spacingScale: 1, pagePaddingVertical: 16, pagePaddingHorizontal: 16 }

function useFixture(height: number, override: Partial<ThemeTokens> = {}, strategy: OnePageStrategy = 'one-page', onOverflow?: () => void) {
  const [theme, setTheme] = useState({ ...initialTheme, ...override })
  const [enabled, setEnabled] = useState(false)
  const [snapshot, setSnapshot] = useState<AdjustableTokens | null>(null)
  const [content] = useState(() => {
    const element = document.createElement('div')
    Object.defineProperty(element, 'scrollHeight', { get: () => height })
    return element
  })
  const contentRef = useRef<HTMLDivElement | null>(content)
  const { status } = useOnePageMode({ contentRef, theme, enabled, snapshot, setSnapshot, strategy, onOverflow, patchTheme: (patch) => setTheme((current) => ({ ...current, ...patch })) })
  return { theme, enabled, setEnabled, snapshot, status }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(1123)
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

async function tick(count: number) {
  for (let index = 0; index < count; index++) await act(async () => { await vi.advanceTimersByTimeAsync(250) })
}

describe('automatic one-page readability', () => {
  it('stops at readable limits, reports overflow, and restores the exact snapshot on disable', async () => {
    const { result } = renderHook(() => useFixture(1500))
    act(() => result.current.setEnabled(true))
    await tick(30)
    expect(result.current.status).toBe('overflow')
    expect(result.current.theme).toMatchObject({ lineHeight: 1.2, fontSize: 12, spacingScale: 0 })
    act(() => result.current.setEnabled(false))
    expect(result.current.status).toBe('idle')
    expect(result.current.theme).toEqual(initialTheme)
    expect(result.current.snapshot).toBeNull()
    expect(toast.warning).toHaveBeenCalledOnce()
  })
  it('does not compress an already-fitting resume', async () => {
    const { result } = renderHook(() => useFixture(500))
    act(() => result.current.setEnabled(true))
    await tick(2)
    expect(result.current.status).toBe('fit')
    expect(result.current.theme).toEqual(initialTheme)
  })
  it('preserves pre-existing compact settings while enabled, without losing them on disable', async () => {
    const { result } = renderHook(() => useFixture(500, { lineHeight: 1, fontSize: 10, spacingScale: 0 }))
    act(() => result.current.setEnabled(true))
    await tick(3)
    expect(result.current.status).toBe('fit')
    expect(result.current.theme).toMatchObject({ lineHeight: 1, fontSize: 10, spacingScale: 0 })
    act(() => result.current.setEnabled(false))
    expect(result.current.theme).toMatchObject({ lineHeight: 1, fontSize: 10, spacingScale: 0 })
  })

  it('lets users explicitly choose the readability strategy', async () => {
    const { result } = renderHook(() => useFixture(500, { lineHeight: 1, fontSize: 10, spacingScale: 0 }, 'readability'))
    act(() => result.current.setEnabled(true))
    await tick(3)
    expect(result.current.status).toBe('fit')
    expect(result.current.theme).toMatchObject({ lineHeight: 1.4, fontSize: 12, spacingScale: 0.4 })
    act(() => result.current.setEnabled(false))
    expect(result.current.theme).toMatchObject({ lineHeight: 1, fontSize: 10, spacingScale: 0 })
  })

  it('does not modify theme values in manual mode', async () => {
    const { result } = renderHook(() => useFixture(1500, { lineHeight: 1.2, fontSize: 13, spacingScale: 0.2 }, 'manual'))
    act(() => result.current.setEnabled(true))
    await tick(3)
    expect(result.current.status).toBe('overflow')
    expect(result.current.theme).toMatchObject({ lineHeight: 1.2, fontSize: 13, spacingScale: 0.2 })
  })

  it('uses the overflow callback instead of the default warning when provided', async () => {
    const onOverflow = vi.fn()
    const { result } = renderHook(() => useFixture(1500, {}, 'one-page', onOverflow))
    act(() => result.current.setEnabled(true))
    await tick(30)
    expect(result.current.status).toBe('overflow')
    expect(onOverflow).toHaveBeenCalledOnce()
    expect(toast.warning).not.toHaveBeenCalled()
  })

  it('keeps a fitting print frame visible without applying a transform', () => {
    const frame = document.createElement('div')
    const root = document.createElement('div')
    document.body.append(frame)
    frame.append(root)
    Object.defineProperty(root, 'scrollHeight', { configurable: true, value: 1000 })
    Object.defineProperty(root, 'clientHeight', { configurable: true, value: 1000 })
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({ top: 0, bottom: 1000, height: 1000, width: 794 } as DOMRect)

    const result = fitOnePagePrintFrame(frame, root)

    expect(result.fits).toBe(true)
    expect(frame.style.height).toBe('auto')
    expect(frame.style.overflow).toBe('visible')
    expect(root.style.transform).toBe('none')
    expect(frame.dataset.onePageFit).toBe('true')
  })

  it('falls back to normal pagination when fitting would make text too small', () => {
    const frame = document.createElement('div')
    const root = document.createElement('div')
    document.body.append(frame)
    frame.append(root)
    Object.defineProperty(root, 'scrollHeight', { configurable: true, value: 2000 })
    Object.defineProperty(root, 'clientHeight', { configurable: true, value: 2000 })
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({ top: 0, bottom: 2000, height: 2000, width: 794 } as DOMRect)

    const result = fitOnePagePrintFrame(frame, root)

    expect(result.fits).toBe(false)
    expect(frame.style.overflow).toBe('visible')
    expect(frame.style.minHeight).toBe('0')
    expect(frame.style.getPropertyValue('break-inside')).toBe('auto')
    expect(frame.style.getPropertyValue('page-break-after')).toBe('auto')
    expect(root.style.getPropertyValue('break-after')).toBe('auto')
    expect(root.style.transform).toBe('none')
  })
})
