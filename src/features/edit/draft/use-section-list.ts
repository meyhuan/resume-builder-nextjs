'use client'

import { useCallback, useMemo } from 'react'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import type { Section } from '@/entities/resume/section'
import { createDefaultBlock } from '@/entities/blocks/block-factory'
import { MODULES, getSectionTitleCandidates } from '@/entities/module/module-config'
import { useDraftStore } from './draft-store'

/**
 * Generate a UUID-ish id with a prefix.
 */
function createId(prefix: string): string {
  const rnd: string = Math.random().toString(36).slice(2, 10)
  return `${prefix}-${Date.now().toString(36)}-${rnd}`
}

function normalizeTitle(title: string): string {
  return title.replace(/\s/g, '')
}

function getTitleCandidates(title: string): readonly string[] {
  const normalized: string = normalizeTitle(title)
  const module = MODULES.find((m) =>
    getSectionTitleCandidates(m).some((candidate) => normalizeTitle(candidate) === normalized),
  )
  const candidates = module ? [title, ...getSectionTitleCandidates(module)] : [title]
  return Array.from(new Set(candidates.filter(Boolean)))
}

function findSectionIndex(sections: readonly Section[], title: string): number {
  const candidateSet = new Set(getTitleCandidates(title).map(normalizeTitle))
  return sections.findIndex((s) => candidateSet.has(normalizeTitle(s.title)))
}

export interface SectionListBinding {
  readonly section: Section | null
  readonly blocks: readonly ResumeBlock[]
  readonly addBlock: () => string
  readonly removeBlock: (blockId: string) => void
  readonly moveBlockUp: (blockId: string) => void
  readonly moveBlockDown: (blockId: string) => void
  readonly updateBlock: (blockId: string, patch: Partial<ResumeBlock>) => void
  readonly getBlockAt: (idx: number) => ResumeBlock | undefined
}

/**
 * Hook that returns list-level bindings for a named section.
 * Creates the section lazily the first time `addBlock` is called.
 */
export function useSectionList(sectionTitle: string): SectionListBinding {
  const draft = useDraftStore((s) => s.draft)
  const updateDraft = useDraftStore((s) => s.updateDraft)

  const { section, blocks }: { section: Section | null; blocks: readonly ResumeBlock[] } = useMemo(() => {
    if (!draft) return { section: null, blocks: [] }
    const idx: number = findSectionIndex(draft.sections, sectionTitle)
    if (idx < 0) return { section: null, blocks: [] }
    const s = draft.sections[idx]
    return { section: s, blocks: s.blocks }
  }, [draft, sectionTitle])

  const addBlock = useCallback((): string => {
    let newId: string = ''
    updateDraft(`sections.${sectionTitle}.add`, (d) => {
      let idx: number = findSectionIndex(d.sections, sectionTitle)
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
      const block = createDefaultBlock(sectionTitle, createId)
      newId = block.id
      ;(d.sections[idx].blocks as ResumeBlock[]).push(block)
    })
    return newId
  }, [sectionTitle, updateDraft])

  const removeBlock = useCallback(
    (blockId: string): void => {
      updateDraft(`sections.${sectionTitle}.${blockId}.remove`, (d) => {
        const idx: number = findSectionIndex(d.sections, sectionTitle)
        if (idx < 0) return
        const list = d.sections[idx].blocks as ResumeBlock[]
        const bIdx: number = list.findIndex((b) => b.id === blockId)
        if (bIdx >= 0) list.splice(bIdx, 1)
      })
    },
    [sectionTitle, updateDraft],
  )

  const moveBlockUp = useCallback(
    (blockId: string): void => {
      updateDraft(`sections.${sectionTitle}.${blockId}.moveUp`, (d) => {
        const idx: number = findSectionIndex(d.sections, sectionTitle)
        if (idx < 0) return
        const list = d.sections[idx].blocks as ResumeBlock[]
        const bIdx: number = list.findIndex((b) => b.id === blockId)
        if (bIdx <= 0) return
        ;[list[bIdx - 1], list[bIdx]] = [list[bIdx], list[bIdx - 1]]
      })
    },
    [sectionTitle, updateDraft],
  )

  const moveBlockDown = useCallback(
    (blockId: string): void => {
      updateDraft(`sections.${sectionTitle}.${blockId}.moveDown`, (d) => {
        const idx: number = findSectionIndex(d.sections, sectionTitle)
        if (idx < 0) return
        const list = d.sections[idx].blocks as ResumeBlock[]
        const bIdx: number = list.findIndex((b) => b.id === blockId)
        if (bIdx < 0 || bIdx >= list.length - 1) return
        ;[list[bIdx], list[bIdx + 1]] = [list[bIdx + 1], list[bIdx]]
      })
    },
    [sectionTitle, updateDraft],
  )

  const updateBlock = useCallback(
    (blockId: string, patch: Partial<ResumeBlock>): void => {
      updateDraft(`sections.${sectionTitle}.${blockId}.update`, (d) => {
        const idx: number = findSectionIndex(d.sections, sectionTitle)
        if (idx < 0) return
        const list = d.sections[idx].blocks as ResumeBlock[]
        const bIdx: number = list.findIndex((b) => b.id === blockId)
        if (bIdx < 0) return
        list[bIdx] = { ...list[bIdx], ...patch } as ResumeBlock
      })
    },
    [sectionTitle, updateDraft],
  )

  const getBlockAt = useCallback(
    (idx: number): ResumeBlock | undefined => (idx >= 0 && idx < blocks.length ? blocks[idx] : undefined),
    [blocks],
  )

  return { section, blocks, addBlock, removeBlock, moveBlockUp, moveBlockDown, updateBlock, getBlockAt }
}
