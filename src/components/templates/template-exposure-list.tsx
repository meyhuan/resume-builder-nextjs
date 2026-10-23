'use client'
import { useRef, type ReactNode } from 'react'
import { track } from '@/lib/analytics'
import { useTemplateImpressions } from './use-template-impressions'

/** Adds telemetry to server-rendered recommendation cards without changing their layout. */
export function TemplateExposureList({ children, className, scope }: { children: ReactNode; className: string; scope: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useTemplateImpressions(ref, scope, 'role_recommendations')
  return <div ref={ref} className={className} onClickCapture={event => {
    const link = (event.target as HTMLElement).closest('a[href^="/editor?template="]')
    const card = link?.closest<HTMLElement>('[data-template-id]')
    if (card?.dataset.templateId) track('template_select', { templateId: card.dataset.templateId, entry: 'role_recommendations' })
  }}>{children}</div>
}
