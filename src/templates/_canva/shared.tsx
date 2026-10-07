"use client"

import { useState } from 'react'
import type { ReactElement } from 'react'
import { findModuleBySectionTitle } from '@/entities/module/module-config'
import type { Section } from '@/entities/resume/section'
import { isHeaderJobIntentionVisible } from '@/entities/resume/header-job-intention'
import { useAppStore } from '@/state/store'
import { ResumeFrame, lightenHex, mmToPx, useEditableHeader, useEditableJobIntention } from '@/templates/_core'
import type { TemplateProps } from '@/templates/_core'
import TwoColumnDndProvider, { COLUMN_LEFT_ID, COLUMN_RIGHT_ID, ColumnDroppable, CrossColumnPlaceholder } from '@/templates/warm/two-column-dnd-provider'
import { REFERENCE_DESIGNS } from './designs'
import type { ReferenceDesign, ReferenceDesignId } from './designs'
import { Fields, Heading, Intention, Name, Portrait, ReferenceSection, contrastingInk, gap } from './components'
import type { DesignStyle } from './components'
import { Masthead, RailProfile, ReferenceHeader } from './header'
import { ReferenceStyles } from './styles'
import { SavedFacts } from './saved-facts'

export function defaultSidebarIds(sections: readonly Section[], design: ReferenceDesign): string[] {
  return sections.filter((section) => {
    const key = findModuleBySectionTitle(section.title)?.key
    return key !== undefined && design.sidebarModules?.some((candidate) => candidate === key)
  }).map((section) => section.id)
}

