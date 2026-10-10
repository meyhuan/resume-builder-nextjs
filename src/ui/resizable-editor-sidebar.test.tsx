import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  EDITOR_SIDEBAR_MIN_WIDTH,
  EDITOR_SIDEBAR_STORAGE_KEY,
  ResizableEditorSidebar,
} from './resizable-editor-sidebar'

// Constants matching the implementation
const EDITOR_MIN_WIDTH = 720
const RESPONSIVE_DEFAULT_PERCENT = 0.34

function computeExpectedDefault(viewport: number): number {
  const responsive = Math.round(viewport * RESPONSIVE_DEFAULT_PERCENT)
  let width = Math.max(420, Math.min(600, responsive))
  const remaining = viewport - width
  if (remaining < EDITOR_MIN_WIDTH) {
    width = viewport - EDITOR_MIN_WIDTH
    if (width < EDITOR_SIDEBAR_MIN_WIDTH) {
      width = EDITOR_SIDEBAR_MIN_WIDTH
    }
  }
  return Math.round(width)
}

function setDesktopViewport(): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, get: () => 1440 })
}

function getHandle(container: HTMLElement): HTMLElement {
  const handle = container.querySelector('[data-testid="editor-sidebar-resize-handle"]')
  if (!(handle instanceof HTMLElement)) throw new Error('resize handle not found')
  return handle
}

function getWidth(container: HTMLElement): number {
  const sidebar = container.querySelector('[data-editor-workspace]')
  if (!(sidebar instanceof HTMLElement)) throw new Error('sidebar not found')
  return Number.parseInt(sidebar.style.getPropertyValue('--editor-sidebar-width'), 10)
}

