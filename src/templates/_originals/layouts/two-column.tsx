"use client"

import type { ReactElement } from 'react'
import type { ResumeData } from '@/entities/resume/resume-data'
import { getHeaderJobIntentionText } from '@/entities/resume/header-job-intention'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import { AvatarSlot, EditableText, hexToRgba, lightenHex, mmToPx } from '@/templates/_core'
import type { EditableHeader, EditableJobIntention } from '@/templates/_core'
import TwoColumnDndProvider, { ColumnDroppable, CrossColumnPlaceholder, COLUMN_LEFT_ID, COLUMN_RIGHT_ID, isTextOnlySection } from '@/templates/warm/two-column-dnd-provider'
import type { VariantConfig } from '../types'
import {
  AvatarBox,
  HeaderFields,
  JobIntentionBlock,
  SectionStack,
  SidebarJob,
  SidebarSections,
  sectionStackGap,
} from '../components'
import { refPx, useSidebarSplit, useDndActions } from './shared-utils'

export function TwoColumnDark(props: {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
  readonly header: EditableHeader
  readonly jobIntention: EditableJobIntention
  readonly showJob: boolean
  readonly config: VariantConfig
  readonly sidebarSectionIds?: readonly string[]
  readonly onSidebarSectionIdsChange?: (ids: readonly string[]) => void
}): ReactElement {
  const { resume, theme, header, jobIntention, showJob, config, sidebarSectionIds: externalIds, onSidebarSectionIdsChange } = props
  const padV = Math.max(30, mmToPx(theme.pagePaddingVertical))
  const padH = Math.max(6, mmToPx(theme.pagePaddingHorizontal))
  const { leftSections, rightSections, handleMoveToColumn } = useSidebarSplit(resume, /技能|证书|资格|自我|评价|优势/i, externalIds, onSidebarSectionIdsChange)
  const { moveSection, moveBlockInSection, moveBlockToSection } = useDndActions()
  const showAvatar = header.baseInfo?.showAvatar !== false
  const title = getHeaderJobIntentionText(resume)
  return (
    <TwoColumnDndProvider
      leftSections={leftSections}
      rightSections={rightSections}
      allSections={resume.sections}
      theme={theme}
      onMoveSection={moveSection}
      onMoveWithinSection={moveBlockInSection}
      onMoveToSection={moveBlockToSection}
      onMoveSectionToColumn={handleMoveToColumn}
      canMoveSectionToColumn={(section) => isTextOnlySection(section)}
    >
      <div className="grid original-page-content" data-template-padding-probe="true" style={{ gridTemplateColumns: '238px 1fr', minHeight: '297mm', padding: `${padV}px ${padH}px`, backgroundColor: '#fff' }}>
        <ColumnDroppable id={COLUMN_LEFT_ID}>
          <aside
            style={{
              padding: '40px 26px',
              background: config.heroTone === 'gradient'
                ? `linear-gradient(180deg, ${config.accent}, ${config.secondary})`
                : '#111827',
              color: '#f8fafc',
            }}
          >
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
                {title ? (
                  <div style={{ width: '100%', marginTop: 8, color: '#cbd5e1', fontSize: '0.92em', textAlign: showAvatar ? 'center' : 'left' }}>
                    {title}
                  </div>
                ) : null}
              </div>
              <HeaderFields header={header} color="#cbd5e1" accent={config.accent} vertical light />
            </div>
            {showJob && jobIntention.fields.length > 0 ? <SidebarJob jobIntention={jobIntention} accent={config.accent} /> : null}
            <SidebarSections sections={leftSections} theme={theme} config={config} dark />
            <CrossColumnPlaceholder columnId={COLUMN_LEFT_ID} />
          </aside>
        </ColumnDroppable>
        <ColumnDroppable id={COLUMN_RIGHT_ID}>
          <main style={{ padding: '40px 40px' }}>
            <SectionStack sections={rightSections} theme={theme} config={config} topMargin={0} />
            <CrossColumnPlaceholder columnId={COLUMN_RIGHT_ID} />
          </main>
        </ColumnDroppable>
      </div>
    </TwoColumnDndProvider>
  )
}

