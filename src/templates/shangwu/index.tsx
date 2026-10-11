"use client"

import type { ReactElement } from 'react'
import type { TemplateProps } from '@/templates/_core'
import { CanvaAdaptedTemplate } from '@/templates/_canva/shared'

/** 独立改编自 Canva EAHUeh_csdU：尚务参考稿的结构与信息密度。 */
export default function ShangwuTemplate(props: TemplateProps): ReactElement {
  return <CanvaAdaptedTemplate {...props} variant="shangwu" />
}
