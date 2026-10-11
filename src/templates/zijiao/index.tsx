"use client"

import type { ReactElement } from 'react'
import type { TemplateProps } from '@/templates/_core'
import { CanvaAdaptedTemplate } from '@/templates/_canva/shared'

/** 独立改编自 Canva EAHCCghYRRY：紫教参考稿的结构与信息密度。 */
export default function ZijiaoTemplate(props: TemplateProps): ReactElement {
  return <CanvaAdaptedTemplate {...props} variant="zijiao" />
}
