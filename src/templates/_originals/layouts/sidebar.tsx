"use client"

import type { ReactElement } from 'react'
import type { ResumeData } from '@/entities/resume/resume-data'
import { getHeaderJobIntentionText } from '@/entities/resume/header-job-intention'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import { EditableText, lightenHex, mmToPx } from '@/templates/_core'
import type { EditableHeader, EditableJobIntention } from '@/templates/_core'
import type { VariantConfig } from '../types'
import {
  HeaderFields,
  SidebarJob,
} from '../components'
import {
  splitSections,
  TemplateSection,
} from './shared-utils'

export function StackProjectsLayout(props: {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
  readonly header: EditableHeader
  readonly jobIntention: EditableJobIntention
  readonly showJob: boolean
  readonly config: VariantConfig
}): ReactElement {
  const { resume, theme, header, jobIntention, showJob, config } = props
  const padV = Math.max(28, mmToPx(theme.pagePaddingVertical))
  const padH = Math.max(6, mmToPx(theme.pagePaddingHorizontal))
  const [stackSections, restAfterStack] = splitSections(resume.sections, /技能|技术|栈|工具|证书/i)
  const [projectSections, otherSections] = splitSections(restAfterStack, /项目|系统|平台|研发|工程|算法/i)
  return (
    <div className="grid original-page-content" data-template-padding-probe="true" style={{ gridTemplateColumns: '248px 1fr', minHeight: '297mm', padding: `${padV}px ${padH}px`, backgroundColor: '#fff' }}>
      <aside style={{ padding: '34px 24px', backgroundColor: '#052e2b', color: '#ecfdf5' }}>
        <EditableText as="h1" value={header.name} onCommit={header.onCommitName} style={{ margin: 0, fontSize: '1.72em', lineHeight: 1.15, fontWeight: 700, color: '#fff' }} />
        {getHeaderJobIntentionText(resume) ? (
          <div style={{ marginTop: 8, color: '#a7f3d0', fontSize: '0.88em' }}>{getHeaderJobIntentionText(resume)}</div>
        ) : null}
        <HeaderFields header={header} color="#d1fae5" accent={config.accent} vertical light compact />
        {showJob && jobIntention.fields.length > 0 ? <SidebarJob jobIntention={jobIntention} accent="#86efac" /> : null}
        <div style={{ marginTop: 22 }}>
          {stackSections.map((section, index) => <TemplateSection key={section.id} section={section} theme={theme} config={config} index={index} compact dark />)}
        </div>
      </aside>
      <main style={{ padding: '34px 34px 38px' }}>
        <div style={{ marginBottom: 18, padding: '12px 14px', borderRadius: 8, backgroundColor: '#ecfdf5', color: '#065f46', fontSize: '0.82em', fontWeight: 700 }}>PROJECT DELIVERY BOARD</div>
        <div className="grid gap-4" style={{ gridTemplateColumns: projectSections.length > 1 ? 'repeat(2, minmax(0, 1fr))' : '1fr' }}>
          {projectSections.map((section, index) => (
            <div key={section.id} style={{ minHeight: 150, padding: 14, borderRadius: 8, border: `1px solid ${lightenHex(config.accent, 0.62)}`, backgroundColor: '#fff' }}>
              <TemplateSection section={section} theme={theme} config={{ ...config, sectionStyle: 'pill' }} index={index} compact />
            </div>
          ))}
        </div>
        <div className="flex flex-col" style={{ gap: 18, marginTop: 20 }}>
          {(projectSections.length > 0 ? otherSections : restAfterStack).map((section, index) => <TemplateSection key={section.id} section={section} theme={theme} config={config} index={index} />)}
        </div>
      </main>
    </div>
  )
}

