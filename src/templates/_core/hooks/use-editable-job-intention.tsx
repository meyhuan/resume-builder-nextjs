import { useState } from 'react'
import type { ReactElement } from 'react'
import type { JobIntention } from '@/entities/user/job-intention'
import JobIntentionModal from '@/components/modals/job-intention-modal'
import { useAppStore } from '@/state/store'
import { getJobIntentionFieldLabel, getJobIntentionSectionTitle } from '@/lib/resume-ui-labels'

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
  readonly sectionTitle: string
  readonly openEditModal: () => void
  readonly deleteField: (key: string) => void
  readonly hoveredField: string | null
  readonly setHoveredField: (key: string | null) => void
  /** MUST be rendered somewhere in the template (portal-safe). */
  readonly modals: ReactElement | null
}

const FIELD_KEYS: ReadonlyArray<keyof JobIntention> = [
  'position',
  'city',
  'salary',
  'type',
  'industry',
  'currentStatus',
]

/**
 * Build a template-agnostic, editable job intention handle.
 */
export function useEditableJobIntention(
  jobIntention: JobIntention | null | undefined
): EditableJobIntention {
  const updateJobIntention = useAppStore((s) => s.updateJobIntention)
  const language = useAppStore((s) => s.resume.language)
  const [showModal, setShowModal] = useState<boolean>(false)
  const [hoveredField, setHoveredField] = useState<string | null>(null)
  const ji: JobIntention | null = jobIntention ?? null
  const fields: JobIntentionFieldDef[] = []
  if (ji) {
    for (const key of FIELD_KEYS) {
      const raw: unknown = ji[key]
      if (typeof raw === 'string' && raw.trim().length > 0) {
        fields.push({ key: key as string, label: getJobIntentionFieldLabel(key, language), value: raw })
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
    sectionTitle: getJobIntentionSectionTitle(language),
    openEditModal: () => setShowModal(true),
    deleteField,
    hoveredField,
    setHoveredField,
    modals,
  }
}
