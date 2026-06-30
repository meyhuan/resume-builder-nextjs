"use client"

import type { ReactElement } from 'react'
import type { ResumeData } from '@/entities/resume/resume-data'
import { getHeaderJobIntentionText } from '@/entities/resume/header-job-intention'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import { EditableText, hexToRgba, lightenHex, mmToPx } from '@/templates/_core'
import type { EditableHeader, EditableJobIntention } from '@/templates/_core'
import type { VariantConfig } from '../types'
import {
  AvatarBox,
  HeaderFields,
  JobIntentionBlock,
  Metrics,
  metricItems,
} from '../components'
import {
  splitSections,
  educationTimelineRank,
  TemplateSection,
} from './shared-utils'

export function PortfolioLayout(props: {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
  readonly header: EditableHeader
  readonly jobIntention: EditableJobIntention
  readonly showJob: boolean
  readonly config: VariantConfig
}): ReactElement {
  const { resume, theme, header, jobIntention, showJob, config } = props
  const padV = Math.max(30, mmToPx(theme.pagePaddingVertical))
  const padH = Math.max(6, mmToPx(theme.pagePaddingHorizontal))
  const [portfolioSections, remainingSections] = splitSections(resume.sections, /作品|项目|案例|内容|账号|portfolio/i)
  const [profileSections, mainSections] = splitSections(remainingSections, /技能|证书|资格|自我|评价|优势/i)
  const metrics = config.metrics && config.metrics !== 'none' ? metricItems(config, header) : []
  return (
    <div className="original-page-content" data-template-padding-probe="true" style={{ minHeight: '297mm', padding: `${padV}px ${padH}px 44px`, background: `linear-gradient(135deg, ${hexToRgba(config.secondary, 0.1)}, transparent 300px), #fff` }}>
      <header
        className="group relative"
        onClick={header.openEditModal}
        style={{ display: 'grid', gridTemplateColumns: '1fr 152px', gap: 26, alignItems: 'stretch', cursor: 'pointer' }}
      >
        <div style={{ padding: '28px 30px', borderRadius: 8, background: `linear-gradient(135deg, ${config.accent}, ${config.secondary})`, color: '#fff' }}>
          <EditableText as="h1" value={header.name} onCommit={header.onCommitName} style={{ margin: 0, fontSize: '2.08em', lineHeight: 1.12, fontWeight: 700, color: '#fff' }} />
          {getHeaderJobIntentionText(resume) ? (
            <div style={{ marginTop: 8, color: '#f5f3ff', fontSize: '1em' }}>{getHeaderJobIntentionText(resume)}</div>
          ) : null}
          <HeaderFields header={header} color="#ede9fe" accent="#ffffff" light />
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          <AvatarBox header={header} accent={config.accent} radius={8} />
          <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#faf5ff', color: config.ink, fontSize: '0.78em', lineHeight: 1.55 }}>
            作品集 / 内容数据 / 品牌案例
          </div>
        </div>
      </header>

      {metrics.length > 0 ? <Metrics config={config} items={metrics} /> : null}
      {showJob && jobIntention.fields.length > 0 ? <JobIntentionBlock jobIntention={jobIntention} config={config} theme={theme} /> : null}

      {portfolioSections.length > 0 ? (
        <section style={{ marginTop: 24 }}>
          <div style={{ marginBottom: 12, fontSize: '0.82em', fontWeight: 700, letterSpacing: 0, color: config.accent }}>FEATURED WORK</div>
          <div className="grid grid-cols-2 gap-4">
            {portfolioSections.map((section, index) => (
              <div key={section.id} style={{ padding: 16, border: `1px solid ${lightenHex(config.accent, 0.72)}`, borderRadius: 8, backgroundColor: '#fff', boxShadow: '0 10px 24px rgba(88, 28, 135, 0.08)' }}>
                <TemplateSection section={section} theme={theme} config={{ ...config, sectionStyle: 'pill' }} index={index} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid" style={{ gridTemplateColumns: '210px 1fr', gap: 26, marginTop: 26 }}>
        <aside style={{ paddingTop: 4 }}>
          {profileSections.map((section) => <TemplateSection key={section.id} section={section} theme={theme} config={config} compact />)}
        </aside>
        <main className="flex flex-col" style={{ gap: 20 }}>
          {mainSections.map((section, index) => <TemplateSection key={section.id} section={section} theme={theme} config={config} index={index} />)}
        </main>
      </div>
    </div>
  )
}

export function EducationTimelineLayout(props: {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
  readonly header: EditableHeader
  readonly jobIntention: EditableJobIntention
  readonly showJob: boolean
  readonly config: VariantConfig
  readonly padH: number
}): ReactElement {
  const { resume, theme, header, jobIntention, showJob, config, padH } = props
  const padV = Math.max(30, mmToPx(theme.pagePaddingVertical))
  const [prioritySections, otherSections] = splitSections(resume.sections, /教育|校园|实习|项目|竞赛|获奖|经历/i)
  const timelineSections = prioritySections.length > 0
    ? [...prioritySections].sort((a, b) => educationTimelineRank(a) - educationTimelineRank(b))
    : resume.sections
  const fallbackIds = new Set(timelineSections.map((section) => section.id))
  const rest = prioritySections.length > 0 ? otherSections : resume.sections.filter((section) => !fallbackIds.has(section.id))
  return (
    <div className="original-page-content" data-template-padding-probe="true" style={{ minHeight: '297mm', padding: `${padV}px ${padH}px 44px`, background: `linear-gradient(180deg, ${lightenHex(config.accent, 0.88)}, #fff 210px)` }}>
      <header className="group relative" onClick={header.openEditModal} style={{ display: 'grid', gridTemplateColumns: '1fr 104px', gap: 22, alignItems: 'start', cursor: 'pointer' }}>
        <div>
          <div style={{ display: 'inline-flex', marginBottom: 10, padding: '4px 10px', borderRadius: 999, backgroundColor: '#fff', color: config.accent, fontSize: '0.78em', fontWeight: 700 }}>校招成长线</div>
          <EditableText as="h1" value={header.name} onCommit={header.onCommitName} style={{ margin: 0, fontSize: '2em', lineHeight: 1.14, fontWeight: 700, color: config.ink }} />
          {getHeaderJobIntentionText(resume) ? (
            <div style={{ marginTop: 8, color: config.muted, fontSize: '0.96em' }}>{getHeaderJobIntentionText(resume)}</div>
          ) : null}
          <HeaderFields header={header} color={config.muted} accent={config.accent} compact />
        </div>
        <AvatarBox header={header} accent={config.accent} radius={18} compact />
      </header>
      {showJob && jobIntention.fields.length > 0 ? <JobIntentionBlock jobIntention={jobIntention} config={config} theme={theme} /> : null}
      <div style={{ marginTop: 24, paddingLeft: 26, borderLeft: `3px solid ${lightenHex(config.accent, 0.55)}` }}>
        {timelineSections.map((section, index) => (
          <div key={section.id} style={{ position: 'relative', marginBottom: 20, padding: '14px 16px', borderRadius: 8, border: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
            <span aria-hidden style={{ position: 'absolute', left: -36, top: 18, display: 'grid', placeItems: 'center', width: 20, height: 20, borderRadius: 999, backgroundColor: config.accent, color: '#fff', fontSize: 10, fontWeight: 700 }}>{index + 1}</span>
            <TemplateSection section={section} theme={theme} config={{ ...config, sectionStyle: 'numbered' }} index={index} />
          </div>
        ))}
      </div>
      {rest.length > 0 ? (
        <main className="grid grid-cols-2 gap-4" style={{ marginTop: 8 }}>
          {rest.map((section, index) => <TemplateSection key={section.id} section={section} theme={theme} config={config} index={index} compact />)}
        </main>
      ) : null}
    </div>
  )
}

export function TechMinimalLayout(props: {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
  readonly header: EditableHeader
  readonly jobIntention: EditableJobIntention
  readonly showJob: boolean
  readonly config: VariantConfig
  readonly padV: number
  readonly padH: number
}): ReactElement {
  const { resume, theme, header, jobIntention, showJob, config, padV, padH } = props
  const [techSections, restAfterTech] = splitSections(resume.sections, /技能|技术|栈|证书|资格/i)
  const [projectSections, otherSections] = splitSections(restAfterTech, /项目|研发|工程|系统|平台|算法/i)
  const title = getHeaderJobIntentionText(resume)
  return (
    <div className="original-page-content" data-template-padding-probe="true" style={{ minHeight: '297mm', padding: `${padV}px ${padH}px`, backgroundColor: '#fff' }}>
      <header className="group relative" onClick={header.openEditModal} style={{ cursor: 'pointer', borderBottom: '3px solid #111827', paddingBottom: 16 }}>
        <div className="flex items-end justify-between gap-6">
          <div className="min-w-0">
            <EditableText as="h1" value={header.name} onCommit={header.onCommitName} style={{ margin: 0, fontSize: '2.02em', lineHeight: 1.12, fontWeight: 700, color: '#111827' }} />
            {title ? (
              <div style={{ marginTop: 6, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', color: config.muted, fontSize: '0.86em' }}>
                {title} / project-driven resume
              </div>
            ) : null}
          </div>
          <HeaderFields header={header} color={config.muted} accent={config.accent} compact />
        </div>
      </header>
      {techSections.length > 0 ? (
        <div style={{ marginTop: 18, padding: '12px 14px', border: '1px solid #111827', backgroundColor: '#f8fafc' }}>
          {techSections.map((section, index) => <TemplateSection key={section.id} section={section} theme={theme} config={{ ...config, sectionStyle: 'line' }} index={index} compact />)}
        </div>
      ) : null}
      {showJob && jobIntention.fields.length > 0 ? <JobIntentionBlock jobIntention={jobIntention} config={config} theme={theme} /> : null}
      <main className="grid" style={{ gridTemplateColumns: projectSections.length > 0 ? '1fr 220px' : '1fr', gap: 24, marginTop: 22 }}>
        <div className="flex flex-col" style={{ gap: 18 }}>
          {(projectSections.length > 0 ? projectSections : otherSections).map((section, index) => (
            <div key={section.id} style={{ borderTop: '1px solid #111827', paddingTop: 12 }}>
              <TemplateSection section={section} theme={theme} config={{ ...config, sectionStyle: 'minimal' }} index={index} />
            </div>
          ))}
        </div>
        {projectSections.length > 0 ? (
          <aside className="flex flex-col" style={{ gap: 14 }}>
            {otherSections.map((section, index) => <TemplateSection key={section.id} section={section} theme={theme} config={config} index={index} compact />)}
          </aside>
        ) : null}
      </main>
    </div>
  )
}

export function OfficialBriefLayout(props: {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
  readonly header: EditableHeader
  readonly jobIntention: EditableJobIntention
  readonly showJob: boolean
  readonly config: VariantConfig
  readonly padV: number
  readonly padH: number
}): ReactElement {
  const { resume, theme, header, jobIntention, showJob, config, padV, padH } = props
  const title = getHeaderJobIntentionText(resume)
  return (
    <div className="original-page-content" data-template-padding-probe="true" style={{ minHeight: '297mm', padding: `${padV}px ${padH}px`, backgroundColor: '#fff', color: config.ink }}>
      <div style={{ border: `2px solid ${config.accent}`, padding: '24px 28px 30px' }}>
        <header className="group relative" onClick={header.openEditModal} style={{ cursor: 'pointer', textAlign: 'center', borderBottom: `4px double ${config.accent}`, paddingBottom: 18 }}>
          <div style={{ marginBottom: 8, color: config.accent, fontSize: '0.82em', fontWeight: 700 }}>个人履历简表</div>
          <EditableText as="h1" value={header.name} onCommit={header.onCommitName} style={{ margin: 0, fontSize: '2.04em', lineHeight: 1.18, fontWeight: 700, color: config.ink }} />
          {title ? <div style={{ marginTop: 8, color: config.muted, fontSize: '0.95em' }}>{title}</div> : null}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <HeaderFields header={header} color={config.muted} accent={config.accent} compact />
          </div>
        </header>
        {showJob && jobIntention.fields.length > 0 ? (
          <div style={{ marginTop: 18, padding: '10px 14px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1' }}>
            <JobIntentionBlock jobIntention={jobIntention} config={config} theme={theme} topMargin={0} />
          </div>
        ) : null}
        <main className="grid" style={{ gridTemplateColumns: '32px 1fr', columnGap: 14, rowGap: 16, marginTop: 22 }}>
          {resume.sections.map((section, index) => (
            <div key={section.id} style={{ display: 'contents' }}>
              <div style={{ display: 'grid', placeItems: 'start center', paddingTop: 2, color: config.accent, fontSize: '0.76em', fontWeight: 700 }}>
                {String(index + 1).padStart(2, '0')}
              </div>
              <div style={{ paddingBottom: 14, borderBottom: '1px solid #cbd5e1' }}>
                <TemplateSection section={section} theme={theme} config={config} index={index} />
              </div>
            </div>
          ))}
        </main>
      </div>
    </div>
  )
}
