"use client"

import type { ReactElement } from 'react'
import type { ResumeData } from '@/entities/resume/resume-data'
import { getHeaderJobIntentionText } from '@/entities/resume/header-job-intention'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import { AvatarSlot, EditableText, FieldChip, hexToRgba, lightenHex } from '@/templates/_core'
import type { EditableHeader, EditableJobIntention } from '@/templates/_core'
import type { VariantConfig } from '../types'
import {
  JobIntentionBlock,
  PurpleDoubleChevron,
  SectionStack,
  scaledSpacing,
} from '../components'
import {
  refPx,
  moduleGap,
  originalHeaderFields,
  HeaderFieldGrid,
  SizedAvatar,
  CalendarDays,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from './shared-utils'

function MarketingSectionTitle(props: { readonly title: string; readonly en: string; readonly config: VariantConfig }): ReactElement {
  const { title, en, config } = props
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', height: 35, marginBottom: 12, borderBottom: `2px solid ${lightenHex(config.accent, 0.1)}` }}>
      <span style={{ minWidth: 119, padding: '4px 17px', textAlign: 'center', backgroundColor: config.accent, color: '#fff', fontSize: '1.25em', fontWeight: 800 }}>{title}</span>
      <span style={{ marginLeft: 12, color: '#111', fontSize: '1.08em' }}>{en}</span>
    </div>
  )
}

export function MarketingBannerLayout(props: {
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
    <div className="original-page-content" data-template-padding-probe="true" style={{ minHeight: '297mm', padding: `${padV}px ${padH}px 44px`, backgroundColor: '#fff' }}>
      <div aria-hidden style={{ margin: `-${padV}px -${padH}px 16px`, height: 56, background: `linear-gradient(90deg, ${config.secondary}, ${config.accent})`, color: '#c6c6c6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.56em', fontWeight: 800 }}>
        个人简历 <span style={{ marginLeft: 10, fontFamily: 'Georgia, serif', fontSize: '0.55em', fontWeight: 400 }}>Personal Resume</span>
      </div>
      <header
        className="group relative"
        onClick={header.openEditModal}
        data-template-base-info-trigger="true"
        style={{ minHeight: 148, paddingRight: 132, cursor: 'pointer' }}
      >
        <div style={{ position: 'absolute', right: 8, top: 10 }}>
          <span aria-hidden style={{ position: 'absolute', right: -7, top: -7, width: 100, height: 116, backgroundColor: config.accent }} />
          <SizedAvatar header={header} width={96} height={116} accent={config.accent} backgroundColor="#f4f6f8" />
        </div>
        <MarketingSectionTitle title="基本信息" en="Basic information" config={config} />
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '5px 24px', marginTop: 8, paddingRight: 8, fontSize: '0.9em', lineHeight: 1.38 }}>
          <span className="inline-flex min-w-0 flex-wrap items-baseline" data-template-base-info-field="true" data-template-base-info-key="name">
              <span style={{ flex: '0 0 auto', fontWeight: 800, color: '#000' }}>姓名：</span>
            <EditableText as="span" value={header.name} onCommit={header.onCommitName} style={{ minWidth: 0, color: '#000', fontWeight: 800 }} />
          </span>
        </div>
        <HeaderFieldGrid header={header} accent={config.accent} labelColor="#000" valueColor="#000" columns="repeat(2, minmax(0, 1fr))" gap="5px 24px" fontSize="0.86em" compact />
      </header>
      {showJob && jobIntention.fields.length > 0 ? <JobIntentionBlock jobIntention={jobIntention} config={config} theme={theme} /> : null}
      <main style={{ marginTop: showJob ? moduleGap(config, theme) : scaledSpacing(12, theme) }}>
        <SectionStack sections={resume.sections} theme={theme} config={config} topMargin={0} />
      </main>
    </div>
  )
}

