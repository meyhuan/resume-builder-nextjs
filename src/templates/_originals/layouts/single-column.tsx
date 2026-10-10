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
  const showAvatar = config.density !== 'ultra' || header.baseInfo?.showAvatar !== false
  const metrics = config.metrics && config.metrics !== 'none' ? metricItems(header) : []

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
      {config.id === 'yuanshan' ? <style>{`
        .original-executive-section { display: flow-root; border-top: 1px solid ${lightenHex(config.accent, .6)}; padding-top: 14px; }
        .original-executive-label { float: left; width: 18%; }
        .original-executive-label h2 { border: 0 !important; padding: 0 !important; margin: 0 !important; }
        .original-executive-content { margin-left: 23%; min-width: 0; }
        @media print { .original-executive-section { break-inside: auto !important; } }
      `}</style> : null}
      <div aria-hidden style={{ height: config.formal ? 4 : 3, marginBottom: config.density === 'ultra' ? 10 : 16, backgroundColor: config.accent }} />
      <header
        className="group relative"
        onClick={header.openEditModal}
        style={{
          display: showAvatar ? 'grid' : 'block',
          gridTemplateColumns: `minmax(0, 1fr) ${(config.density === 'ultra' ? 82 : config.formal ? 104 : 112) * header.avatarScale}px`,
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
            }}
          />
          {title ? <div style={{ marginTop: 8, fontSize: '0.98em', fontWeight: config.id === 'yuanshan' ? 700 : 500, color: config.id === 'yuanshan' ? config.accent : config.muted }}>{title}</div> : null}
          <HeaderFields header={header} color={config.muted} accent={config.accent} formal={config.formal} compact={config.density === 'compact' || config.density === 'ultra'} />
          {config.formal ? <FormalInfoGrid header={header} /> : null}
        </div>
        {showAvatar ? (
          <AvatarBox header={header} accent={config.accent} radius={config.formal ? 4 : 16} compact={config.density === 'compact' || config.density === 'ultra'} />
        ) : null}
      </header>

      {showJob && jobIntention.fields.length > 0 ? <JobIntentionBlock jobIntention={jobIntention} config={config} theme={theme} /> : null}
      {metrics.some(([value]) => value.trim()) ? (
        <section data-template-section="true" data-template-section-title="核心业绩" style={{ marginTop: scaledMetricGap(theme.spacingScale) }}>
          <h2
            style={{
              margin: '0 0 10px',
              paddingBottom: 6,
              borderBottom: `1px solid ${config.accent}`,
              color: config.accent,
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

function scaledMetricGap(spacingScale: number): number {
  return Math.round(20 * Math.max(0, spacingScale) * 10) / 10
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
  const padV = Math.max(0, mmToPx(theme.pagePaddingVertical))
  const title = getHeaderJobIntentionText(resume)
  const highlightItems = campusMetricItems(header)
  const visibleHighlights = highlightItems.filter(([value]) => value.trim())

  return (
    <div className="original-page-content" data-template-padding-probe="true" style={{ padding: `${padV}px ${padH}px 46px`, backgroundColor: '#ffffff' }}>
      <header
        className="group relative"
        onClick={header.openEditModal}
        style={{
          margin: `-${padV}px -${padH}px ${34 * theme.spacingScale}px`,
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
        {visibleHighlights.length > 0 ? <div className="grid gap-3" style={{ marginTop: 20, gridTemplateColumns: `repeat(${visibleHighlights.length}, minmax(0, 1fr))` }}>
          {visibleHighlights.map(([value, text], index) => (
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
        </div> : null}
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
