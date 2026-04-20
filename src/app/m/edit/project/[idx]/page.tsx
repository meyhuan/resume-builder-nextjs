'use client'

import { use, type ReactElement } from 'react'
import { ExperienceDetailClient } from '../../_components/experience-detail-client'

interface PageParams {
  readonly params: Promise<{ idx: string }>
}

export default function ProjectDetailPage({ params }: PageParams): ReactElement {
  const { idx } = use(params)
  const parsed: number = parseInt(idx, 10)
  return (
    <ExperienceDetailClient
      kind="project"
      title="项目经验"
      sectionTitle="项目经验"
      idx={Number.isNaN(parsed) ? -1 : parsed}
      backRoute="/m/edit/project"
    />
  )
}
