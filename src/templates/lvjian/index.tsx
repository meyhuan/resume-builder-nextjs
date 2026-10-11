"use client"

import type { ReactElement } from 'react'
import type { TemplateProps } from '@/templates/_core'
import { CanvaAdaptedTemplate } from '@/templates/_canva/shared'

/** 独立改编自 Canva EAGkCXXPwKI：绿简参考稿的结构与信息密度。 */
export default function LvjianTemplate(props: TemplateProps): ReactElement {
  return <CanvaAdaptedTemplate {...props} variant="lvjian" />
}