export function TwoColumnSoft(props: {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
  readonly header: EditableHeader
  readonly jobIntention: EditableJobIntention
  readonly showJob: boolean
  readonly config: VariantConfig
  readonly sidebarSectionIds?: readonly string[]
  readonly onSidebarSectionIdsChange?: (ids: readonly string[]) => void
}): ReactElement {
  const { resume, theme, header, jobIntention, showJob, config, sidebarSectionIds: externalIds, onSidebarSectionIdsChange } = props
  const padV = Math.max(30, mmToPx(theme.pagePaddingVertical))
  const padH = Math.max(6, mmToPx(theme.pagePaddingHorizontal))
  const { leftSections, rightSections, handleMoveToColumn } = useSidebarSplit(resume, /技能|证书|资格|作品|自我|评价|优势/i, externalIds, onSidebarSectionIdsChange)
  const { moveSection, moveBlockInSection, moveBlockToSection } = useDndActions()
  return (
    <TwoColumnDndProvider
      leftSections={leftSections}
      rightSections={rightSections}
      allSections={resume.sections}
      theme={theme}
      onMoveSection={moveSection}
      onMoveWithinSection={moveBlockInSection}
      onMoveToSection={moveBlockToSection}
      onMoveSectionToColumn={handleMoveToColumn}
      canMoveSectionToColumn={(section) => isTextOnlySection(section)}
    >
      <div className="grid original-page-content" data-template-padding-probe="true" style={{ gridTemplateColumns: '286px 1fr', minHeight: '297mm', padding: `${padV}px ${padH}px`, backgroundColor: '#fff' }}>
        <ColumnDroppable id={COLUMN_LEFT_ID}>
          <aside style={{ padding: '42px 28px', background: `linear-gradient(160deg, ${hexToRgba(config.secondary, 0.12)}, ${hexToRgba(config.accent, 0.08)}), #f8fafc` }}>
            <EditableText as="h1" value={header.name} onCommit={header.onCommitName} style={{ margin: 0, fontSize: '2em', lineHeight: 1.15, fontWeight: 800, color: config.ink }} />
            {getHeaderJobIntentionText(resume) ? (
              <div style={{ marginTop: 8, color: config.muted, fontSize: '0.94em' }}>{getHeaderJobIntentionText(resume)}</div>
            ) : null}
            <HeaderFields header={header} color={config.muted} accent={config.accent} vertical />
            {showJob && jobIntention.fields.length > 0 ? <SidebarJob jobIntention={jobIntention} accent={config.accent} /> : null}
            <SidebarSections sections={leftSections} theme={theme} config={config} />
            <CrossColumnPlaceholder columnId={COLUMN_LEFT_ID} />
          </aside>
        </ColumnDroppable>
        <ColumnDroppable id={COLUMN_RIGHT_ID}>
          <main style={{ padding: '42px 40px' }}>
            <SectionStack sections={rightSections} theme={theme} config={config} topMargin={0} />
            <CrossColumnPlaceholder columnId={COLUMN_RIGHT_ID} />
          </main>
        </ColumnDroppable>
      </div>
    </TwoColumnDndProvider>
  )
}

