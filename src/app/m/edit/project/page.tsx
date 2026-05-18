'use client'

import { type ReactElement } from 'react'
import { ExperienceListClient } from '../_components/experience-list-client'
import { MODULE_SECTION_TITLES } from '@/entities/module/module-config'

export default function ProjectListPage(): ReactElement {
  return (
    <ExperienceListClient
      title="项目经历"
      subtitle="突出亮点项目优先"
      sectionTitle={MODULE_SECTION_TITLES.programExp}
      baseRoute="/m/edit/project"
      emptyHint="还没有项目经历，点击添加一个"
    />
  )
}