function RoundAvatar(props: { readonly header: EditableHeader; readonly accent: string }): ReactElement {
  return (
    <AvatarSlot
      header={props.header}
      render={({ image, uploadOverlay }) => (
        <div className="relative overflow-hidden" style={{ boxSizing: 'border-box', width: refPx(132), height: refPx(132), borderRadius: 999, border: `1.5px solid ${props.accent}`, backgroundColor: lightenHex(props.accent, 0.82) }}>
          {image}
          {uploadOverlay}
        </div>
      )}
    />
  )
}

function PlannerHeaderFields(props: {
  readonly header: EditableHeader
  readonly config: VariantConfig
}): ReactElement {
  const fields = originalHeaderFields(props.header)
  if (fields.length === 0) return <></>
  return (
    <div className="flex flex-wrap" style={{ columnGap: refPx(18), rowGap: refPx(6), color: '#333', fontSize: '0.82em', lineHeight: 1.38 }}>
      {fields.map((field) => (
        <FieldChip
          key={field.key}
          field={field}
          header={props.header}
          deleteColor={props.config.accent}
          className="inline-flex min-w-0 max-w-full items-baseline"
        >
          <span style={{ flex: '0 0 auto', color: '#6a6a6a', fontWeight: 600 }}>{field.label}：</span>
          <span style={{ minWidth: 0, color: '#333', overflowWrap: 'normal', wordBreak: 'normal' }}>{field.value}</span>
        </FieldChip>
      ))}
    </div>
  )
}

export function PlannerProfileLayout(props: {
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
  const headerTitle = showJob ? getHeaderJobIntentionText(resume) : ''
  return (
    <div className="original-page-content" data-template-padding-probe="true" style={{ minHeight: '297mm', padding: `${Math.max(16, padV - 10)}px ${padH}px 44px`, background: `linear-gradient(135deg, ${hexToRgba(config.accent, 0.09)}, transparent ${refPx(190)}px), #fff`, color: config.ink }}>
      <header
        className="group relative"
        onClick={header.openEditModal}
        data-template-base-info-trigger="true"
        style={{
          display: 'grid',
          gridTemplateColumns: `${refPx(300)}px minmax(0, 1fr)`,
          gap: refPx(20),
          minHeight: refPx(150),
          paddingBottom: refPx(4),
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: `${refPx(132)}px minmax(0, 1fr)`, gap: refPx(14), alignItems: 'start', minWidth: 0 }}>
          <RoundAvatar header={header} accent={config.accent} />
          <div style={{ minWidth: 0, paddingTop: refPx(22) }}>
            <EditableText as="h1" value={header.name} onCommit={header.onCommitName} style={{ margin: 0, fontSize: '2.25em', lineHeight: 1.15, fontWeight: 500, color: '#222' }} />
            {headerTitle ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  jobIntention.openEditModal()
                }}
                style={{ display: 'inline-flex', marginTop: refPx(8), padding: 0, border: 0, background: 'transparent', color: config.accent, fontSize: '0.94em', lineHeight: 1.35, fontWeight: 500, letterSpacing: '0.08em', cursor: 'pointer' }}
              >
                {headerTitle}
              </button>
            ) : null}
          </div>
        </div>
        <div style={{ minWidth: 0, paddingTop: refPx(18) }}>
          <PlannerHeaderFields header={header} config={config} />
        </div>
      </header>
      {showJob && jobIntention.fields.length > 0 ? <JobIntentionBlock jobIntention={jobIntention} config={config} theme={theme} /> : null}
      <main style={{ marginTop: showJob ? moduleGap(config, theme) : scaledSpacing(12, theme) }}>
        <SectionStack sections={resume.sections} theme={theme} config={config} topMargin={0} />
      </main>
    </div>
  )
}

