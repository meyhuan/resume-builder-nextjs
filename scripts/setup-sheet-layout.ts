import { beforeEach, vi } from 'vitest'

// JSDOM provides no geometry. Keep the real sheet/animation implementation and
// supply only the container measurements that ResizeObserver would report.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const height = this.classList.contains('react-modal-sheet-container') ? 633 : 44
    return { x: 0, y: 0, top: 0, left: 0, width: 375, height, right: 375, bottom: height, toJSON: () => ({}) }
  })
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('react-modal-sheet-container') ? 633 : 44
  })
  vi.stubGlobal('ResizeObserver', class {
    constructor(private callback: ResizeObserverCallback) {}
    observe(target: Element): void {
      if (target.classList.contains('react-modal-sheet-container')) queueMicrotask(() => {
        if (target.isConnected) this.callback([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver)
      })
    }
    disconnect(): void {}
    unobserve(): void {}
  })
})
