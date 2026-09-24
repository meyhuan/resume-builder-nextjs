'use client'

import { useCallback } from 'react'
import { useDraftStore } from './draft-store'
import { setSectionDisplayTitle, validateSectionDisplayTitle } from '@/entities/resume/section-display-title'

export function useSectionDisplayTitle() {
  const updateDraft = useDraftStore((s) => s.updateDraft)
  return useCallback((sectionId: string, value: string | undefined): void => {
    if (value !== undefined && validateSectionDisplayTitle(value)) return
    const section = useDraftStore.getState().draft?.sections.find((s) => s.id === sectionId)
    if (!section || section.displayTitle === value?.trim()) return
    updateDraft(`sections.${sectionId}.displayTitle`, (draft) => {
      const target = draft.sections.find((s) => s.id === sectionId)
      if (target) setSectionDisplayTitle(target, value)
    })
  }, [updateDraft])
}