export function FreshSidebarLayout(props: {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
  readonly header: EditableHeader
  readonly jobIntention: EditableJobIntention
  readonly showJob: boolean
  readonly config: VariantConfig
  readonly padV: number
  readonly padH: number
  readonly sidebarSectionIds?: readonly string[]
  readonly onSidebarSectionIdsChange?: (ids: readonly string[]) => void
}): ReactElement {
  const { resume, theme, header, jobIntention, showJob, config, padV, padH, sidebarSectionIds: externalIds, onSidebarSectionIdsChange } = props
  const { leftSections, rightSections, handleMoveToColumn } = useSidebarSplit(resume, /技能|证书|资格|自我|评价|优势/i, externalIds, onSidebarSectionIdsChange)
  const { moveSection, moveBlockInSection, moveBlockToSection } = useDndActions()
  const sideWidth = 252
  const sideTrackWidth = Math.max(186, sideWidth - padH)
  const showAvatar = header.baseInfo?.showAvatar !== false
  const photoHeight = showAvatar ? 472 : refPx(46)
  const lowerTop = showAvatar ? 450 : refPx(24)
  return (
    <TwoColumnDndProvider
      leftSections={leftSections}
      rightSections={rightSections}
      allSections={resume.sections}
      theme={theme}
      onMoveSection={moveSection}
      onMoveWithinSection={moveBlockInSection}
      onMoveToSection={moveBlockToSection}
      onMoveSectionToColumn={handleMoveToColumn}
      canMoveSectionToColumn={(section) => isTextOnlySection(section)}
    >
      <div className="grid original-page-content" data-template-padding-probe="true" style={{ gridTemplateColumns: `${sideTrackWidth}px 1fr`, minHeight: '297mm', padding: `${padV}px ${padH}px`, backgroundColor: '#fff', overflow: 'hidden' }}>
        <ColumnDroppable id={COLUMN_LEFT_ID}>
          <aside
            className="relative"
            style={{
              width: sideWidth,
              minHeight: '297mm',
              margin: `-${padV}px 0 -${padV}px -${padH}px`,
              paddingTop: photoHeight,
              color: '#fff',
              textAlign: 'center',
              background: `linear-gradient(180deg, ${config.accent}, ${config.secondary})`,
              overflow: 'hidden',
            }}
          >
            {showAvatar ? (
              <>
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: `0 0 auto 0`,
                    height: photoHeight,
                    background: 'linear-gradient(180deg, #f7fbff 0%, #eef6ff 100%)',
                  }}
                />
                <div style={{ position: 'absolute', left: 0, top: 0, width: sideWidth, height: photoHeight }}>
                  <AvatarSlot
                    header={header}
                    placeholderSize={96}
                    placeholderBg="#f4f8ff"
                    placeholderColor={lightenHex(config.accent, 0.42)}
                    render={({ image, uploadOverlay }) => (
                      <div className="relative overflow-hidden" style={{ width: sideWidth, height: photoHeight, backgroundColor: '#f4f8ff' }}>
                        {image}
                        {uploadOverlay}
                      </div>
                    )}
                  />
                </div>
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: lowerTop,
                    borderStyle: 'solid',
                    borderWidth: `0 0 60px ${sideWidth}px`,
                    borderColor: `transparent transparent ${config.accent} transparent`,
                  }}
                />
              </>
            ) : null}
            <div
              className="group relative"
              data-template-base-info-trigger="true"
              onClick={header.openEditModal}
              style={{ padding: '20px 38px 22px', cursor: 'pointer' }}
            >
              <EditableText as="h1" value={header.name} onCommit={header.onCommitName} style={{ margin: 0, fontSize: '2.12em', lineHeight: 1.08, fontWeight: 900, color: '#fff' }} />
              {getHeaderJobIntentionText(resume) ? (
                <div style={{ marginTop: 10, color: '#fff', fontSize: '0.9em', lineHeight: 1.45 }}>
                  {getHeaderJobIntentionText(resume)}
                </div>
              ) : null}
              <div aria-hidden style={{ width: '100%', height: 1, margin: '24px 0 18px', backgroundColor: 'rgba(255,255,255,0.68)' }} />
              <div style={{ textAlign: 'left' }}>
                <HeaderFields header={header} color="#fff" accent="#fff" vertical light />
              </div>
            </div>
            <div style={{ position: 'relative', padding: '0 30px 34px' }}>
              <SidebarSections sections={leftSections} theme={theme} config={config} dark />
              <CrossColumnPlaceholder columnId={COLUMN_LEFT_ID} />
            </div>
          </aside>
        </ColumnDroppable>
        <ColumnDroppable id={COLUMN_RIGHT_ID}>
          <main style={{ padding: `${Math.max(8, padV - 46)}px 0 0 ${refPx(30)}px` }}>
            {showJob && jobIntention.fields.length > 0 ? <JobIntentionBlock jobIntention={jobIntention} config={{ ...config, sectionStyle: 'line' }} theme={theme} topMargin={0} /> : null}
            <SectionStack sections={rightSections} theme={theme} config={{ ...config, sectionStyle: 'line' }} topMargin={showJob ? sectionStackGap(config) : 0} />
            <CrossColumnPlaceholder columnId={COLUMN_RIGHT_ID} />
          </main>
        </ColumnDroppable>
      </div>
    </TwoColumnDndProvider>
  )
}
