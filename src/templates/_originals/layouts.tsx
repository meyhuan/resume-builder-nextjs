"use client"

import { useState } from 'react'
import type { ReactElement } from 'react'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { Section } from '@/entities/resume/section'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import { useAppStore } from '@/state/store'
import { EditableText, SortableSection, hexToRgba, lightenHex, mmToPx } from '@/templates/_core'
import type { DragHandleProps, EditableHeader, EditableJobIntention } from '@/templates/_core'
import type { VariantConfig } from './types'
import { SERIF } from './types'
import {
  AvatarBox,
  CampusHighlightsDialog,
  ConceptSection,
  FormalInfoGrid,
  HeaderFields,
  JobIntentionBlock,
  Metrics,
  MetricsDialog,
  SectionStack,
  SidebarJob,
  SidebarSections,
  buildBaseInfoWithHighlights,
  buildBaseInfoWithMetrics,
  campusMetricItems,
  metricItems,
} from './components'

function isSection(section: Section, pattern: RegExp): boolean {
  return pattern.test(section.title)
}

function splitSections(sections: readonly Section[], pattern: RegExp): [Section[], Section[]] {
  const picked = sections.filter((section) => isSection(section, pattern))
  const pickedIds = new Set(picked.map((section) => section.id))
  return [picked, sections.filter((section) => !pickedIds.has(section.id))]
}

function educationTimelineRank(section: Section): number {
  if (/教育|学校|学历|课程/i.test(section.title)) return 0
  if (/校园|社团|学生|竞赛|获奖/i.test(section.title)) return 1
  if (/实习|项目|经历/i.test(section.title)) return 2
  return 3
}

function TemplateSection(props: {
  readonly section: Section
  readonly theme: ThemeTokens
  readonly config: VariantConfig
  readonly index?: number
  readonly compact?: boolean
  readonly dark?: boolean
}): ReactElement {
  return (
    <SortableSection sectionId={props.section.id}>
      {(dragProps: DragHandleProps) => (
        <ConceptSection
          section={props.section}
          dragProps={dragProps}
          theme={props.theme}
          config={props.config}
          index={props.index}
          compact={props.compact}
          dark={props.dark}
        />
      )}
    </SortableSection>
  )
}

