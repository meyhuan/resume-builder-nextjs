'use client'

import { type ReactElement } from 'react'
import { ExperienceListClient } from '../_components/experience-list-client'

export default function SchoolListPage(): ReactElement {
  return (
    <ExperienceListClient
      title="在校经历"
      subtitle="校园活动、社团、竞赛等"
      sectionTitle="在校经历"
      baseRoute="/m/edit/school"
      emptyHint="还没有在校经历，点击添加一段"
    />
  )
}
