'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import { GripVertical, Plus, Trash2, X } from 'lucide-react'
import { SectionTitleText } from '@/components/sections/section-title-text'
import type { Section } from '@/entities/resume/section'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import { useAppStore } from '@/state/store'
import {
  AvatarSlot, BlockList, DeleteSectionDialog, EditableText, FieldChip,
  ResumeFrame, SortableSection, mmToPx, useEditableHeader,
  useEditableJobIntention, useEditableSection,
} from '@/templates/_core'
import type { DragHandleProps, TemplateProps } from '@/templates/_core'
import TwoColumnDndProvider, {
  ColumnDroppable, CrossColumnPlaceholder, COLUMN_LEFT_ID, COLUMN_RIGHT_ID,
  isTextOnlySection,
} from '@/templates/warm/two-column-dnd-provider'

type Variables = CSSProperties & Record<`--${string}`, string | number>

/** Canva EAF_ksaKwqY 灰阶横向介绍与窄边栏的可编辑中文适配。 */
export default function HuiyingTemplate({ resume, theme, sidebarSectionIds: externalIds, onSidebarSectionIdsChange }: TemplateProps): ReactElement {
  const header = useEditableHeader(resume.name, resume.baseInfo ?? null, 'huiying')
  const job = useEditableJobIntention(resume.jobIntention)
  const moveSection = useAppStore((state) => state.moveSection)
  const moveBlockInSection = useAppStore((state) => state.moveBlockInSection)
  const moveBlockToSection = useAppStore((state) => state.moveBlockToSection)
  const sectionIds = useMemo(() => new Set(resume.sections.map((section) => section.id)), [resume.sections])
  const defaults = useMemo(() => resume.sections.filter(isTextOnlySection).map((section) => section.id), [resume.sections])
  const [localIds, setLocalIds] = useState<readonly string[]>(defaults)
  const resumeIdRef = useRef(resume.id)
  const knownIdsRef = useRef<ReadonlySet<string>>(sectionIds)
  const sidebarIds = externalIds ?? localIds
  const validSidebarIds = useMemo(
    () => sidebarIds.filter((id, index) => sectionIds.has(id) && sidebarIds.indexOf(id) === index),
    [sidebarIds, sectionIds],
  )
  const sidebarSet = useMemo(() => new Set(validSidebarIds), [validSidebarIds])
  const left = useMemo(() => resume.sections.filter((section) => sidebarSet.has(section.id)), [resume.sections, sidebarSet])
  const right = useMemo(() => resume.sections.filter((section) => !sidebarSet.has(section.id)), [resume.sections, sidebarSet])

  useEffect(() => {
    if (externalIds) {
      resumeIdRef.current = resume.id
      knownIdsRef.current = sectionIds
      return
    }
    const changedResume = resumeIdRef.current !== resume.id
    const knownIds = knownIdsRef.current
    resumeIdRef.current = resume.id
    knownIdsRef.current = sectionIds
    setLocalIds((current) => {
      if (changedResume) return defaults
      const next = current.filter((id, index) => sectionIds.has(id) && current.indexOf(id) === index)
      for (const id of defaults) if (!knownIds.has(id) && !next.includes(id)) next.push(id)
      return next
    })
  }, [defaults, externalIds, resume.id, sectionIds])

  const setSidebar = useCallback((ids: readonly string[]) => {
    const next = ids.filter((id, index) => sectionIds.has(id) && ids.indexOf(id) === index)
    setLocalIds(next)
    onSidebarSectionIdsChange?.(next)
  }, [onSidebarSectionIdsChange, sectionIds])
  const moveToColumn = useCallback((id: string, column: 'left' | 'right') => {
    setSidebar(column === 'left' ? [...validSidebarIds, id] : validSidebarIds.filter((item) => item !== id))
  }, [setSidebar, validSidebarIds])

  const showJob = resume.jobIntentionVisible ?? job.fields.length > 0
  const showAvatar = header.baseInfo?.showAvatar !== false
  const showHero = showAvatar || (showJob && job.fields.length > 0)
  const variables: Variables = {
    minHeight: '297mm', background: '#fff', color: theme.textColor,
    fontFamily: theme.fontFamily, fontSize: `${theme.fontSize}px`,
    '--huiying-accent': theme.primaryColor || '#333333',
    '--huiying-line-height': `${theme.lineHeight}`,
    '--huiying-spacing': `${theme.spacingScale}`,
    '--huiying-print-padding': `${theme.pagePaddingVertical}mm`,
  }
  return <ResumeFrame resume={resume} theme={theme} className="huiying-resume" style={variables} disableDnd>
    <style>{`
      .huiying-page { box-sizing:border-box; min-height:297mm; overflow-wrap:anywhere; }
      .huiying-hero { position:relative; display:grid; grid-template-columns:31% minmax(0,1fr); gap:18px; min-height:205px; padding:9px 25px 19px; }
      .huiying-hero::before { content:''; position:absolute; inset:92px 0 0; background:#e3e3e3; }
      .huiying-hero > * { position:relative; z-index:1; }
      .huiying-hero.huiying-no-avatar { display:block; min-height:0; padding-top:10px; padding-bottom:13px; }
      .huiying-hero.huiying-no-avatar::before { inset:0; }
      .huiying-no-avatar .huiying-hero-copy { padding-top:0; }
      .huiying-avatar { width:${166 * header.avatarScale}px; height:${166 * header.avatarScale}px; margin:0 auto; border-radius:50%; background:#d7dce0; }
      .huiying-avatar img { border-radius:50%; }
      .huiying-hero-copy { min-width:0; padding-top:22px; }
      .huiying-job { display:flex; flex-wrap:wrap; align-items:baseline; gap:8px 13px; min-height:49px; cursor:pointer; }
      .huiying-job-label { display:inline-block; padding:5px 14px; border-radius:100px; color:#fff; background:var(--huiying-accent); font-size:1.13em; font-weight:760; letter-spacing:.1em; white-space:nowrap; }
      .huiying-job-fields { display:flex; flex-wrap:wrap; gap:4px 11px; font-size:1.12em; font-weight:720; }
      .huiying-job-fields > span { position:relative; }
      .huiying-hero-detail { display:flex; flex-wrap:wrap; align-content:center; gap:8px 16px; min-height:75px; padding:13px 0 0; cursor:pointer; font-size:.94em; line-height:var(--huiying-line-height); }
      .huiying-hero-detail > span { overflow-wrap:anywhere; }
      .huiying-columns { display:grid; grid-template-columns:minmax(0,29fr) minmax(0,71fr); gap:25px; padding:27px 25px 28px; }
      .huiying-aside, .huiying-main { min-width:0; }
      .huiying-aside { padding:27px 18px 30px; background:#e3e3e3; }
      .huiying-name { margin:0 0 26px; font-size:2.35em; font-weight:790; line-height:1.18; letter-spacing:.07em; }
      .huiying-contact-heading { margin:0 0 14px; text-align:center; font-size:1.12em; font-weight:730; }
      .huiying-contacts { display:grid; gap:6px; padding-bottom:17px; border-bottom:1px solid #717171; cursor:pointer; font-size:.72em; line-height:1.48; }
      .huiying-contacts > * { min-width:0; overflow-wrap:anywhere; }
      .huiying-aside-section { position:relative; padding:17px 0; border-bottom:1px solid #717171; break-inside:auto; }
      .huiying-aside-section h2 { margin:0 0 11px; text-align:center; font-weight:760; line-height:1.35; }
      .huiying-aside-section [data-resume-block] { font-size:.76em; }
      .huiying-aside-section [data-resume-block] + [data-resume-block] { margin-top:10px; }
      .huiying-section { position:relative; padding:14px 0 calc(18px * var(--huiying-spacing)); border-bottom:1px solid #333; break-inside:auto; }
      .huiying-section h2 { margin:0 0 13px; font-weight:780; line-height:1.35; }
      .huiying-section-body { min-width:0; }
      .huiying-block-head { display:flex; flex-wrap:wrap; align-items:baseline; gap:2px 8px; margin-bottom:4px; break-after:avoid; }
      .huiying-block-title { font-size:.98em; font-weight:720; }
      .huiying-block-subtitle, .huiying-block-date { color:#4b4b4b; font-size:.85em; }
      .huiying-block-date { margin-left:auto; white-space:nowrap; }
      .huiying-rich, .huiying-rich p, .huiying-rich li { line-height:var(--huiying-line-height); }
      .huiying-rich p { margin:0; }
      .huiying-rich ul, .huiying-rich ol { margin:0; padding-left:1.4em; }
      .huiying-rich li { margin:0; }
      .huiying-actions { position:absolute; z-index:2; right:0; top:-11px; display:flex; gap:2px; padding:2px; border:1px solid #b5b5b5; border-radius:4px; background:#fff; }
      .huiying-actions button { display:grid; place-items:center; width:23px; height:23px; border:0; background:transparent; cursor:pointer; }
      .huiying-actions button:hover { background:#eee; }
      .huiying-resume [data-resume-block] { break-inside:auto; }
      @media print {
        .huiying-resume, .huiying-page { min-height:calc(297mm - 2 * var(--huiying-print-padding) - 2px) !important; overflow:visible !important; }
        .huiying-resume p, .huiying-resume li { orphans:2; widows:2; }
      }
    `}</style>
    <TwoColumnDndProvider leftSections={left} rightSections={right} allSections={resume.sections} theme={theme}
      onMoveSection={moveSection} onMoveWithinSection={moveBlockInSection}
      onMoveToSection={moveBlockToSection} onMoveSectionToColumn={moveToColumn}
      canMoveSectionToColumn={isTextOnlySection}>
      <div className="huiying-page" data-template-padding-probe="true"
        style={{ padding: `${mmToPx(theme.pagePaddingVertical)}px ${mmToPx(theme.pagePaddingHorizontal)}px` }}>
        {showHero && <header className={showAvatar ? 'huiying-hero' : 'huiying-hero huiying-no-avatar'}>
          <AvatarSlot header={header} className="huiying-avatar" placeholderSize={46} placeholderColor="#9ca3af" />
          <div className="huiying-hero-copy">
            {showJob && job.fields.length > 0 && <div className="huiying-job" data-template-job-intention-trigger="true"
              data-template-job-intention-layout="header" role="button" tabIndex={0}
              onClick={job.openEditModal} onKeyDown={(event) => { if (event.key === 'Enter') job.openEditModal() }}>
              <span className="huiying-job-label">求职意向</span>
              <span className="huiying-job-fields">{job.fields.slice(0, 1).map((field) => <span key={field.key}
                onMouseEnter={() => job.setHoveredField(field.key)} onMouseLeave={() => job.setHoveredField(null)}>
                {field.value}
                {job.hoveredField === field.key && <button type="button" className="absolute -right-2 -top-2 bg-white text-red-500 print:hidden"
                  aria-label={`删除 ${field.label}`} onClick={(event) => { event.stopPropagation(); job.deleteField(field.key) }}><X size={12} /></button>}
              </span>)}</span>
            </div>}
            {showJob && job.fields.length > 0 && <div className="huiying-hero-detail"
              role="button" tabIndex={0} aria-label="编辑求职意向详情"
              onClick={job.openEditModal} onKeyDown={(event) => { if (event.key === 'Enter') job.openEditModal() }}>
              {(job.fields.length > 1 ? job.fields.slice(1) : job.fields).map((field) =>
                <span key={field.key}>{field.label}：{field.value}</span>)}
            </div>}
          </div>
        </header>}
        <div className="huiying-columns">
          <ColumnDroppable id={COLUMN_LEFT_ID}>
            <aside className="huiying-aside" data-template-column="left">
              <EditableText as="h1" value={header.name} onCommit={header.onCommitName} className="huiying-name" />
              <div className="huiying-contact-heading">联系方式</div>
              <div className="huiying-contacts" data-template-base-info-trigger="true" role="button" tabIndex={0}
                onClick={header.openEditModal} onKeyDown={(event) => { if (event.key === 'Enter') header.openEditModal() }}>
                {header.fields.map((field) => <FieldChip key={field.key} field={field} header={header}>
                  <span>{field.label}：{field.value}</span>
                </FieldChip>)}
                {header.fields.length === 0 && <span>＋ 编辑基本信息</span>}
              </div>
              {left.map((section) => <SortableSection key={section.id} sectionId={section.id}>
                {(drag) => <HuiyingSection section={section} drag={drag} theme={theme} side />}
              </SortableSection>)}
              <CrossColumnPlaceholder columnId={COLUMN_LEFT_ID} />
            </aside>
          </ColumnDroppable>
          <ColumnDroppable id={COLUMN_RIGHT_ID}>
            <main className="huiying-main" data-template-column="right">
              {right.map((section) => <SortableSection key={section.id} sectionId={section.id}>
                {(drag) => <HuiyingSection section={section} drag={drag} theme={theme} />}
              </SortableSection>)}
              <CrossColumnPlaceholder columnId={COLUMN_RIGHT_ID} />
            </main>
          </ColumnDroppable>
        </div>
      </div>
    </TwoColumnDndProvider>
    {header.modals}
    {job.modals}
  </ResumeFrame>
}

