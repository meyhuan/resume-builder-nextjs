'use client'

import type { ReactElement } from 'react'
import PortfolioManager from '@/components/portfolio/portfolio-manager'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import { ModuleEditShell } from '../_components/module-edit-shell'

export default function PortfolioEditPage(): ReactElement {
  const resumeId = useDraftStore((state) => state.resumeId)
  const portfolio = useDraftStore((state) => state.draft?.portfolio)
  const updateDraft = useDraftStore((state) => state.updateDraft)

  return (
    <ModuleEditShell title="图片作品集" subtitle="图片会作为简历附页一起导出 PDF">
      <PortfolioManager
        compact
        resumeId={resumeId}
        portfolio={portfolio}
        onChange={(next): void => {
          updateDraft('portfolio', (draft) => {
            draft.portfolio = next
          })
        }}
      />
    </ModuleEditShell>
  )
}