describe('ResizableEditorSidebar', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })
  beforeEach(() => {
    setDesktopViewport()
    window.localStorage.clear()
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  })

  it('supports pointer dragging and persists the committed width', async () => {
    const { container } = render(
      <ResizableEditorSidebar open>
        <div>内容</div>
      </ResizableEditorSidebar>,
    )
    const handle = getHandle(container)
    const expectedDefault = computeExpectedDefault(1440)
    await waitFor(() => expect(getWidth(container)).toBe(expectedDefault))

    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 1000 })
    expect(document.body.style.userSelect).toBe('none')
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 850 })
    fireEvent.pointerUp(window, { pointerId: 1 })

    expect(getWidth(container)).toBe(640)
    expect(window.localStorage.getItem(EDITOR_SIDEBAR_STORAGE_KEY)).toBe('640')
    expect(document.body.style.userSelect).toBe('')
    expect(document.body.style.cursor).toBe('')
  })

  it('clamps pointer and keyboard changes to the supported range', async () => {
    const { container } = render(
      <ResizableEditorSidebar open>
        <div>内容</div>
      </ResizableEditorSidebar>,
    )
    const handle = getHandle(container)
    const expectedDefault = computeExpectedDefault(1440)
    await waitFor(() => expect(getWidth(container)).toBe(expectedDefault))

    fireEvent.pointerDown(handle, { button: 0, pointerId: 2, clientX: 1000 })
    fireEvent.pointerMove(window, { pointerId: 2, clientX: 0 })
    fireEvent.pointerUp(window, { pointerId: 2 })
    const expectedMax = 1440 - EDITOR_MIN_WIDTH
    expect(getWidth(container)).toBe(expectedMax)

    fireEvent.keyDown(handle, { key: 'Home' })
    expect(getWidth(container)).toBe(EDITOR_SIDEBAR_MIN_WIDTH)
    fireEvent.keyDown(handle, { key: 'End' })
    expect(getWidth(container)).toBe(expectedMax)
  })

  it('restores the stored width and resets it on double click', async () => {
    window.localStorage.setItem(EDITOR_SIDEBAR_STORAGE_KEY, '600')
    const { container } = render(
      <ResizableEditorSidebar open>
        <div>内容</div>
      </ResizableEditorSidebar>,
    )
    const handle = getHandle(container)
    await waitFor(() => expect(getWidth(container)).toBe(600))

    fireEvent.doubleClick(handle)
    const expectedDefault = computeExpectedDefault(1440)
    expect(getWidth(container)).toBe(expectedDefault)
    expect(window.localStorage.getItem(EDITOR_SIDEBAR_STORAGE_KEY)).toBe(
      String(expectedDefault),
    )
  })

  it('supports both arrow keys and persists keyboard changes', async () => {
    const { container } = render(<ResizableEditorSidebar open>内容</ResizableEditorSidebar>)
    const handle = getHandle(container)
    const expectedDefault = computeExpectedDefault(1440)
    await waitFor(() => expect(getWidth(container)).toBe(expectedDefault))
    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    expect(getWidth(container)).toBe(expectedDefault + 16)
    fireEvent.keyDown(handle, { key: 'ArrowRight', shiftKey: true })
    expect(getWidth(container)).toBe(expectedDefault + 16 - 80)
    expect(localStorage.getItem(EDITOR_SIDEBAR_STORAGE_KEY)).toBe(String(expectedDefault + 16 - 80))
  })

  it('ignores other pointers and clamps a touch drag at the minimum', async () => {
    const { container } = render(<ResizableEditorSidebar open>内容</ResizableEditorSidebar>)
    const handle = getHandle(container)
    const expectedDefault = computeExpectedDefault(1440)
    await waitFor(() => expect(getWidth(container)).toBe(expectedDefault))
    fireEvent.pointerDown(handle, { button: 0, pointerId: 7, pointerType: 'touch', clientX: 1000 })
    fireEvent.pointerMove(window, { pointerId: 8, clientX: 0 })
    fireEvent.pointerUp(window, { pointerId: 8 })
    expect(getWidth(container)).toBe(expectedDefault)
    expect(document.body.style.cursor).toBe('col-resize')
    fireEvent.pointerMove(window, { pointerId: 7, clientX: 2000 })
    fireEvent.pointerCancel(window, { pointerId: 7 })
    expect(getWidth(container)).toBe(360)
    expect(document.body.style.cursor).toBe('')
  })

  it.each(['unmount', 'close', 'blur'])('restores existing global styles on %s during a drag', (end) => {
    document.body.style.cursor = 'crosshair'
    document.body.style.userSelect = 'text'
    const view = render(<ResizableEditorSidebar open>内容</ResizableEditorSidebar>)
    fireEvent.pointerDown(getHandle(view.container), { button: 0, pointerId: 1, clientX: 1000 })
    expect(document.body.style.userSelect).toBe('none')
    if (end === 'unmount') view.unmount()
    if (end === 'close') view.rerender(<ResizableEditorSidebar open={false}>内容</ResizableEditorSidebar>)
    if (end === 'blur') fireEvent.blur(window)
    expect(document.body.style.cursor).toBe('crosshair')
    expect(document.body.style.userSelect).toBe('text')
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 0 })
    expect(localStorage.getItem(EDITOR_SIDEBAR_STORAGE_KEY)).toBeNull()
  })

  it('limits width to protect the canvas and restores the preference when space returns', async () => {
    localStorage.setItem(EDITOR_SIDEBAR_STORAGE_KEY, '640')
    const { container } = render(<ResizableEditorSidebar open>内容</ResizableEditorSidebar>)
    await waitFor(() => expect(getWidth(container)).toBe(640))
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 })
    fireEvent.resize(window)
    const expectedMax1024 = 1024 - EDITOR_MIN_WIDTH
    expect(getWidth(container)).toBe(expectedMax1024)
    expect(getHandle(container)).toHaveAttribute('aria-valuemax', String(expectedMax1024))
    expect(localStorage.getItem(EDITOR_SIDEBAR_STORAGE_KEY)).toBe('640')
    setDesktopViewport()
    fireEvent.resize(window)
    expect(getWidth(container)).toBe(640)
  })

  it('hydrates with a saved width without a server/client mismatch', async () => {
    localStorage.setItem(EDITOR_SIDEBAR_STORAGE_KEY, '600')
    const component = <ResizableEditorSidebar open>内容</ResizableEditorSidebar>
    const container = document.createElement('div')
    container.innerHTML = renderToString(component)
    document.body.append(container)
    // SSR uses CSS clamp, so we can't check the exact px value
    expect(container.querySelector('[data-editor-workspace]')).toBeTruthy()
    const recover = vi.fn()
    render(component, { container, hydrate: true, onRecoverableError: recover })
    await waitFor(() => expect(getWidth(container)).toBe(600))
    expect(recover).not.toHaveBeenCalled()
  })

  it.each(['', 'invalid'])('uses the default for invalid saved value "%s"', async (raw) => {
    localStorage.setItem(EDITOR_SIDEBAR_STORAGE_KEY, raw)
    const { container } = render(<ResizableEditorSidebar open>内容</ResizableEditorSidebar>)
    await act(() => new Promise<void>(resolve => window.requestAnimationFrame(() => resolve())))
    const expectedDefault = computeExpectedDefault(1440)
    expect(getWidth(container)).toBe(expectedDefault)
  })

  it('works when local storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    const { container } = render(<ResizableEditorSidebar open>内容</ResizableEditorSidebar>)
    await act(() => new Promise<void>(resolve => window.requestAnimationFrame(() => resolve())))
    fireEvent.keyDown(getHandle(container), { key: 'End' })
    const expectedMax = 1440 - EDITOR_MIN_WIDTH
    expect(getWidth(container)).toBe(expectedMax)
  })
})
