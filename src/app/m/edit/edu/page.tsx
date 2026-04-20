'use client'

import { type ReactElement } from 'react'
import { ExperienceListClient } from '../_components/experience-list-client'

export default function EduListPage(): ReactElement {
  return (
    <ExperienceListClient
      title="教育经历"
      subtitle="建议只写大学及以上"
      sectionTitle="教育经历"
      baseRoute="/m/edit/edu"
      emptyHint="还没有教育经历，点击添加一段"
    />
  )
}
