'use client'

import { use, type ReactElement } from 'react'
import { ExperienceDetailClient } from '../../_components/experience-detail-client'

interface PageParams {
  readonly params: Promise<{ idx: string }>
}

export default function SchoolDetailPage({ params }: PageParams): ReactElement {
  const { idx } = use(params)
  const parsed: number = parseInt(idx, 10)
  return (
    <ExperienceDetailClient
      kind="campus"
      title="在校经历"
      sectionTitle="在校经历"
      idx={Number.isNaN(parsed) ? -1 : parsed}
      backRoute="/m/edit/school"
    />
  )
}
