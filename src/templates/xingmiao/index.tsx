"use client"

import type { ReactElement } from 'react'
import type { TemplateProps } from '@/templates/_core'
import { CanvaAdaptedTemplate } from '@/templates/_canva/shared'

export default function XingmiaoTemplate(props: TemplateProps): ReactElement {
  return <CanvaAdaptedTemplate {...props} variant="xingmiao" />
}
