'use client'

import { use, type ReactElement } from 'react'
import { ExperienceDetailClient } from '../../_components/experience-detail-client'

interface PageParams {
  readonly params: Promise<{ idx: string }>
}

export default function EduDetailPage({ params }: PageParams): ReactElement {
  const { idx } = use(params)
  const parsed: number = parseInt(idx, 10)
  return (
    <ExperienceDetailClient
      kind="education"
      title="教育经历"
      sectionTitle="教育经历"
      idx={Number.isNaN(parsed) ? -1 : parsed}
      backRoute="/m/edit/edu"
    />
  )
}
