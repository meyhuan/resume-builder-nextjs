"use client"

import type { ReactElement } from 'react'
import type { TemplateProps } from '@/templates/_core'
import { CanvaAdaptedTemplate } from '@/templates/_canva/shared'

/** 独立改编自 Canva EAG_ZiobM60：蓝汇参考稿的结构与信息密度。 */
export default function LanhuiTemplate(props: TemplateProps): ReactElement {
  return <CanvaAdaptedTemplate {...props} variant="lanhui" />
}
