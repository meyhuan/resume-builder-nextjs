"use client"

import type { ReactElement } from 'react'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import { EditableText, lightenHex } from '@/templates/_core'
import type { EditableHeader, EditableJobIntention } from '@/templates/_core'
import type { VariantConfig } from '../types'
import {
  JobIntentionBlock,
  SectionStack,
  scaledSpacing,
} from '../components'
import { FieldChip } from '@/templates/_core'
import {
  refPx,
  moduleGap,
  HeaderFieldGrid,
  SizedAvatar,
  originalHeaderFields,
} from './shared-utils'

function LegalBlueCss({ accent, secondary }: { readonly accent: string; readonly secondary: string }): ReactElement {
  return (
    <style>{`
      .original-legal-blue .original-legal-title::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        width: 19px;
        height: 39px;
        transform: skewX(-10deg);
        background: ${accent};
      }
      .original-legal-blue .original-legal-title::after {
        content: "";
        position: absolute;
        left: 24px;
        top: 0;
        width: 19px;
        height: 39px;
        transform: skewX(-10deg);
        background: ${secondary};
      }
    `}</style>
  )
}

export function LegalBlueLayout(props: {
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
  const legalTopPad = Math.max(refPx(10), Math.round(padV * 0.24))
  const legalHeaderInset = padH <= 8 ? 0 : Math.max(refPx(80) - padH, 0)
  const legalTitleLeft = padH <= 8 ? 0 : Math.max(refPx(76) - padH, 0)
  const legalBandLeft = padH <= 8 ? 0 : Math.max(refPx(36) - padH, 0)
  return (
    <div
      className="original-page-content original-legal-blue"
      data-template-padding-probe="true"
      style={{
        minHeight: '297mm',
        padding: `${legalTopPad}px ${padH}px 48px`,
        background: '#fff',
        color: config.ink,
      }}
    >
      <LegalBlueCss accent={config.accent} secondary={config.secondary} />
      <div aria-hidden style={{ position: 'relative', height: refPx(108), marginBottom: refPx(10) }}>
        <div style={{ position: 'absolute', left: legalBandLeft, right: refPx(20), top: refPx(43), height: refPx(38), transform: 'skewX(-10deg)', background: `linear-gradient(90deg, ${config.accent}, ${lightenHex(config.accent, 0.14)})` }} />
        <div style={{ position: 'absolute', left: legalTitleLeft, top: refPx(28), width: refPx(211), height: refPx(77), transform: 'skewX(-8deg)', border: `1.6px solid ${config.accent}`, backgroundColor: '#f7f7f7', display: 'grid', placeItems: 'center' }}>
          <div style={{ transform: 'skewX(8deg)', textAlign: 'center', color: config.accent, fontWeight: 900, letterSpacing: '0.07em' }}>
            <div style={{ fontSize: '1.86em', lineHeight: 1.05 }}>个人简历</div>
            <div style={{ marginTop: refPx(3), fontSize: '0.74em', lineHeight: 1.1, letterSpacing: '0.18em', whiteSpace: 'nowrap' }}>PERSONAL RESUME</div>
          </div>
        </div>
      </div>
      <header
        className="group relative"
        data-template-base-info-trigger="true"
        onClick={header.openEditModal}
        style={{ display: 'grid', gridTemplateColumns: `minmax(0, 1fr) ${refPx(122)}px`, gap: refPx(42), minHeight: refPx(164), margin: `0 ${legalHeaderInset}px`, alignItems: 'start', cursor: 'pointer' }}
      >
        <div style={{ paddingTop: refPx(2) }}>
          <div className="grid" style={{ gridTemplateColumns: `${refPx(168)}px minmax(0, ${refPx(280)}px)`, columnGap: refPx(42), rowGap: refPx(13), fontSize: '0.84em', lineHeight: 1.48, color: config.ink }}>
            <span className="inline-flex min-w-0 flex-wrap items-baseline" data-template-base-info-field="true" data-template-base-info-key="name">
              <span style={{ fontWeight: 700, color: config.ink }}>姓名：</span>
              <EditableText as="span" value={header.name} onCommit={header.onCommitName} style={{ minWidth: 0, color: config.ink, fontWeight: 700 }} />
            </span>
            {originalHeaderFields(header).map((field) => (
              <FieldChip
                key={field.key}
                field={field}
                header={header}
                deleteColor={config.accent}
                className="min-w-0 max-w-full flex-wrap items-baseline"
                style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
              >
                <span style={{ flex: '0 0 auto', color: config.ink, fontWeight: 700 }}>{field.label}：</span>
                <span style={{ minWidth: 0, color: config.ink, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{field.value}</span>
              </FieldChip>
            ))}
          </div>
        </div>
        <div style={{ justifySelf: 'end' }}>
          <SizedAvatar header={header} width={refPx(122)} height={refPx(164)} accent={config.accent} backgroundColor="#eef3f7" />
        </div>
      </header>
      {showJob && jobIntention.fields.length > 0 ? <JobIntentionBlock jobIntention={jobIntention} config={config} theme={theme} /> : null}
      <main style={{ marginTop: showJob ? moduleGap(config, theme) : scaledSpacing(10, theme) }}>
        <SectionStack sections={resume.sections} theme={theme} config={config} topMargin={0} />
      </main>
    </div>
  )
}

function TeacherBlackCss({ accent }: { readonly accent: string }): ReactElement {
  return (
    <style>{`
      .original-teacher-black .original-teacher-title::after {
        content: "";
        position: absolute;
        left: 110px;
        top: 0;
        border-style: solid;
        border-width: 24px 0 0 12px;
        border-color: transparent transparent transparent ${accent};
      }
    `}</style>
  )
}

export function TeacherBlackLayout(props: {
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
  return (
    <div
      className="original-page-content original-teacher-black"
      data-template-padding-probe="true"
      style={{
        minHeight: '297mm',
        padding: `${Math.max(22, padV - 12)}px ${padH}px 44px`,
        background: '#fff',
        color: '#111',
      }}
    >
      <TeacherBlackCss accent={config.accent} />
      <header
        className="group relative"
        data-template-base-info-trigger="true"
        onClick={header.openEditModal}
        style={{ display: 'grid', gridTemplateColumns: `minmax(0, 1fr) ${refPx(112)}px`, gap: refPx(16), alignItems: 'start', paddingBottom: refPx(4), cursor: 'pointer' }}
      >
        <div>
          <EditableText as="h1" value={header.name} onCommit={header.onCommitName} style={{ margin: 0, color: '#111', fontSize: '1.48em', lineHeight: 1.08, fontWeight: 900 }} />
          <HeaderFieldGrid header={header} accent={config.accent} labelColor="#111" valueColor="#222" columns="repeat(2, minmax(0, 1fr))" gap={`${refPx(7)}px ${refPx(20)}px`} fontSize="0.9em" />
        </div>
        <div style={{ justifySelf: 'end' }}>
          <SizedAvatar header={header} width={refPx(108)} height={refPx(130)} accent={config.accent} backgroundColor="#eeeeee" />
        </div>
      </header>
      {showJob && jobIntention.fields.length > 0 ? <JobIntentionBlock jobIntention={jobIntention} config={{ ...config, density: 'ultra' }} theme={theme} /> : null}
      <main style={{ marginTop: showJob ? moduleGap({ ...config, density: 'ultra' }, theme) : scaledSpacing(12, theme) }}>
        <SectionStack sections={resume.sections} theme={theme} config={{ ...config, density: 'ultra' }} topMargin={0} />
      </main>
    </div>
  )
}

function MinimalBlackCss({ accent }: { readonly accent: string }): ReactElement {
  return (
    <style>{`
      .original-minimal-black .minimal-info-title {
        display: grid;
        grid-template-columns: 150px minmax(0, 1fr);
        align-items: center;
        margin: 0 0 13px;
        color: ${accent};
        border-bottom: 2px solid ${accent};
      }
      .original-minimal-black .minimal-info-title strong,
      .original-minimal-black .minimal-info-title .minimal-title-label {
        position: relative;
        display: inline-flex;
        align-items: center;
        height: 30px;
        margin: 0;
        padding: 0 24px;
        background: ${accent};
        color: #fff;
        font-size: 1.08em;
        line-height: 1;
        font-weight: 900;
      }
      .original-minimal-black .minimal-info-title strong::after,
      .original-minimal-black .minimal-info-title .minimal-title-label::after {
        content: "";
        position: absolute;
        right: -20px;
        top: 0;
        border-style: solid;
        border-width: 30px 0 0 20px;
        border-color: transparent transparent transparent ${accent};
      }
      .original-minimal-black .minimal-info-title span {
        padding-left: 38px;
        color: ${accent};
        font-family: Georgia, serif;
        font-size: 0.82em;
        font-weight: 700;
      }
      .original-minimal-black .original-minimal-title::after {
        content: "Resume section";
        align-self: stretch;
        display: flex;
        align-items: center;
        padding: 0 12px;
        border-top: 1px solid #111;
        border-bottom: 1px solid #111;
        background: #fff;
        color: #111;
        font-family: Georgia, serif;
        font-size: 0.72em;
        font-weight: 500;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
    `}</style>
  )
}

export function BankGoldLayout(props: {
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
  return (
    <div
      className="original-page-content original-bank-gold"
      data-template-padding-probe="true"
      style={{
        minHeight: '297mm',
        padding: `${Math.max(22, padV - 10)}px ${padH}px 48px`,
        background: '#fff',
        color: config.ink,
      }}
    >
      <header
        className="group relative"
        data-template-base-info-trigger="true"
        onClick={header.openEditModal}
        style={{ position: 'relative', minHeight: refPx(144), cursor: 'pointer' }}
      >
        <div style={{ paddingRight: refPx(152) }}>
          <EditableText as="h1" value={header.name} onCommit={header.onCommitName} style={{ margin: `0 0 ${refPx(10)}px`, color: '#222', fontSize: '1.98em', lineHeight: 1.08, fontWeight: 900 }} />
          <HeaderFieldGrid header={header} accent={config.accent} labelColor="#8a5a20" valueColor="#4b4035" columns={`${refPx(180)}px ${refPx(230)}px`} gap={`${refPx(5)}px ${refPx(18)}px`} fontSize="0.82em" compact />
        </div>
        <div style={{ position: 'absolute', right: refPx(16), top: 0 }}>
          <SizedAvatar header={header} width={refPx(112)} height={refPx(150)} accent={config.accent} backgroundColor="#f6f6f6" />
        </div>
      </header>
      {showJob && jobIntention.fields.length > 0 ? <JobIntentionBlock jobIntention={jobIntention} config={config} theme={theme} /> : null}
      <main style={{ marginTop: showJob ? moduleGap(config, theme) : scaledSpacing(12, theme) }}>
        <SectionStack sections={resume.sections} theme={theme} config={config} topMargin={0} />
      </main>
    </div>
  )
}

export function MinimalBlackLayout(props: {
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
  return (
    <div
      className="original-page-content original-minimal-black"
      data-template-padding-probe="true"
      style={{
        minHeight: '297mm',
        padding: `${Math.max(18, padV - 12)}px ${padH}px 44px`,
        background: '#fff',
        color: '#111',
      }}
    >
      <MinimalBlackCss accent={config.accent} />
      <header
        className="group relative"
        data-template-base-info-trigger="true"
        onClick={header.openEditModal}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0 12px', borderBottom: `5px solid ${config.accent}`, cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 18 }}>
          <span style={{ color: '#111', fontSize: '1.88em', lineHeight: 1.04, fontWeight: 950, letterSpacing: '0.08em' }}>个人简历</span>
        </div>
        <div aria-hidden style={{ display: 'flex', gap: 0, paddingRight: 18 }}>
          {[0, 1, 2].map((item) => <span key={item} style={{ width: 24, height: 24, marginLeft: -4, borderRadius: 999, border: `1.5px solid ${config.accent}` }} />)}
        </div>
      </header>
      <section className="group relative" data-template-base-info-trigger="true" onClick={header.openEditModal} style={{ marginTop: 18, cursor: 'pointer' }}>
        <div className="minimal-info-title"><strong>个人信息</strong><span>Personal information</span></div>
        <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) 84px', gap: 18, alignItems: 'start' }}>
          <div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '5px 18px', fontSize: '0.86em', lineHeight: 1.36 }}>
              <span className="inline-flex min-w-0 flex-wrap items-baseline" data-template-base-info-field="true" data-template-base-info-key="name">
                <span style={{ fontWeight: 800 }}>姓名：</span>
                <EditableText as="span" value={header.name} onCommit={header.onCommitName} style={{ minWidth: 0, color: '#111', fontWeight: 800 }} />
              </span>
            </div>
            <HeaderFieldGrid header={header} accent={config.accent} labelColor="#111" valueColor="#222" columns="repeat(2, minmax(0, 1fr))" gap="5px 18px" fontSize="0.86em" compact />
          </div>
          <SizedAvatar header={header} width={82} height={98} accent={config.accent} backgroundColor="#eeeeee" />
        </div>
      </section>
      {showJob && jobIntention.fields.length > 0 ? <JobIntentionBlock jobIntention={jobIntention} config={config} theme={theme} /> : null}
      <main style={{ marginTop: showJob ? moduleGap(config, theme) : scaledSpacing(12, theme) }}>
        <SectionStack sections={resume.sections} theme={theme} config={config} topMargin={0} />
      </main>
    </div>
  )
}
