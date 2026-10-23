import type { ReactElement } from 'react'
import MobileAiToolsClient, { type InitialAiToolsResume } from '@/app/m/edit/tools/tools-client'
import { createDefaultResume } from '@/lib/default-resume'

export default function MobileToolsPreviewPage(): ReactElement {
  const content = createDefaultResume()
  const initial: InitialAiToolsResume = {
    id: 'preview-resume', title: '我的简历', template: 'simple',
    content: { ...content, id: 'preview-resume', name: '花龙辉', jobIntention: { ...content.jobIntention, position: '科技与数智化工程师', city: '南京' } },
  }
  return <MobileAiToolsClient initial={initial} initialTool="assistant" returnTo="/m/edit?id=preview-resume" />
}
