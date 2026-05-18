'use client'

import { type ReactElement } from 'react'
import { ExperienceListClient } from '../_components/experience-list-client'
import { MODULE_SECTION_TITLES } from '@/entities/module/module-config'

export default function InternListPage(): ReactElement {
  return (
    <ExperienceListClient
      title="实习经历"
      subtitle="校招、应届生请认真填写"
      sectionTitle={MODULE_SECTION_TITLES.internExp}
      baseRoute="/m/edit/intern"
      emptyHint="还没有实习经历，点击添加一段"
    />
  )
}
