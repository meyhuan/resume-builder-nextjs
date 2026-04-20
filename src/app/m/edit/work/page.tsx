'use client'

import { type ReactElement } from 'react'
import { ExperienceListClient } from '../_components/experience-list-client'

export default function WorkListPage(): ReactElement {
  return (
    <ExperienceListClient
      title="工作经历"
      subtitle="按时间倒序排列最有力"
      sectionTitle="工作经历"
      baseRoute="/m/edit/work"
      emptyHint="还没有工作经历，点击添加一段"
    />
  )
}
