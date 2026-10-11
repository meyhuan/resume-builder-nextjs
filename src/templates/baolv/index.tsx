"use client"

import type { ReactElement } from 'react'
import type { TemplateProps } from '@/templates/_core'
import { CanvaAdaptedTemplate } from '@/templates/_canva/shared'

/** 独立改编自 Canva EAHOPCbHD-w：白绿参考稿的结构与信息密度。 */
export default function BaolvTemplate(props: TemplateProps): ReactElement {
  return <CanvaAdaptedTemplate {...props} variant="baolv" />
}
