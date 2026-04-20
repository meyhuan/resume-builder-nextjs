'use client'

import { type ReactElement } from 'react'
import { ExperienceListClient } from '../_components/experience-list-client'

export default function ProjectListPage(): ReactElement {
  return (
    <ExperienceListClient
      title="项目经验"
      subtitle="突出亮点项目优先"
      sectionTitle="项目经验"
      baseRoute="/m/edit/project"
      emptyHint="还没有项目经验，点击添加一个"
    />
  )
}
