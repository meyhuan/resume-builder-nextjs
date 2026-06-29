"use client"

import type { CSSProperties, ReactElement } from 'react'
import { ResumeFrame, lightenHex, mmToPx, useEditableHeader, useEditableJobIntention } from '@/templates/_core'
import { CONFIG } from './configs'
import {
  CampusLayout,
  EducationTimelineLayout,
  BankGoldLayout,
  LegalBlueLayout,
  MinimalBlackLayout,
  OfficialBriefLayout,
  MarketingBannerLayout,
  PlannerProfileLayout,
  PortfolioLayout,
  FreshSidebarLayout,
  PurpleCornerLayout,
  SingleColumn,
  StackProjectsLayout,
  TechMinimalLayout,
  TeacherBlackLayout,
  TwoColumnDark,
  TwoColumnSoft,
} from './layouts'
import type { OriginalTemplateProps, VariantConfig } from './types'
import { SANS, SERIF } from './types'

type CssVars = CSSProperties & Record<`--${string}`, string | number>

// Editable primitives used by the split implementation live below this entry:
// AvatarSlot, FieldChip, SortableSection, BlockList, DeleteSectionDialog.
export function OriginalTemplate({ resume, theme, variant, sidebarSectionIds, onSidebarSectionIdsChange }: OriginalTemplateProps): ReactElement {
  const baseConfig = CONFIG[variant]
  const config = buildThemeAwareConfig(baseConfig, theme.primaryColor)
  const header = useEditableHeader(resume.name, resume.baseInfo ?? null)
  const jobIntention = useEditableJobIntention(resume.jobIntention ?? null)
  const isJobIntentionVisible = resume.jobIntentionVisible ?? jobIntention.fields.length > 0
  const fontFamily = config.serif ? SERIF : (theme.fontFamily || SANS)
  const padV = Math.max(30, mmToPx(theme.pagePaddingVertical))
  const padH = Math.max(6, mmToPx(theme.pagePaddingHorizontal))
  const rootStyle: CssVars = {
    minHeight: '297mm',
    backgroundColor: variant === 'yuanshan' ? '#fbfaf8' : '#ffffff',
    color: config.ink,
    fontFamily,
    '--original-print-page-padding-v': `${theme.pagePaddingVertical}mm`,
  }

  return (
    <ResumeFrame resume={resume} theme={theme} bleed={config.bleed} className="original-template-root" style={rootStyle} disableDnd={config.layout === 'fresh-sidebar' || config.layout === 'dark-sidebar' || config.layout === 'soft-sidebar'}>
      <style>{`
        .original-rich p { margin: 0; }
        .original-rich ul, .original-rich ol { margin: 0; padding-left: 1.2em; }
        .original-rich li { margin: 0.08em 0; }
        .original-page-content { box-sizing: border-box; }
        @media print {
          .original-template-root,
          .original-page-content {
            min-height: calc(297mm - var(--original-print-page-padding-v) - 2px) !important;
            overflow: visible !important;
          }
          .original-page-content {
            padding-bottom: 0 !important;
          }
        }
      `}</style>
      {config.layout === 'dark-sidebar' ? (
        <TwoColumnDark resume={resume} theme={theme} header={header} jobIntention={jobIntention} showJob={isJobIntentionVisible} config={config} sidebarSectionIds={sidebarSectionIds} onSidebarSectionIdsChange={onSidebarSectionIdsChange} />
      ) : config.layout === 'soft-sidebar' ? (
        <TwoColumnSoft resume={resume} theme={theme} header={header} jobIntention={jobIntention} showJob={isJobIntentionVisible} config={config} sidebarSectionIds={sidebarSectionIds} onSidebarSectionIdsChange={onSidebarSectionIdsChange} />
      ) : config.layout === 'portfolio' ? (
        <PortfolioLayout resume={resume} theme={theme} header={header} jobIntention={jobIntention} showJob={isJobIntentionVisible} config={config} />
      ) : config.layout === 'campus' ? (
        <CampusLayout resume={resume} theme={theme} header={header} jobIntention={jobIntention} showJob={isJobIntentionVisible} config={config} padH={padH} />
      ) : config.layout === 'education-timeline' ? (
        <EducationTimelineLayout resume={resume} theme={theme} header={header} jobIntention={jobIntention} showJob={isJobIntentionVisible} config={config} padH={padH} />
      ) : config.layout === 'tech-minimal' ? (
        <TechMinimalLayout resume={resume} theme={theme} header={header} jobIntention={jobIntention} showJob={isJobIntentionVisible} config={config} padV={padV} padH={padH} />
      ) : config.layout === 'stack-projects' ? (
        <StackProjectsLayout resume={resume} theme={theme} header={header} jobIntention={jobIntention} showJob={isJobIntentionVisible} config={config} />
      ) : config.layout === 'official-brief' ? (
        <OfficialBriefLayout resume={resume} theme={theme} header={header} jobIntention={jobIntention} showJob={isJobIntentionVisible} config={config} padV={padV} padH={padH} />
      ) : config.layout === 'marketing-banner' ? (
        <MarketingBannerLayout resume={resume} theme={theme} header={header} jobIntention={jobIntention} showJob={isJobIntentionVisible} config={config} padV={padV} padH={padH} />
      ) : config.layout === 'planner-profile' ? (
        <PlannerProfileLayout resume={resume} theme={theme} header={header} jobIntention={jobIntention} showJob={isJobIntentionVisible} config={config} padV={padV} padH={padH} />
      ) : config.layout === 'fresh-sidebar' ? (
        <FreshSidebarLayout resume={resume} theme={theme} header={header} jobIntention={jobIntention} showJob={isJobIntentionVisible} config={config} padV={padV} padH={padH} sidebarSectionIds={sidebarSectionIds} onSidebarSectionIdsChange={onSidebarSectionIdsChange} />
      ) : config.layout === 'purple-corner' ? (
        <PurpleCornerLayout resume={resume} theme={theme} header={header} jobIntention={jobIntention} showJob={isJobIntentionVisible} config={config} padV={padV} padH={padH} />
      ) : config.layout === 'legal-blue' ? (
        <LegalBlueLayout resume={resume} theme={theme} header={header} jobIntention={jobIntention} showJob={isJobIntentionVisible} config={config} padV={padV} padH={padH} />
      ) : config.layout === 'teacher-black' ? (
        <TeacherBlackLayout resume={resume} theme={theme} header={header} jobIntention={jobIntention} showJob={isJobIntentionVisible} config={config} padV={padV} padH={padH} />
      ) : config.layout === 'bank-gold' ? (
        <BankGoldLayout resume={resume} theme={theme} header={header} jobIntention={jobIntention} showJob={isJobIntentionVisible} config={config} padV={padV} padH={padH} />
      ) : config.layout === 'minimal-black' ? (
        <MinimalBlackLayout resume={resume} theme={theme} header={header} jobIntention={jobIntention} showJob={isJobIntentionVisible} config={config} padV={padV} padH={padH} />
      ) : (
        <SingleColumn resume={resume} theme={theme} header={header} jobIntention={jobIntention} showJob={isJobIntentionVisible} config={config} padV={padV} padH={padH} />
      )}
      {header.modals}
      {jobIntention.modals}
    </ResumeFrame>
  )
}

function buildThemeAwareConfig(baseConfig: VariantConfig, primaryColor: string | undefined): VariantConfig {
  const accent = normalizeHexColor(primaryColor) ?? baseConfig.accent
  const isTemplateDefault = accent.toLowerCase() === baseConfig.accent.toLowerCase()
  return {
    ...baseConfig,
    accent,
    secondary: isTemplateDefault ? baseConfig.secondary : deriveSecondaryAccent(accent),
  }
}

function normalizeHexColor(color: string | undefined): string | null {
  if (!color) return null
  const value = color.trim()
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase()
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    const [, r, g, b] = value
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return null
}

function deriveSecondaryAccent(accent: string): string {
  return lightenHex(accent, 0.62)
}
