'use client'

import type { ReactElement } from 'react'
import PrintRenderer from '@/app/print/[id]/print-renderer'
import type { ResumeData } from '@/entities/resume/resume-data'

export default function ReadOnlyResumeRenderer({ resume, templateId }: { readonly resume: ResumeData; readonly templateId: string }): ReactElement {
  return <PrintRenderer resume={resume} templateId={templateId} />
}
