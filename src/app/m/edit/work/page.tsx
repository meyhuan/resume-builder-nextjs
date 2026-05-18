'use client'

import { type ReactElement } from 'react'
import { ExperienceListClient } from '../_components/experience-list-client'
import { MODULE_SECTION_TITLES } from '@/entities/module/module-config'

export default function WorkListPage(): ReactElement {
  return (
    <ExperienceListClient
      title="工作经历"
      subtitle="按时间倒序排列最有力"
      sectionTitle={MODULE_SECTION_TITLES.workExp}
      baseRoute="/m/edit/work"
      emptyHint="还没有工作经历，点击添加一段"
    />
  )
}
