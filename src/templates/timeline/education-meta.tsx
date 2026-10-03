import type { ReactElement } from 'react'
import EditableFieldWrapper from '@/editor/editable-field-wrapper'
import { hasMeaningfulText } from '@/lib/resume-placeholders'

/** Empty editable fields must not leave punctuation in preview or export. */
export function TimelineEducationMeta(props: {
  readonly blockId: string
  readonly major?: string
  readonly degree?: string
  readonly onUpdate: (field: 'major' | 'degree', value: string) => void
}): ReactElement {
  return <span data-timeline-education-meta="true">
    <EditableFieldWrapper blockId={props.blockId} fieldName="major" value={props.major} onUpdate={(value) => props.onUpdate('major', value)} placeholder="专业" />
    {hasMeaningfulText(props.major) && hasMeaningfulText(props.degree) ? <span className="mx-1">/</span> : null}
    <EditableFieldWrapper blockId={props.blockId} fieldName="degree" value={props.degree} onUpdate={(value) => props.onUpdate('degree', value)} placeholder="学历" />
  </span>
}
