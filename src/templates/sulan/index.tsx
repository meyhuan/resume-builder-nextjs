"use client"

import type { ReactElement } from 'react'
import type { TemplateProps } from '@/templates/_core'
import { CanvaAdaptedTemplate } from '@/templates/_canva/shared'

/** 独立改编自 Canva EAFB30uW_Pg：素蓝参考稿的结构与信息密度。 */
export default function SulanTemplate(props: TemplateProps): ReactElement {
  return <CanvaAdaptedTemplate {...props} variant="sulan" />
}
