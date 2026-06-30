"use client"

import { useState } from 'react'
import type { ReactElement } from 'react'
import type { ResumeData } from '@/entities/resume/resume-data'
import { getHeaderJobIntentionText } from '@/entities/resume/header-job-intention'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import { useAppStore } from '@/state/store'
import { EditableText, hexToRgba, lightenHex, mmToPx } from '@/templates/_core'
import type { EditableHeader, EditableJobIntention } from '@/templates/_core'
import type { VariantConfig } from '../types'
import { SERIF } from '../types'
import {
  AvatarBox,
  CampusHighlightsDialog,
  FormalInfoGrid,
  HeaderFields,
  JobIntentionBlock,
  Metrics,
  MetricsDialog,
  SectionStack,
  buildBaseInfoWithHighlights,
  buildBaseInfoWithMetrics,
  campusMetricItems,
  metricItems,
} from '../components'

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
  const title = getHeaderJobIntentionText(resume)
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
              fontWeight: 700,
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

      {showJob && jobIntention.fields.length > 0 ? <JobIntentionBlock jobIntention={jobIntention} config={config} theme={theme} /> : null}
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
              fontWeight: 700,
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
  const title = getHeaderJobIntentionText(resume)
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
            <EditableText as="h1" value={header.name} onCommit={header.onCommitName} style={{ margin: 0, fontSize: '2.05em', lineHeight: 1.15, fontWeight: 700, color: config.heroTone === 'soft' ? config.ink : '#fff' }} />
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
      {showJob && jobIntention.fields.length > 0 ? <JobIntentionBlock jobIntention={jobIntention} config={config} theme={theme} /> : null}
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
