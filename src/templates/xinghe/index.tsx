"use client"

import type { ReactElement } from 'react'
import type { TemplateProps } from '@/templates/_core'
import { OriginalTemplate } from '@/templates/_originals/shared'

export default function XingheTemplate(props: TemplateProps): ReactElement {
  return <OriginalTemplate {...props} variant="xinghe" />
}
