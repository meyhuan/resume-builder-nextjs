'use client'
import { useEffect, type RefObject } from 'react'
import { track } from '@/lib/analytics'
import { clearTemplateImpressions, templateEventId } from '@/lib/templates/template-journey'

// Count only cards at least 50% visible for 500 ms, including scroll-container clipping.
export function useTemplateImpressions(ref: RefObject<HTMLElement | null>, scope: string, entry: string): void {
  useEffect(() => {
    const root = ref.current
    if (!root || typeof IntersectionObserver === 'undefined') return
    if (/^\/(dev|print)(\/|$)/.test(location.pathname)) return
    clearTemplateImpressions(entry)
    const listId = templateEventId()
    const seen = new Set<Element>()
    const visible = new Set<Element>()
    const timers = new Map<Element, ReturnType<typeof setTimeout>>()
    const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-template-id]'))
    const cancel = (card: Element): void => { clearTimeout(timers.get(card)); timers.delete(card) }
    const start = (card: Element): void => {
      if (seen.has(card) || timers.has(card) || document.visibilityState === 'hidden') return
      timers.set(card, setTimeout(() => {
        timers.delete(card)
        if (!visible.has(card) || document.visibilityState === 'hidden') return
        seen.add(card)
        track('template_impression', {
          templateId: (card as HTMLElement).dataset.templateId,
          impressionId: templateEventId(), listId, position: cards.indexOf(card as HTMLElement) + 1,
          entry, filter: scope,
        })
      }, 500))
    }
    const observer = new IntersectionObserver(entries => {
      for (const item of entries) {
        if (item.isIntersecting && item.intersectionRatio >= 0.5) { visible.add(item.target); start(item.target) }
        else { visible.delete(item.target); cancel(item.target) }
      }
    }, { threshold: [0, 0.5] })
    const visibility = (): void => {
      for (const card of visible) document.visibilityState === 'hidden' ? cancel(card) : start(card)
    }
    cards.forEach(card => observer.observe(card))
    document.addEventListener('visibilitychange', visibility)
    return () => { observer.disconnect(); timers.forEach(clearTimeout); clearTemplateImpressions(entry); document.removeEventListener('visibilitychange', visibility) }
  }, [ref, scope, entry])
}
