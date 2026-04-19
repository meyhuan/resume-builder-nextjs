import { useState } from 'react'
import type { ReactElement } from 'react'
import type { JobIntention } from '@/entities/user/job-intention'
import JobIntentionModal from '@/components/modals/job-intention-modal'
import { useAppStore } from '@/state/store'

/**
 * Single field exposed for display.
 */
export interface JobIntentionFieldDef {
  readonly key: string
  readonly label: string
  readonly value: string
}

/**
 * Headless hook that owns job-intention editing behavior (modal + field removal
 * + hover affordance) and leaves rendering fully to the template.
 *
 * Templates render the UI however they like (ribbon, timeline row, card…) and
 * simply wire the returned callbacks and `modals` element.
 *
 * @example
 * const ji = useEditableJobIntention(resume.jobIntention)
 * <div onClick={ji.openEditModal}>
 *   {ji.fields.map(f => <span key={f.key}>{f.label}: {f.value}</span>)}
 * </div>
 * {ji.modals}
 */
export interface EditableJobIntention {
  readonly jobIntention: JobIntention | null
  /** Visible (non-empty) fields in canonical display order, incl. custom fields. */
  readonly fields: readonly JobIntentionFieldDef[]
  readonly openEditModal: () => void
  readonly deleteField: (key: string) => void
  readonly hoveredField: string | null
  readonly setHoveredField: (key: string | null) => void
  /** MUST be rendered somewhere in the template (portal-safe). */
  readonly modals: ReactElement | null
}

const FIELD_ORDER: ReadonlyArray<{ key: keyof JobIntention; label: string }> = [
  { key: 'position', label: '意向岗位' },
  { key: 'city', label: '意向城市' },
  { key: 'salary', label: '期望薪资' },
  { key: 'type', label: '求职类型' },
  { key: 'industry', label: '期望行业' },
  { key: 'currentStatus', label: '当前状态' },
]

/**
 * Build a template-agnostic, editable job intention handle.
 */
export function useEditableJobIntention(
  jobIntention: JobIntention | null | undefined
): EditableJobIntention {
  const updateJobIntention = useAppStore((s) => s.updateJobIntention)
  const [showModal, setShowModal] = useState<boolean>(false)
  const [hoveredField, setHoveredField] = useState<string | null>(null)
  const ji: JobIntention | null = jobIntention ?? null
  const fields: JobIntentionFieldDef[] = []
  if (ji) {
    for (const def of FIELD_ORDER) {
      const raw: unknown = ji[def.key]
      if (typeof raw === 'string' && raw.trim().length > 0) {
        fields.push({ key: def.key as string, label: def.label, value: raw })
      }
    }
    if (ji.customFields) {
      for (const cf of ji.customFields) {
        if (cf.label && cf.value) {
          fields.push({ key: `custom_${cf.label}`, label: cf.label, value: cf.value })
        }
      }
    }
  }
  const deleteField = (key: string): void => {
    if (!ji) return
    if (key.startsWith('custom_')) {
      const label: string = key.slice('custom_'.length)
      const filtered = (ji.customFields ?? []).filter((cf) => cf.label !== label)
      updateJobIntention({ ...ji, customFields: filtered.length > 0 ? filtered : undefined })
      return
    }
    updateJobIntention({ ...ji, [key]: undefined })
  }
  const modals: ReactElement | null = showModal
    ? (
      <JobIntentionModal
        jobIntention={ji}
        onClose={() => setShowModal(false)}
        onSave={updateJobIntention}
      />
    )
    : null
  return {
    jobIntention: ji,
    fields,
    openEditModal: () => setShowModal(true),
    deleteField,
    hoveredField,
    setHoveredField,
    modals,
  }
}
