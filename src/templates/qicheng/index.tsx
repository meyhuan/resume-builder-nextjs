"use client"

import type { ReactElement } from 'react'
import type { TemplateProps } from '@/templates/_core'
import { CanvaAdaptedTemplate } from '@/templates/_canva/shared'

/** 独立改编自 Canva EAHRl7AD33Q：启程参考稿的结构与信息密度。 */
export default function QichengTemplate(props: TemplateProps): ReactElement {
  return <CanvaAdaptedTemplate {...props} variant="qicheng" />
}
