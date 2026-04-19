import type { ReactElement } from 'react'
import type { BaseInfo } from '@/entities/user/base-info'
import { useAppStore } from '@/state/store'
import { useHeaderState } from '@/templates/_kernel/use-header-state'
import type { HeaderState } from '@/templates/_kernel/use-header-state'
import { buildBaseInfoFields } from '@/templates/_kernel/shared'
import type { BaseInfoFieldDef } from '@/templates/_kernel/shared'

/**
 * Headless hook that exposes ALL header-related state and actions a template needs,
 * in a shape that is stable and template-agnostic.
 *
 * Templates then decide how to visually render avatar / name / fields — the hook
 * only owns behavior (modals, uploads, field deletion, hover).
 */
export interface EditableHeader {
  readonly name: string
  readonly baseInfo: BaseInfo | null
  /** Pre-computed list of visible base-info fields, in display order. */
  readonly fields: readonly BaseInfoFieldDef[]
  /** Update the name (persisted immediately). */
  readonly onCommitName: (next: string) => void
  /** Delete a base-info field by key. */
  readonly deleteField: (key: string) => void
  /** Open the "edit base info" modal. */
  readonly openEditModal: () => void
  /** Programmatically trigger avatar upload. */
  readonly openAvatarUpload: () => void
  /** Currently hovered field key (for delete affordance). */
  readonly hoveredField: string | null
  readonly setHoveredField: (key: string | null) => void
  /** Currently hovered avatar (for upload affordance). */
  readonly avatarHovered: boolean
  readonly setAvatarHovered: (v: boolean) => void
  /** Hidden file input. Template MUST render this somewhere. */
  readonly fileInput: ReactElement
  /** Edit / crop modals. Template MUST render this somewhere. */
  readonly modals: ReactElement | null
  /** Low-level access for advanced customization. */
  readonly raw: HeaderState
}

/**
 * Wrap the kernel `useHeaderState` into a template-friendly shape.
 */
export function useEditableHeader(name: string, baseInfo: BaseInfo | null): EditableHeader {
  const state: HeaderState = useHeaderState(baseInfo, name)
  const updateBaseInfo = useAppStore((s) => s.updateBaseInfo)
  const fields: readonly BaseInfoFieldDef[] = buildBaseInfoFields(baseInfo)

  const onCommitName = (next: string): void => {
    const t: string = next.trim()
    if (!t || t === name) return
    updateBaseInfo((baseInfo ?? {}) as BaseInfo, t)
  }

  return {
    name,
    baseInfo,
    fields,
    onCommitName,
    deleteField: state.deleteField,
    openEditModal: state.openEditModal,
    openAvatarUpload: state.openAvatarUpload,
    hoveredField: state.hoveredField,
    setHoveredField: state.setHoveredField,
    avatarHovered: state.avatarHovered,
    setAvatarHovered: state.setAvatarHovered,
    fileInput: state.fileInput,
    modals: state.modals,
    raw: state,
  }
}
