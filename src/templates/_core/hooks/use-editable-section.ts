import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import type { Section } from '@/entities/resume/section'
import { useAppStore } from '@/state/store'
import { DndIds } from '@/dnd/ids'
import { getSectionDisplayTitle } from '@/entities/resume/section-display-title'
import { isTextOnlySection } from '@/templates/_kernel/shared'

/**
 * Headless hook that returns every action and DnD wiring a section needs.
 * Templates render the section's JSX however they want; they just attach
 * `dropRef` to the drop target and read `actions` for events.
 */
export interface EditableSection {
  readonly section: Section
  readonly title: string
  readonly displayTitle: string
  /** Is this a text-only section? Some affordances differ (no "add block"). */
  readonly isTextOnly: boolean
  /** Presentation titles are editable unless the editor is read-only. */
  readonly canEditTitle: boolean
  /** Commit an edited title. No-op if `canEditTitle` is false or value unchanged. */
  readonly onCommitTitle: (next: string) => void
  /** Add a fresh block of the section's default type. */
  readonly onAddBlock: () => void
  /** Request section deletion (caller renders confirm dialog). */
  readonly onRequestDelete: () => void
  /** Is the section hovered? Template controls when to toggle this. */
  readonly isHovered: boolean
  readonly setHovered: (v: boolean) => void
  /** DnD: attach to the block drop target element. */
  readonly dropRef: (el: HTMLElement | null) => void
  /** Controlled delete-confirm modal state. */
  readonly isDeleteDialogOpen: boolean
  readonly setDeleteDialogOpen: (v: boolean) => void
  /** Confirm delete (call from confirm-dialog's "confirm" button). */
  readonly confirmDelete: () => void
}

export function useEditableSection(section: Section): EditableSection {
  const addBlock = useAppStore((s) => s.addBlockByType)
  const deleteSection = useAppStore((s) => s.deleteSection)
  const updateDisplayTitle = useAppStore((s) => s.updateSectionDisplayTitle)
  const readOnly = useAppStore((s) => s.readOnly)

  const [isHovered, setHovered] = useState(false)
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const { setNodeRef: dropRef } = useDroppable({
    id: `${DndIds.SECTION_DROP_ID_PREFIX}${section.id}`,
  })

  const canEditTitle = !readOnly
  const displayTitle = getSectionDisplayTitle(section)
  const isTextOnly: boolean = isTextOnlySection(section)

  const onCommitTitle = (next: string): void => {
    const t: string = next.trim()
    if (!canEditTitle || t === displayTitle) return
    updateDisplayTitle(section.id, t)
  }

  const confirmDelete = (): void => {
    deleteSection(section.id)
    setDeleteDialogOpen(false)
  }

  return {
    section,
    title: section.title,
    displayTitle,
    isTextOnly,
    canEditTitle,
    onCommitTitle,
    onAddBlock: () => { if (!isTextOnly) addBlock(section.id) },
    onRequestDelete: () => setDeleteDialogOpen(true),
    isHovered,
    setHovered,
    dropRef,
    isDeleteDialogOpen,
    setDeleteDialogOpen,
    confirmDelete,
  }
}