function PurpleCornerCss({ accent }: { readonly accent: string }): ReactElement {
  return (
    <style>{`
      .original-purple-corner .original-purple-resume-tag {
        position: absolute;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: ${accent};
        color: #fff;
        font-weight: 900;
        line-height: 1;
      }
      .original-purple-corner .original-purple-resume-tag::before,
      .original-purple-corner .original-purple-resume-tag::after,
      .original-purple-corner .original-purple-resume-line::after {
        content: "";
        position: absolute;
        width: 6px;
        height: 6px;
        border-radius: 999px;
        background: ${accent};
      }
      .original-purple-corner .original-purple-resume-tag::before {
        left: -3px;
        top: 50%;
        transform: translateY(-50%);
      }
      .original-purple-corner .original-purple-resume-tag::after {
        right: -3px;
        top: 50%;
        transform: translateY(-50%);
      }
      .original-purple-corner .original-purple-resume-line::after {
        right: -3px;
        top: -4px;
      }
    `}</style>
  )
}

function PurpleHeaderFieldGrid(props: {
  readonly header: EditableHeader
  readonly accent: string
}): ReactElement {
  const { header, accent } = props
  const fields = originalHeaderFields(header)
  const infoIconColor = '#5d5aa0'
  if (fields.length === 0) return <></>
  return (
    <div className="grid" style={{ gridTemplateColumns: `${refPx(190)}px minmax(0, ${refPx(300)}px)`, gap: `${refPx(12)}px ${refPx(28)}px`, fontSize: '0.88em', lineHeight: 1.48, color: '#333' }}>
      {fields.map((field) => (
        <FieldChip
          key={field.key}
          field={field}
          header={header}
          deleteColor={accent}
          className="min-w-0 max-w-full flex-wrap items-baseline"
          style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', flex: '0 0 auto', color: infoIconColor, fontWeight: 800 }}>
            <PurpleHeaderFieldIcon label={field.label} color={infoIconColor} />
            <span style={{ color: '#555' }}>{field.label}：</span>
          </span>
          <span style={{ minWidth: 0, color: '#444', overflowWrap: 'anywhere', wordBreak: 'break-word', letterSpacing: field.label.includes('邮箱') ? '0.08em' : 0 }}>{field.value}</span>
        </FieldChip>
      ))}
    </div>
  )
}

function PurpleHeaderFieldIcon({ label, color }: { readonly label: string; readonly color: string }): ReactElement | null {
  let Icon: typeof CalendarDays | undefined
  if (/出生|生日|年龄/.test(label)) Icon = CalendarDays
  else if (/电话|手机|联系/.test(label)) Icon = Phone
  else if (/学历|学位|教育/.test(label)) Icon = GraduationCap
  else if (/邮箱|邮件|email/i.test(label)) Icon = Mail
  else if (/城市|地址|现居|籍贯|户籍/.test(label)) Icon = MapPin
  else if (/性别|姓名|民族/.test(label)) Icon = UserRound
  if (!Icon) return null
  return <Icon aria-hidden size={14} strokeWidth={2.6} style={{ flex: '0 0 auto', marginRight: 6, color }} />
}