/** Render the measured structure, while editing/data/DnD still use the shared kernel. */
export function CanvaAdaptedTemplate({ resume, theme, variant, sidebarSectionIds, onSidebarSectionIdsChange }: TemplateProps & { readonly variant: ReferenceDesignId }): ReactElement {
  const baseDesign: ReferenceDesign = REFERENCE_DESIGNS[variant]
  const accent = /^#(?:[a-f\d]{3}|[a-f\d]{6})$/i.test(theme.primaryColor) ? theme.primaryColor : baseDesign.accent
  const header = useEditableHeader(resume.name, resume.baseInfo ?? null, variant)
  const design: ReferenceDesign = { ...baseDesign, accent, avatar: [baseDesign.avatar[0] * header.avatarScale, baseDesign.avatar[1] * header.avatarScale] }
  const intention = useEditableJobIntention(resume.jobIntention)
  const showJob = isHeaderJobIntentionVisible(resume) && intention.fields.length > 0
  const english = resume.language === 'en'
  const split = design.columns !== 'single'
  const [localSidebarIds, setLocalSidebarIds] = useState<readonly string[] | null>(null)
  const sidebarIds = sidebarSectionIds ?? localSidebarIds ?? defaultSidebarIds(resume.sections, design)
  const sidebarSet = new Set(sidebarIds)
  const railSections = resume.sections.filter((section) => sidebarSet.has(section.id))
  const mainSections = resume.sections.filter((section) => !sidebarSet.has(section.id))
  const rightRail = design.columns === 'right'
  const physicalLeft = rightRail ? mainSections : railSections
  const physicalRight = rightRail ? railSections : mainSections
  const moveSection = useAppStore((s) => s.moveSection)
  const moveWithinSection = useAppStore((s) => s.moveBlockInSection)
  const moveToSection = useAppStore((s) => s.moveBlockToSection)
  const onMoveSectionToColumn = (sectionId: string, column: 'left' | 'right'): void => {
    const toRail = rightRail ? column === 'right' : column === 'left'
    const validIds = new Set(resume.sections.map((section) => section.id))
    const current = sidebarIds.filter((id) => validIds.has(id))
    const next = toRail ? [...new Set([...current, sectionId])] : current.filter((id) => id !== sectionId)
    setLocalSidebarIds(next)
    onSidebarSectionIdsChange?.(next)
  }
  const padV = Math.max(0, mmToPx(theme.pagePaddingVertical))
  const padH = Math.max(0, mmToPx(theme.pagePaddingHorizontal))
  const columnGap = split ? 22 : 0
  const ratio = design.railRatio ?? .35
  const leftRatio = rightRail ? 1 - ratio : ratio
  const onAccent = contrastingInk(accent)
  const darkText = design.darkRail && onAccent === '#ffffff'
  const style: DesignStyle = {
    minHeight: '297mm', color: theme.textColor,
    '--canva-accent': accent,
    '--canva-on-accent': onAccent,
    '--canva-soft': lightenHex(accent, .82),
    '--canva-title-scale': theme.titleScale ?? 1,
    '--canva-header-gap': `${gap(design.density === 'compact' ? 20 : 28, theme)}px`,
    '--canva-left-width': `calc((100% - ${columnGap}px) * ${leftRatio})`,
    '--canva-right-width': `calc((100% - ${columnGap}px) * ${1 - leftRatio})`,
  }
  const sections = (items: readonly Section[], compact = false, dark = false) => items.map((section, index) => <ReferenceSection key={section.id} section={section} design={design} theme={theme} compact={compact} dark={dark} index={index} />)
  const railHasProfile = design.columns === 'left' && design.header !== 'split'
  const rail = <aside className={`canva-rail ${design.darkRail ? 'canva-dark-rail' : ''}`} style={{ height: '100%', padding: design.darkRail || design.header === 'rail-document' || design.columns === 'split' ? '22px 16px' : '8px 12px 8px 0', background: design.header === 'rail-document' ? 'var(--canva-soft)' : design.columns === 'split' ? '#f3f5f5' : undefined, borderRight: design.heading === 'bullet' || design.header === 'stacked' ? '1px solid #c5b9b0' : undefined, fontSize: '.92em' }}>
    {railHasProfile ? <RailProfile header={header} intention={intention} showJob={showJob && design.header !== 'collage' && design.decor !== 'beige-circles'} design={design} english={english} /> : rightRail ? <><Heading value={english ? 'Personal Information' : '基本信息'} originalTitle="" design={design} /><Fields header={header} columns={1} /><Intention intention={intention} visible={showJob} vertical /></> : null}
    <ColumnDroppable id={rightRail ? COLUMN_RIGHT_ID : COLUMN_LEFT_ID}>
      <CrossColumnPlaceholder columnId={rightRail ? COLUMN_RIGHT_ID : COLUMN_LEFT_ID} />
      {sections(railSections, true, darkText)}
    </ColumnDroppable>
  </aside>
  const main = <main className="canva-main" style={{ paddingTop: design.header === 'rail' || design.header === 'stacked' ? 12 : 0 }}>
    {design.columns === 'left' && design.header !== 'split' ? design.header === 'collage' || design.header === 'rail-document' || design.header === 'stacked' || design.decor === 'beige-circles' ? <ReferenceHeader header={header} intention={intention} showJob={showJob && (design.header === 'collage' || design.decor === 'beige-circles')} design={design} english={english} includeFields={design.header === 'rail-document' || design.header === 'stacked'} includeAvatar={design.header === 'rail-document'} /> : <Masthead design={design} english={english} /> : null}
    <ColumnDroppable id={rightRail ? COLUMN_LEFT_ID : COLUMN_RIGHT_ID}>
      <CrossColumnPlaceholder columnId={rightRail ? COLUMN_LEFT_ID : COLUMN_RIGHT_ID} />
      {sections(mainSections)}
    </ColumnDroppable>
  </main>
  const content = <div data-template-padding-probe="true" className={`canva-page ${design.decor === 'beige-circles' ? 'canva-beige-circles' : ''} ${design.decor === 'outer-frame' ? 'canva-outer-frame' : ''}`} style={{ minHeight: '297mm', padding: `${padV}px ${padH}px`, ...(design.decor === 'outer-frame' ? { outline: `6px solid ${accent}`, outlineOffset: -6 } : {}), ...(design.decor === 'paper' ? { background: '#faf9f3' } : {}) }}>
    {design.header === 'vertical' ? <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, width: 25, height: 290, borderRadius: '0 0 16px 0', background: accent, color: onAccent, writingMode: 'vertical-rl', padding: '24px 5px', fontSize: '.7em', letterSpacing: '.14em' }}>PERSONAL RESUME</div> : null}
    {design.decor === 'edge-bands' ? <><span aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: 'var(--canva-soft)' }} /><span aria-hidden style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 8, background: 'var(--canva-soft)' }} /></> : null}
    {design.decor === 'circles' ? <span aria-hidden style={{ position: 'absolute', top: 0, left: 0, width: 130, height: 120, borderRadius: '0 0 100% 0', background: '#f7eec6', opacity: .65 }} /> : null}
    {design.decor === 'circles' ? <span aria-hidden style={{ position: 'absolute', bottom: 0, right: 0, width: 100, height: 180, borderRadius: '100% 0 0 0', background: '#dceaf9', opacity: .7 }} /> : null}
    {design.header === 'bookmark' ? <span aria-hidden style={{ position: 'absolute', left: Math.max(14, padH / 2), top: 0, width: 20, height: 34, background: accent, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 83%, 0 100%)' }} /> : null}
    {design.header === 'split' ? <header className="canva-header" style={{ display: 'grid', gridTemplateColumns: `${ratio}fr ${1 - ratio}fr`, marginBottom: gap(22, theme), background: 'var(--canva-soft)' }}>
      <div style={{ minWidth: 0 }}><Portrait header={header} design={design} large /></div>
      <div style={{ padding: '24px 22px', minWidth: 0 }}><Masthead design={design} english={english} /><Name header={header} /><Intention intention={intention} visible={showJob} /><Fields header={header} columns={1} /></div>
    </header> : rightRail ? <ReferenceHeader header={header} intention={intention} showJob={false} design={design} english={english} includeFields={false} /> : !split ? <ReferenceHeader header={header} intention={intention} showJob={showJob} design={design} english={english} /> : null}
    <SavedFacts header={header} />
    {split ? <div className="canva-column-grid" style={{ gridTemplateColumns: `${leftRatio}fr ${1 - leftRatio}fr`, gap: columnGap, alignItems: 'stretch', minHeight: design.columns === 'left' ? `calc(297mm - ${padV * 2}px)` : undefined }}>
      <div className="canva-physical-left" data-template-column="left" style={{ minWidth: 0 }}>{rightRail ? main : rail}</div>
      <div className="canva-physical-right" data-template-column="right" style={{ minWidth: 0 }}>{rightRail ? rail : main}</div>
    </div> : <div style={{ ...(design.decor === 'spine' ? { paddingLeft: 18, borderLeft: `1px dotted ${accent}` } : {}), ...(design.header === 'vertical' ? { paddingLeft: Math.max(0, 32 - padH) } : {}) }}>{sections(resume.sections)}</div>}
    {design.header === 'frame' ? <div aria-hidden style={{ textAlign: 'right', fontWeight: 800, letterSpacing: '.14em', color: accent, borderTop: `4px solid ${accent}`, marginTop: gap(18, theme) }}>RESUME</div> : null}
  </div>
  return <ResumeFrame resume={resume} theme={theme} className="canva-template-root" style={style} disableDnd={split}>
    <ReferenceStyles />
    {split ? <TwoColumnDndProvider leftSections={physicalLeft} rightSections={physicalRight} allSections={resume.sections} theme={theme} onMoveSection={moveSection} onMoveWithinSection={moveWithinSection} onMoveToSection={moveToSection} onMoveSectionToColumn={onMoveSectionToColumn} canMoveSectionToColumn={() => true}>{content}</TwoColumnDndProvider> : content}
    {header.modals}{intention.modals}
  </ResumeFrame>
}
