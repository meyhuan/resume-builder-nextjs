'use client'

import type { ReactElement } from 'react'
import type { TemplateProps } from '@/templates/_core'
import { DocxSafeTemplate } from '@/templates/_docx-safe'

export default function CanvaColumnsTemplate(props: TemplateProps): ReactElement {
  return <DocxSafeTemplate {...props} variant="columns" />
}
