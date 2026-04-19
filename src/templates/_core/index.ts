/**
 * `_core/` — Headless primitives + hooks for flagship, hand-crafted templates.
 *
 * Import from here rather than digging into subfolders.
 *
 * Usage pattern:
 * ```tsx
 * import {
 *   ResumeFrame, SortableSection, EditableText, AvatarSlot, FieldChip,
 *   BlockList, DeleteSectionDialog,
 *   useEditableHeader, useEditableSection,
 * } from '@/templates/_core'
 * ```
 */

// Types
export type { TemplateProps, DragHandleProps } from './types'

// Hooks
export { useEditableHeader } from './hooks/use-editable-header'
export type { EditableHeader } from './hooks/use-editable-header'
export { useEditableSection } from './hooks/use-editable-section'
export type { EditableSection } from './hooks/use-editable-section'
export { useEditableJobIntention } from './hooks/use-editable-job-intention'
export type { EditableJobIntention, JobIntentionFieldDef } from './hooks/use-editable-job-intention'

// Primitives
export { EditableText } from './primitives/editable-text'
export type { EditableTextProps } from './primitives/editable-text'
export { AvatarSlot } from './primitives/avatar-slot'
export type { AvatarSlotProps, AvatarRenderArgs } from './primitives/avatar-slot'
export { FieldChip } from './primitives/field-chip'
export type { FieldChipProps } from './primitives/field-chip'
export { SortableSection } from './primitives/sortable-section'
export type { SortableSectionProps } from './primitives/sortable-section'
export { BlockList } from './primitives/block-list'
export type { BlockListProps } from './primitives/block-list'
export { ResumeFrame, DeleteSectionDialog } from './primitives/resume-frame'
export type { ResumeFrameProps } from './primitives/resume-frame'
export { usePagePadding, usePagePaddingHorizontal, mmToPx } from './primitives/page-padding'

// Re-export handy shared utilities
export { lightenHex, darkenHex, hexToRgba } from '@/templates/_kernel/shared'
export type { BaseInfoFieldDef } from '@/templates/_kernel/shared'