export function PurpleCornerLayout(props: {
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
  const headerRight = padH <= 8 ? 0 : Math.max(refPx(76) - padH, 0)
  const headerLeft = padH <= 8 ? 0 : Math.max(refPx(66) - padH, 0)
  const headerBleedLeft = -(padH + headerLeft)
  const headerBleedRight = -(padH + headerRight)
  const headerJob = getHeaderJobIntentionText(resume)
  const topDecorHeight = refPx(58)
  return (
    <div className="original-page-content original-purple-corner" data-template-padding-probe="true" style={{ minHeight: '297mm', padding: `${padV}px ${padH}px 44px`, backgroundColor: '#fff', position: 'relative' }}>
      <PurpleCornerCss accent={config.accent} />
      <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: 0, height: refPx(84), overflow: 'hidden', pointerEvents: 'none' }}>
        <span style={{ position: 'absolute', inset: 0, height: refPx(58), background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.62) 0%, rgba(15, 23, 42, 0.22) 46%, rgba(255, 255, 255, 0) 100%)' }} />
        <span style={{ position: 'absolute', left: 0, top: 0, borderStyle: 'solid', borderWidth: `${refPx(86)}px ${refPx(52)}px 0 0`, borderColor: `${config.secondary} transparent transparent transparent` }} />
        <span style={{ position: 'absolute', right: 0, top: 0, borderStyle: 'solid', borderWidth: `0 0 ${refPx(86)}px ${refPx(52)}px`, borderColor: `transparent transparent ${config.secondary} transparent` }} />
        <span
          className="original-purple-resume-tag"
          style={{
            left: refPx(57),
            top: refPx(31),
            width: refPx(184),
            height: refPx(32),
            borderRadius: refPx(4),
            fontSize: '0.82em',
            letterSpacing: '0.04em',
          }}
        >
          PERSONAL RESUME
        </span>
        <span
          className="original-purple-resume-line"
          style={{
            position: 'absolute',
            left: refPx(244),
            right: refPx(192),
            top: refPx(47),
            borderTop: `3px dotted ${config.accent}`,
          }}
        />
        <span style={{ position: 'absolute', right: refPx(56), top: refPx(32), color: config.secondary, fontSize: '1.28em', lineHeight: 1, fontWeight: 900, letterSpacing: `${refPx(12)}px`, whiteSpace: 'nowrap' }}>
          个人简历
        </span>
      </div>
      <div aria-hidden style={{ height: topDecorHeight, marginTop: -padV }} />
      <header
        className="group relative"
        onClick={header.openEditModal}
        data-template-base-info-trigger="true"
        style={{
          margin: `${refPx(33)}px ${headerRight}px ${refPx(30)}px ${headerLeft}px`,
          minHeight: refPx(158),
          padding: `0 ${refPx(178)}px 0 ${refPx(18)}px`,
          cursor: 'pointer',
        }}
      >
        <span
          aria-hidden
          style={{
            position: 'absolute',
            zIndex: 0,
            left: headerBleedLeft,
            right: headerBleedRight,
            top: refPx(74),
            height: refPx(76),
            backgroundColor: '#f7f7f9',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', minWidth: 0, paddingTop: refPx(5), whiteSpace: 'nowrap' }}>
          <PurpleDoubleChevron color={config.accent} height="1.2em" />
          <EditableText as="h1" value={header.name} onCommit={header.onCommitName} style={{ display: 'inline-block', margin: 0, color: '#333', fontSize: '1.78em', lineHeight: 1.08, fontWeight: 900, letterSpacing: '0.24em' }} />
          {headerJob ? (
            <>
              <span aria-hidden style={{ width: refPx(2), height: refPx(38), margin: `0 ${refPx(12)}px`, transform: 'skewX(-14deg)', backgroundColor: config.accent }} />
              <span style={{ display: 'inline-flex', alignItems: 'center', minHeight: refPx(35), padding: `${refPx(5)}px ${refPx(18)}px ${refPx(6)}px ${refPx(14)}px`, clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 100%, 0 100%)', backgroundColor: config.accent, color: '#fff', fontSize: '0.9em', fontWeight: 900 }}>
                求职意向：{headerJob}
              </span>
            </>
          ) : null}
        </div>
        <div style={{ position: 'relative', zIndex: 1, marginTop: refPx(31) }}>
          <PurpleHeaderFieldGrid header={header} accent={config.accent} />
        </div>
        <div style={{ position: 'absolute', zIndex: 2, right: 0, top: refPx(14) }}>
          <SizedAvatar header={header} width={refPx(126)} height={refPx(174)} accent={config.accent} backgroundColor="#eeeeee" />
        </div>
      </header>
      {showJob && jobIntention.fields.length > 0 ? <JobIntentionBlock jobIntention={jobIntention} config={config} theme={theme} /> : null}
      <main style={{ marginTop: showJob ? moduleGap(config, theme) : scaledSpacing(refPx(12), theme) }}>
        <SectionStack sections={resume.sections} theme={theme} config={config} topMargin={0} />
      </main>
    </div>
  )
}
