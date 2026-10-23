import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TemplateCover } from './template-cover'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('TemplateCover', () => {
  it('does not request the cover until it nears the viewport', () => {
    let notify: IntersectionObserverCallback | undefined
    class Observer {
      constructor(callback: IntersectionObserverCallback) {
        notify = callback
      }
      observe(): void {}
      disconnect(): void {}
      unobserve(): void {}
      takeRecords(): IntersectionObserverEntry[] { return [] }
    }
    vi.stubGlobal('IntersectionObserver', Observer)

    render(<TemplateCover src="/thumbnails/template_simple.webp" alt="简约" />)
    expect(screen.queryByRole('img', { name: '简约' })).toBeNull()

    act(() => {
      notify?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    })
    expect(screen.getByRole('img', { name: '简约' }).getAttribute('src')).toBe('/thumbnails/template_simple.webp')
  })

  it('falls back to an asynchronous load when IntersectionObserver is unavailable', async () => {
    vi.stubGlobal('IntersectionObserver', undefined)

    render(<TemplateCover src="/thumbnails/template_simple.webp" alt="简约" />)

    await waitFor(() => expect(screen.getByRole('img', { name: '简约' }).getAttribute('src')).toBe('/thumbnails/template_simple.webp'))
  })
})
