'use client'

import { useCallback } from 'react'
import type { TextBlock } from '@/entities/blocks/text-block'
import type { Section } from '@/entities/resume/section'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import { useDraftStore } from './draft-store'

function createId(prefix: string): string {
  const rnd: string = Math.random().toString(36).slice(2, 10)
  return `${prefix}-${Date.now().toString(36)}-${rnd}`
}

export interface SingleTextBlockBinding {
  readonly html: string
  readonly setHtml: (next: string) => void
  readonly ready: boolean
}

/**
 * Bind a single text block living inside the named section. The section and
 * a text block are lazily created on first write.
 */
export function useSingleTextBlock(sectionTitle: string): SingleTextBlockBinding {
  const draft = useDraftStore((s) => s.draft)
  const updateDraft = useDraftStore((s) => s.updateDraft)

  const html: string = (() => {
    if (!draft) return ''
    const sec = draft.sections.find((s) => s.title.replace(/\s/g, '') === sectionTitle.replace(/\s/g, ''))
    if (!sec) return ''
    const txt = sec.blocks.find((b): b is TextBlock => b.type === 'text')
    return txt?.html ?? ''
  })()

  const setHtml = useCallback(
    (next: string): void => {
      updateDraft(`sections.${sectionTitle}.textBlock`, (d) => {
        let idx: number = d.sections.findIndex(
          (s) => s.title.replace(/\s/g, '') === sectionTitle.replace(/\s/g, ''),
        )
        if (idx < 0) {
          const newSection: Section = {
            id: createId('sec'),
            title: sectionTitle,
            columns: 1,
            blocks: [],
          }
          ;(d.sections as Section[]).push(newSection)
          idx = d.sections.length - 1
        }
        const list = d.sections[idx].blocks as ResumeBlock[]
        const tIdx: number = list.findIndex((b) => b.type === 'text')
        if (tIdx < 0) {
          list.push({ id: createId('text'), type: 'text', html: next })
        } else {
          list[tIdx] = { ...(list[tIdx] as TextBlock), html: next }
        }
      })
    },
    [sectionTitle, updateDraft],
  )

  return { html, setHtml, ready: Boolean(draft) }
}
