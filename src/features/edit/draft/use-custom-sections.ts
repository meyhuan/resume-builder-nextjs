'use client'

import { useCallback, useMemo } from 'react'
import type { Section } from '@/entities/resume/section'
import type { TextBlock } from '@/entities/blocks/text-block'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import { useDraftStore } from './draft-store'
import { MODULE_SECTION_TITLES } from '@/entities/module/module-config'

const CANONICAL_TITLES: readonly string[] = Object.values(MODULE_SECTION_TITLES)

function normalize(title: string): string {
  return title.replace(/\s/g, '')
}

function createId(prefix: string): string {
  const rnd: string = Math.random().toString(36).slice(2, 10)
  return `${prefix}-${Date.now().toString(36)}-${rnd}`
}

export interface CustomSectionsBinding {
  readonly sections: readonly Section[]
  readonly addSection: (title: string) => string
  readonly renameSection: (sectionId: string, nextTitle: string) => void
  readonly removeSection: (sectionId: string) => void
  readonly getTextHtml: (sectionId: string) => string
  readonly setTextHtml: (sectionId: string, html: string) => void
}

/**
 * Manage "custom" resume sections — any section whose title is not part of
 * the canonical module set.
 */
export function useCustomSections(): CustomSectionsBinding {
  const draft = useDraftStore((s) => s.draft)
  const updateDraft = useDraftStore((s) => s.updateDraft)

  const canonicalSet = useMemo((): Set<string> => new Set(CANONICAL_TITLES.map(normalize)), [])

  const sections: readonly Section[] = useMemo(() => {
    if (!draft) return []
    return draft.sections.filter((s) => !canonicalSet.has(normalize(s.title)))
  }, [draft, canonicalSet])

  const addSection = useCallback(
    (title: string): string => {
      const id: string = createId('sec')
      updateDraft(`sections.custom.${id}.add`, (d) => {
        ;(d.sections as Section[]).push({
          id,
          title,
          columns: 1,
          blocks: [
            { id: createId('text'), type: 'text', html: '' } as TextBlock,
          ],
        })
      })
      return id
    },
    [updateDraft],
  )

  const renameSection = useCallback(
    (sectionId: string, nextTitle: string): void => {
      updateDraft(`sections.custom.${sectionId}.rename`, (d) => {
        const idx: number = d.sections.findIndex((s) => s.id === sectionId)
        if (idx < 0) return
        d.sections[idx] = { ...d.sections[idx], title: nextTitle }
      })
    },
    [updateDraft],
  )

  const removeSection = useCallback(
    (sectionId: string): void => {
      updateDraft(`sections.custom.${sectionId}.remove`, (d) => {
        const idx: number = d.sections.findIndex((s) => s.id === sectionId)
        if (idx < 0) return
        ;(d.sections as Section[]).splice(idx, 1)
      })
    },
    [updateDraft],
  )

  const getTextHtml = useCallback(
    (sectionId: string): string => {
      const sec = draft?.sections.find((s) => s.id === sectionId)
      if (!sec) return ''
      const txt = sec.blocks.find((b): b is TextBlock => b.type === 'text')
      return txt?.html ?? ''
    },
    [draft],
  )

  const setTextHtml = useCallback(
    (sectionId: string, html: string): void => {
      updateDraft(`sections.custom.${sectionId}.text`, (d) => {
        const idx: number = d.sections.findIndex((s) => s.id === sectionId)
        if (idx < 0) return
        const list = d.sections[idx].blocks as ResumeBlock[]
        const tIdx: number = list.findIndex((b) => b.type === 'text')
        if (tIdx < 0) {
          list.push({ id: createId('text'), type: 'text', html } as TextBlock)
        } else {
          list[tIdx] = { ...(list[tIdx] as TextBlock), html }
        }
      })
    },
    [updateDraft],
  )

  return { sections, addSection, renameSection, removeSection, getTextHtml, setTextHtml }
}