export function SingleColumn(props: {
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
  const updateBaseInfo = useAppStore((state) => state.updateBaseInfo)
  const [showMetricEditor, setShowMetricEditor] = useState(false)
  const title = header.baseInfo?.title || resume.jobIntention?.position || ''
  const summary = resume.sections.find((s) => /自我|评价|优势|summary/i.test(s.title))
  const showAvatar = config.density !== 'ultra' || header.baseInfo?.showAvatar !== false
  const metrics = config.metrics && config.metrics !== 'none' ? metricItems(config, header) : []

  return (
    <div
      className="original-page-content"
      data-template-padding-probe="true"
      style={{
        padding: `${padV}px ${padH}px`,
        background: config.id === 'xinghe'
          ? `linear-gradient(135deg, ${hexToRgba(config.accent, 0.11)}, ${hexToRgba(config.secondary, 0.06)} 28%, transparent 46%), #fff`
          : config.heroTone === 'soft'
            ? `linear-gradient(135deg, ${hexToRgba(config.accent, 0.08)}, transparent 36%), #f8fafc`
            : config.heroTone === 'blueprint'
              ? `linear-gradient(180deg, ${hexToRgba(config.accent, 0.08)}, transparent 190px), #fff`
              : config.heroTone === 'gradient'
                ? `linear-gradient(135deg, ${hexToRgba(config.accent, 0.12)}, ${hexToRgba(config.secondary, 0.08)} 42%, transparent 64%), #fff`
                : config.id === 'yuanshan' ? '#fbfaf8' : '#fff',
      }}
    >
      <div aria-hidden style={{ height: config.formal ? 4 : 3, marginBottom: config.density === 'ultra' ? 10 : 16, backgroundColor: config.accent }} />
      <header
        className="group relative"
        onClick={header.openEditModal}
        style={{
          display: showAvatar ? 'grid' : 'block',
          gridTemplateColumns: config.density === 'ultra' ? '1fr 82px' : config.formal ? '1fr 104px' : '1fr 112px',
          gap: 28,
          alignItems: 'start',
          paddingBottom: config.density === 'ultra' ? 14 : config.formal ? 22 : 28,
          borderBottom: config.id === 'yuanshan' ? `3px double ${config.accent}` : config.formal ? `2px solid ${config.accent}` : `1px solid ${lightenHex(config.accent, 0.68)}`,
          cursor: 'pointer',
        }}
      >
        <div className="min-w-0">
          <EditableText
            as="h1"
            value={header.name}
            onCommit={header.onCommitName}
            style={{
              margin: 0,
              fontSize: config.density === 'ultra' ? '1.72em' : config.id === 'yuanshan' ? '2.2em' : config.density === 'compact' ? '1.9em' : '2.08em',
              lineHeight: 1.15,
              fontWeight: 800,
              color: config.ink,
              fontFamily: config.serif ? SERIF : undefined,
            }}
          />
          {title ? <div style={{ marginTop: 8, fontSize: '0.98em', fontWeight: config.id === 'yuanshan' ? 700 : 500, color: config.id === 'yuanshan' ? config.accent : config.muted }}>{title}</div> : null}
          <HeaderFields header={header} color={config.muted} accent={config.accent} formal={config.formal} compact={config.density === 'compact' || config.density === 'ultra'} />
          {config.formal ? <FormalInfoGrid header={header} /> : null}
          {config.id === 'yuanshan' && summary ? <p style={{ marginTop: 18, color: '#374151', fontSize: '1.03em', lineHeight: Math.max(1.45, theme.lineHeight) }}>长期负责业务增长、渠道运营、商业化和团队管理，擅长建立可复制的目标体系、组织机制和增长模型。</p> : null}
        </div>
        {showAvatar ? (
          <AvatarBox header={header} accent={config.accent} radius={config.formal ? 4 : 16} compact={config.density === 'compact' || config.density === 'ultra'} />
        ) : null}
      </header>

      {showJob && jobIntention.fields.length > 0 ? <JobIntentionBlock jobIntention={jobIntention} config={config} /> : null}
      {metrics.length > 0 ? (
        <section style={{ marginTop: 20 }}>
          <h2
            style={{
              margin: '0 0 10px',
              paddingBottom: 6,
              borderBottom: `1px solid ${config.accent}`,
              color: config.accent,
              fontFamily: config.serif ? SERIF : undefined,
              fontSize: '1.12em',
              fontWeight: 800,
              lineHeight: 1.35,
            }}
          >
            核心业绩
          </h2>
          <Metrics config={config} items={metrics} onEdit={() => setShowMetricEditor(true)} />
        </section>
      ) : null}
      <SectionStack sections={resume.sections} theme={theme} config={config} />
      {showMetricEditor ? (
        <MetricsDialog
          config={config}
          values={metrics}
          onClose={() => setShowMetricEditor(false)}
          onSave={(items) => {
            updateBaseInfo(buildBaseInfoWithMetrics(header.baseInfo, items), header.name)
            setShowMetricEditor(false)
          }}
        />
      ) : null}
    </div>
  )
}

export function CampusLayout(props: {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
  readonly header: EditableHeader
  readonly jobIntention: EditableJobIntention
  readonly showJob: boolean
  readonly config: VariantConfig
  readonly padH: number
}): ReactElement {
  const { resume, theme, header, jobIntention, showJob, config, padH } = props
  const updateBaseInfo = useAppStore((state) => state.updateBaseInfo)
  const [showHighlightEditor, setShowHighlightEditor] = useState(false)
  const padV = Math.max(30, mmToPx(theme.pagePaddingVertical))
  const title = header.baseInfo?.title || resume.jobIntention?.position || '求职意向'
  const highlightItems = campusMetricItems(config, header)

  return (
    <div className="original-page-content" data-template-padding-probe="true" style={{ padding: `${padV}px ${padH}px 46px`, backgroundColor: '#ffffff' }}>
      <header
        className="group relative"
        onClick={header.openEditModal}
        style={{
          margin: `-${padV}px -${padH}px 34px`,
          padding: `44px ${padH}px 28px`,
          background: config.heroTone === 'soft'
            ? `linear-gradient(135deg, ${lightenHex(config.accent, 0.82)}, #ffffff)`
            : `linear-gradient(135deg, ${config.accent}, ${config.secondary})`,
          color: config.heroTone === 'soft' ? config.ink : '#fff',
          cursor: 'pointer',
        }}
      >
        <div className="flex items-start justify-between gap-8">
          <div className="min-w-0 flex-1">
            <EditableText as="h1" value={header.name} onCommit={header.onCommitName} style={{ margin: 0, fontSize: '2.05em', lineHeight: 1.15, fontWeight: 800, color: config.heroTone === 'soft' ? config.ink : '#fff' }} />
            <div style={{ marginTop: 8, color: config.heroTone === 'soft' ? config.muted : '#e0f2fe', fontSize: '0.98em' }}>{title}</div>
            <HeaderFields header={header} color={config.heroTone === 'soft' ? config.muted : '#e0f2fe'} accent={config.heroTone === 'soft' ? config.accent : '#ffffff'} light={config.heroTone !== 'soft'} />
          </div>
          <AvatarBox header={header} accent={config.heroTone === 'soft' ? config.accent : '#ffffff'} radius={16} />
        </div>
        <div className="grid grid-cols-3 gap-3" style={{ marginTop: 20 }}>
          {highlightItems.map(([value, text], index) => (
            <button
              key={`${index}-${text}`}
              type="button"
              className="group/highlight text-left transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/70 print:cursor-default"
              style={{
                padding: 12,
                borderRadius: 8,
                backgroundColor: config.heroTone === 'soft' ? '#ffffff' : 'rgba(255,255,255,0.12)',
                border: config.heroTone === 'soft' ? `1px solid ${lightenHex(config.accent, 0.65)}` : '1px solid transparent',
                boxShadow: config.heroTone === 'soft' ? '0 8px 20px rgba(15, 23, 42, 0.06)' : undefined,
                fontSize: '0.86em',
                lineHeight: 1.55,
                color: 'inherit',
                cursor: 'pointer',
              }}
              title="编辑页眉亮点"
              onClick={(event) => {
                event.stopPropagation()
                setShowHighlightEditor(true)
              }}
            >
              <strong>{value}</strong><br />{text}
            </button>
          ))}
        </div>
      </header>
      {showJob && jobIntention.fields.length > 0 ? <JobIntentionBlock jobIntention={jobIntention} config={config} /> : null}
      <SectionStack sections={resume.sections} theme={theme} config={config} />
      {showHighlightEditor ? (
        <CampusHighlightsDialog
          config={config}
          values={highlightItems}
          onClose={() => setShowHighlightEditor(false)}
          onSave={(items) => {
            updateBaseInfo(buildBaseInfoWithHighlights(header.baseInfo, items), header.name)
            setShowHighlightEditor(false)
          }}
        />
      ) : null}
    </div>
  )
}

export function TwoColumnDark(props: {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
  readonly header: EditableHeader
  readonly jobIntention: EditableJobIntention
  readonly showJob: boolean
  readonly config: VariantConfig
}): ReactElement {
  const { resume, theme, header, jobIntention, showJob, config } = props
  const padV = Math.max(30, mmToPx(theme.pagePaddingVertical))
  const padH = Math.max(28, mmToPx(theme.pagePaddingHorizontal))
  const sidebarSections = resume.sections.filter((s) => /技能|证书|资格|自我|评价|优势/i.test(s.title))
  const sidebarIds = new Set(sidebarSections.map((s) => s.id))
  const mainSections = resume.sections.filter((s) => !sidebarIds.has(s.id))
  const showAvatar = header.baseInfo?.showAvatar !== false
  return (
    <div className="grid original-page-content" data-template-padding-probe="true" style={{ gridTemplateColumns: '238px 1fr', minHeight: '297mm', padding: `${padV}px ${padH}px`, backgroundColor: '#fff' }}>
      <aside style={{ padding: '40px 26px', backgroundColor: '#111827', color: '#f8fafc' }}>
        <div className="group relative" onClick={header.openEditModal} style={{ cursor: 'pointer' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: showAvatar ? 'center' : 'flex-start',
              paddingBottom: 20,
              marginBottom: 18,
              borderBottom: '1px solid rgba(148, 163, 184, 0.24)',
            }}
          >
            {showAvatar ? (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                <AvatarBox header={header} accent={config.accent} radius={18} compact />
              </div>
            ) : null}
            <EditableText
              as="h1"
              value={header.name}
              style={{ width: '100%', margin: 0, fontSize: '1.8em', lineHeight: 1.15, fontWeight: 800, color: '#fff', textAlign: showAvatar ? 'center' : 'left' }}
            />
            <div style={{ width: '100%', marginTop: 8, color: '#cbd5e1', fontSize: '0.92em', textAlign: showAvatar ? 'center' : 'left' }}>
              {header.baseInfo?.title || props.resume.jobIntention?.position || ''}
            </div>
          </div>
          <HeaderFields header={header} color="#cbd5e1" accent={config.accent} vertical light />
        </div>
        {showJob && jobIntention.fields.length > 0 ? <SidebarJob jobIntention={jobIntention} accent={config.accent} /> : null}
        <SidebarSections sections={sidebarSections} theme={theme} config={config} dark />
      </aside>
      <main style={{ padding: '40px 40px' }}>
        <SectionStack sections={mainSections} theme={theme} config={config} topMargin={0} />
      </main>
    </div>
  )
}

export function TwoColumnSoft(props: {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
  readonly header: EditableHeader
  readonly jobIntention: EditableJobIntention
  readonly showJob: boolean
  readonly config: VariantConfig
}): ReactElement {
  const { resume, theme, header, jobIntention, showJob, config } = props
  const padV = Math.max(30, mmToPx(theme.pagePaddingVertical))
  const padH = Math.max(28, mmToPx(theme.pagePaddingHorizontal))
  const sidebarSections = resume.sections.filter((s) => /技能|证书|资格|作品|自我|评价|优势/i.test(s.title))
  const sidebarIds = new Set(sidebarSections.map((s) => s.id))
  const mainSections = resume.sections.filter((s) => !sidebarIds.has(s.id))
  return (
    <div className="grid original-page-content" data-template-padding-probe="true" style={{ gridTemplateColumns: '286px 1fr', minHeight: '297mm', padding: `${padV}px ${padH}px`, backgroundColor: '#fff' }}>
      <aside style={{ padding: '42px 28px', background: `linear-gradient(160deg, ${hexToRgba(config.secondary, 0.12)}, ${hexToRgba(config.accent, 0.08)}), #f8fafc` }}>
        <EditableText as="h1" value={header.name} onCommit={header.onCommitName} style={{ margin: 0, fontSize: '2em', lineHeight: 1.15, fontWeight: 800, color: config.ink }} />
        <div style={{ marginTop: 8, color: config.muted, fontSize: '0.94em' }}>{header.baseInfo?.title || props.resume.jobIntention?.position || ''}</div>
        <HeaderFields header={header} color={config.muted} accent={config.accent} vertical />
        {showJob && jobIntention.fields.length > 0 ? <SidebarJob jobIntention={jobIntention} accent={config.accent} /> : null}
        <SidebarSections sections={sidebarSections} theme={theme} config={config} />
      </aside>
      <main style={{ padding: '42px 40px' }}>
        <SectionStack sections={mainSections} theme={theme} config={config} />
      </main>
    </div>
  )
}

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
  const padH = Math.max(30, mmToPx(theme.pagePaddingHorizontal))
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
          <EditableText as="h1" value={header.name} onCommit={header.onCommitName} style={{ margin: 0, fontSize: '2.08em', lineHeight: 1.12, fontWeight: 850, color: '#fff' }} />
          <div style={{ marginTop: 8, color: '#f5f3ff', fontSize: '1em' }}>{header.baseInfo?.title || resume.jobIntention?.position || '创意作品集简历'}</div>
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
      {showJob && jobIntention.fields.length > 0 ? <JobIntentionBlock jobIntention={jobIntention} config={config} /> : null}

      {portfolioSections.length > 0 ? (
        <section style={{ marginTop: 24 }}>
          <div style={{ marginBottom: 12, fontSize: '0.82em', fontWeight: 800, letterSpacing: 0, color: config.accent }}>FEATURED WORK</div>
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
          <div style={{ display: 'inline-flex', marginBottom: 10, padding: '4px 10px', borderRadius: 999, backgroundColor: '#fff', color: config.accent, fontSize: '0.78em', fontWeight: 800 }}>校招成长线</div>
          <EditableText as="h1" value={header.name} onCommit={header.onCommitName} style={{ margin: 0, fontSize: '2em', lineHeight: 1.14, fontWeight: 850, color: config.ink }} />
          <div style={{ marginTop: 8, color: config.muted, fontSize: '0.96em' }}>{header.baseInfo?.title || resume.jobIntention?.position || '应届生 / 实习投递'}</div>
          <HeaderFields header={header} color={config.muted} accent={config.accent} compact />
        </div>
        <AvatarBox header={header} accent={config.accent} radius={18} compact />
      </header>
      {showJob && jobIntention.fields.length > 0 ? <JobIntentionBlock jobIntention={jobIntention} config={config} /> : null}
      <div style={{ marginTop: 24, paddingLeft: 26, borderLeft: `3px solid ${lightenHex(config.accent, 0.55)}` }}>
        {timelineSections.map((section, index) => (
          <div key={section.id} style={{ position: 'relative', marginBottom: 20, padding: '14px 16px', borderRadius: 8, border: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
            <span aria-hidden style={{ position: 'absolute', left: -36, top: 18, display: 'grid', placeItems: 'center', width: 20, height: 20, borderRadius: 999, backgroundColor: config.accent, color: '#fff', fontSize: 10, fontWeight: 800 }}>{index + 1}</span>
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
  return (
    <div className="original-page-content" data-template-padding-probe="true" style={{ minHeight: '297mm', padding: `${padV}px ${padH}px`, backgroundColor: '#fff' }}>
      <header className="group relative" onClick={header.openEditModal} style={{ cursor: 'pointer', borderBottom: '3px solid #111827', paddingBottom: 16 }}>
        <div className="flex items-end justify-between gap-6">
          <div className="min-w-0">
            <EditableText as="h1" value={header.name} onCommit={header.onCommitName} style={{ margin: 0, fontSize: '2.02em', lineHeight: 1.12, fontWeight: 900, color: '#111827' }} />
            <div style={{ marginTop: 6, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', color: config.muted, fontSize: '0.86em' }}>
              {header.baseInfo?.title || resume.jobIntention?.position || 'Software Engineer'} / project-driven resume
            </div>
          </div>
          <HeaderFields header={header} color={config.muted} accent={config.accent} compact />
        </div>
      </header>
      {techSections.length > 0 ? (
        <div style={{ marginTop: 18, padding: '12px 14px', border: '1px solid #111827', backgroundColor: '#f8fafc' }}>
          {techSections.map((section, index) => <TemplateSection key={section.id} section={section} theme={theme} config={{ ...config, sectionStyle: 'line' }} index={index} compact />)}
        </div>
      ) : null}
      {showJob && jobIntention.fields.length > 0 ? <JobIntentionBlock jobIntention={jobIntention} config={config} /> : null}
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
  const padH = Math.max(28, mmToPx(theme.pagePaddingHorizontal))
  const [stackSections, restAfterStack] = splitSections(resume.sections, /技能|技术|栈|工具|证书/i)
  const [projectSections, otherSections] = splitSections(restAfterStack, /项目|系统|平台|研发|工程|算法/i)
  return (
    <div className="grid original-page-content" data-template-padding-probe="true" style={{ gridTemplateColumns: '248px 1fr', minHeight: '297mm', padding: `${padV}px ${padH}px`, backgroundColor: '#fff' }}>
      <aside style={{ padding: '34px 24px', backgroundColor: '#052e2b', color: '#ecfdf5' }}>
        <EditableText as="h1" value={header.name} onCommit={header.onCommitName} style={{ margin: 0, fontSize: '1.72em', lineHeight: 1.15, fontWeight: 850, color: '#fff' }} />
        <div style={{ marginTop: 8, color: '#a7f3d0', fontSize: '0.88em' }}>{header.baseInfo?.title || resume.jobIntention?.position || '技术栈 / 项目交付'}</div>
        <HeaderFields header={header} color="#d1fae5" accent={config.accent} vertical light compact />
        {showJob && jobIntention.fields.length > 0 ? <SidebarJob jobIntention={jobIntention} accent="#86efac" /> : null}
        <div style={{ marginTop: 22 }}>
          {stackSections.map((section, index) => <TemplateSection key={section.id} section={section} theme={theme} config={config} index={index} compact dark />)}
        </div>
      </aside>
      <main style={{ padding: '34px 34px 38px' }}>
        <div style={{ marginBottom: 18, padding: '12px 14px', borderRadius: 8, backgroundColor: '#ecfdf5', color: '#065f46', fontSize: '0.82em', fontWeight: 800 }}>PROJECT DELIVERY BOARD</div>
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
  const title = header.baseInfo?.title || resume.jobIntention?.position || '求职简历'
  return (
    <div className="original-page-content" data-template-padding-probe="true" style={{ minHeight: '297mm', padding: `${padV}px ${padH}px`, backgroundColor: '#fff', color: config.ink }}>
      <div style={{ border: `2px solid ${config.accent}`, padding: '24px 28px 30px' }}>
        <header className="group relative" onClick={header.openEditModal} style={{ cursor: 'pointer', textAlign: 'center', borderBottom: `4px double ${config.accent}`, paddingBottom: 18 }}>
          <div style={{ marginBottom: 8, color: config.accent, fontSize: '0.82em', fontWeight: 800 }}>个人履历简表</div>
          <EditableText as="h1" value={header.name} onCommit={header.onCommitName} style={{ margin: 0, fontSize: '2.04em', lineHeight: 1.18, fontWeight: 800, color: config.ink }} />
          <div style={{ marginTop: 8, color: config.muted, fontSize: '0.95em' }}>{title}</div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <HeaderFields header={header} color={config.muted} accent={config.accent} compact />
          </div>
        </header>
        {showJob && jobIntention.fields.length > 0 ? (
          <div style={{ marginTop: 18, padding: '10px 14px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1' }}>
            <JobIntentionBlock jobIntention={jobIntention} config={config} />
          </div>
        ) : null}
        <main className="grid" style={{ gridTemplateColumns: '32px 1fr', columnGap: 14, rowGap: 16, marginTop: 22 }}>
          {resume.sections.map((section, index) => (
            <div key={section.id} style={{ display: 'contents' }}>
              <div style={{ display: 'grid', placeItems: 'start center', paddingTop: 2, color: config.accent, fontSize: '0.76em', fontWeight: 800 }}>
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