function HuiyingSection({ section, drag, theme, side = false }: { section: Section; drag: DragHandleProps; theme: ThemeTokens; side?: boolean }): ReactElement {
  const edit = useEditableSection(section)
  const attach = (node: HTMLButtonElement | null): void => { drag.ref(node) }
  return <section className={side ? 'huiying-aside-section group/section' : 'huiying-section group/section'}
    data-template-section="true" data-template-section-title={section.title}
    onMouseEnter={() => edit.setHovered(true)} onMouseLeave={() => edit.setHovered(false)}>
    <SectionTitleText as="h2" value={edit.displayTitle} onCommit={edit.canEditTitle ? edit.onCommitTitle : undefined}
      style={{ fontSize: `${(side ? .92 : 1.16) * (theme.titleScale ?? 1)}em` }} />
    <div className="huiying-actions print:hidden" style={{ opacity: edit.isHovered ? 1 : 0, pointerEvents: edit.isHovered ? 'auto' : 'none' }}>
      <button type="button" title="拖动" aria-label="拖动" ref={attach} {...drag.attributes as Record<string, unknown>} {...drag.listeners as Record<string, unknown>}><GripVertical size={14} /></button>
      {!edit.isTextOnly && <button type="button" title="添加" aria-label="添加内容" onClick={edit.onAddBlock}><Plus size={14} /></button>}
      <button type="button" title="删除" aria-label="删除区块" onClick={edit.onRequestDelete}><Trash2 size={14} /></button>
    </div>
    <div className="huiying-section-body" data-template-body-text="true">
      <BlockList section={edit} themeColor={theme.primaryColor} spacingScale={theme.spacingScale}
        className={side ? 'block' : undefined}
        rendererStyles={{ header:'huiying-block-head', title:{className:'huiying-block-title'},
          subtitle:{className:'huiying-block-subtitle'}, dateRange:{className:'huiying-block-date'},
          content:'huiying-rich', contentColor:theme.textColor }} />
    </div>
    <DeleteSectionDialog open={edit.isDeleteDialogOpen} sectionTitle={edit.displayTitle}
      onOpenChange={edit.setDeleteDialogOpen} onConfirm={edit.confirmDelete} />
  </section>
}
