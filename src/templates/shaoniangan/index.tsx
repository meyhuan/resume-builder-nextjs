"use client"

import type { ReactElement } from 'react'
import type { TemplateProps } from '@/templates/_core'
import { CanvaAdaptedTemplate } from '@/templates/_canva/shared'

export default function ShaonianganTemplate(props: TemplateProps): ReactElement {
  return <CanvaAdaptedTemplate {...props} variant="shaoniangan" />
}
