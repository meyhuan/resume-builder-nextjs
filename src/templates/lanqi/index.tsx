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

export default function LanqiTemplate({ resume, theme, sidebarSectionIds: externalIds, onSidebarSectionIdsChange }: TemplateProps): ReactElement {
  const header = useEditableHeader(resume.name, resume.baseInfo ?? null, 'lanqi')
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
  const left = useMemo(() => resume.sections.filter((section) => !sidebarSet.has(section.id)), [resume.sections, sidebarSet])
  const right = useMemo(() => resume.sections.filter((section) => sidebarSet.has(section.id)), [resume.sections, sidebarSet])

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
    setSidebar(column === 'right' ? [...validSidebarIds, id] : validSidebarIds.filter((item) => item !== id))
  }, [setSidebar, validSidebarIds])

  const showJob = resume.jobIntentionVisible ?? job.fields.length > 0
  const variables: Variables = {
    minHeight: '297mm', background: '#fff', color: theme.textColor,
    fontFamily: theme.fontFamily, fontSize: `${theme.fontSize}px`,
    '--lanqi-accent': theme.primaryColor || '#7899b9',
    '--lanqi-line-height': `${theme.lineHeight}`,
    '--lanqi-spacing': `${theme.spacingScale}`,
    '--lanqi-print-padding': `${theme.pagePaddingVertical}mm`,
  }
  return <ResumeFrame resume={resume} theme={theme} className="lanqi-resume" style={variables} disableDnd>
    <style>{`
      .lanqi-page { box-sizing:border-box; min-height:297mm; overflow-wrap:anywhere; }
      .lanqi-mast { display:flex; align-items:center; gap:12px; padding:14px 19px 9px; color:#55677a; font-size:.66em; letter-spacing:.14em; }
      .lanqi-mast::before, .lanqi-mast::after { content:''; height:8px; background:var(--lanqi-accent); }
      .lanqi-mast::before { flex:1; }
      .lanqi-mast::after { width:24px; }
      .lanqi-grid { display:grid; grid-template-columns:minmax(0,68fr) minmax(0,32fr); gap:14px; padding:0 19px 24px; }
      .lanqi-main, .lanqi-aside { min-width:0; }
      .lanqi-contacts { display:flex; flex-wrap:wrap; gap:3px 9px; padding:9px 10px; border-top:2px solid var(--lanqi-accent); background:#f5f7f8; cursor:pointer; font-size:.72em; line-height:1.55; }
      .lanqi-contacts > * { max-width:100%; overflow-wrap:anywhere; }
      .lanqi-section { position:relative; margin-top:calc(12px * var(--lanqi-spacing)); padding:10px 10px 12px; border-top:3px solid #bbcede; background:#f5f7f8; break-inside:auto; }
      .lanqi-section h2 { margin:0 0 8px; color:var(--lanqi-accent); line-height:1.4; font-weight:760; }
      .lanqi-section-body { min-width:0; }
      .lanqi-block-head { display:flex; flex-wrap:wrap; gap:2px 7px; align-items:baseline; margin-bottom:3px; break-after:avoid; }
      .lanqi-block-title { font-size:.94em; font-weight:720; }
      .lanqi-block-subtitle, .lanqi-block-date { color:#64717a; font-size:.81em; }
      .lanqi-block-date { margin-left:auto; white-space:nowrap; }
      .lanqi-rich, .lanqi-rich p, .lanqi-rich li { line-height:var(--lanqi-line-height); }
      .lanqi-rich p { margin:0; }
      .lanqi-rich ul, .lanqi-rich ol { margin:0; padding-left:1.4em; }
      .lanqi-rich li { margin:0; }
      .lanqi-aside { background:#eef1f4; padding:15px 13px 22px; }
      .lanqi-avatar { width:${106 * header.avatarScale}px; height:${122 * header.avatarScale}px; margin:0 auto 10px; background:#d8e0e8; }
      .lanqi-name { margin:0 0 6px; font-size:1.55em; line-height:1.2; font-weight:780; overflow-wrap:anywhere; }
      .lanqi-name-rule { height:2px; width:35px; margin:0 0 11px; background:var(--lanqi-accent); }
      .lanqi-job { font-size:.72em; line-height:1.58; cursor:pointer; }
      .lanqi-job > * { position:relative; display:block; overflow-wrap:anywhere; }
      .lanqi-aside-section { position:relative; margin-top:calc(16px * var(--lanqi-spacing)); padding-top:8px; border-top:1px solid #b7c7d6; break-inside:avoid; }
      .lanqi-aside-section h2 { margin:0 0 7px; color:#475569; font-size:.86em; line-height:1.4; font-weight:750; }
      .lanqi-aside-section [data-resume-block] { font-size:.76em; }
      .lanqi-actions { position:absolute; z-index:3; top:-21px; right:0; display:flex; gap:3px; padding:2px; border:1px solid #bcc9d6; border-radius:4px; background:#fff; }
      .lanqi-actions button { display:grid; place-items:center; width:23px; height:23px; border:0; background:transparent; cursor:pointer; }
      .lanqi-actions button:hover { background:#e7eff5; }
      .lanqi-resume [data-resume-block] { break-inside:auto; }
      @media print {
        .lanqi-resume, .lanqi-page { min-height:calc(297mm - 2 * var(--lanqi-print-padding) - 2px) !important; overflow:visible !important; }
        .lanqi-resume p, .lanqi-resume li { orphans:2; widows:2; }
      }
    `}</style>
    <TwoColumnDndProvider leftSections={left} rightSections={right} allSections={resume.sections} theme={theme}
      onMoveSection={moveSection} onMoveWithinSection={moveBlockInSection}
      onMoveToSection={moveBlockToSection} onMoveSectionToColumn={moveToColumn}
      canMoveSectionToColumn={isTextOnlySection}>
      <div className="lanqi-page" data-template-padding-probe="true"
        style={{ padding: `${mmToPx(theme.pagePaddingVertical)}px ${mmToPx(theme.pagePaddingHorizontal)}px` }}>
        <div className="lanqi-mast" aria-hidden="true"><span>PERSONAL RESUME</span></div>
        <div className="lanqi-grid">
          <ColumnDroppable id={COLUMN_LEFT_ID}>
            <main className="lanqi-main" data-template-column="left">
              <div className="lanqi-contacts" data-template-base-info-trigger="true" role="button" tabIndex={0}
                onClick={header.openEditModal} onKeyDown={(event) => { if (event.key === 'Enter') header.openEditModal() }}>
                {header.fields.map((field) => <FieldChip key={field.key} field={field} header={header}>
                  <span>{field.label}：{field.value}</span>
                </FieldChip>)}
                {header.fields.length === 0 && <span>＋ 编辑基本信息</span>}
              </div>
              {left.map((section) => <SortableSection key={section.id} sectionId={section.id}>
                {(drag) => <LanqiSection section={section} drag={drag} theme={theme} />}
              </SortableSection>)}
              <CrossColumnPlaceholder columnId={COLUMN_LEFT_ID} />
            </main>
          </ColumnDroppable>
          <ColumnDroppable id={COLUMN_RIGHT_ID}>
            <aside className="lanqi-aside" data-template-column="right">
              <AvatarSlot header={header} className="lanqi-avatar" placeholderSize={40} placeholderColor="#9bacbb" />
              <EditableText as="h1" value={header.name} onCommit={header.onCommitName} className="lanqi-name" />
              <div className="lanqi-name-rule" aria-hidden="true" />
              {showJob && job.fields.length > 0 && <div className="lanqi-job" data-template-job-intention-trigger="true" data-template-job-intention-layout="header"
                role="button" tabIndex={0} onClick={job.openEditModal}
                onKeyDown={(event) => { if (event.key === 'Enter') job.openEditModal() }}>
                {job.fields.map((field) => <span key={field.key} onMouseEnter={() => job.setHoveredField(field.key)}
                  onMouseLeave={() => job.setHoveredField(null)}>{field.label}：{field.value}
                  {job.hoveredField === field.key && <button type="button" className="absolute -right-2 -top-2 bg-white text-red-500 print:hidden"
                    aria-label={`删除 ${field.label}`} onClick={(event) => { event.stopPropagation(); job.deleteField(field.key) }}><X size={12} /></button>}
                </span>)}
              </div>}
              {right.map((section) => <SortableSection key={section.id} sectionId={section.id}>
                {(drag) => <LanqiSection section={section} drag={drag} theme={theme} side />}
              </SortableSection>)}
              <CrossColumnPlaceholder columnId={COLUMN_RIGHT_ID} />
            </aside>
          </ColumnDroppable>
        </div>
      </div>
    </TwoColumnDndProvider>
    {header.modals}
    {job.modals}
  </ResumeFrame>
}

function LanqiSection({ section, drag, theme, side = false }: { section: Section; drag: DragHandleProps; theme: ThemeTokens; side?: boolean }): ReactElement {
  const edit = useEditableSection(section)
  const attach = (node: HTMLButtonElement | null): void => { drag.ref(node) }
  return <section className={side ? 'lanqi-aside-section group/section' : 'lanqi-section group/section'}
    data-template-section="true" data-template-section-title={section.title}
    onMouseEnter={() => edit.setHovered(true)} onMouseLeave={() => edit.setHovered(false)}>
    <SectionTitleText as="h2" value={edit.displayTitle} onCommit={edit.canEditTitle ? edit.onCommitTitle : undefined}
      style={{ fontSize: `${(side ? .86 : 1.03) * (theme.titleScale ?? 1)}em` }} />
    <div className="lanqi-actions print:hidden" style={{ opacity: edit.isHovered ? 1 : 0, pointerEvents: edit.isHovered ? 'auto' : 'none' }}>
      <button type="button" title="拖动" aria-label="拖动" ref={attach} {...drag.attributes as Record<string, unknown>} {...drag.listeners as Record<string, unknown>}><GripVertical size={14} /></button>
      {!edit.isTextOnly && <button type="button" title="添加" aria-label="添加内容" onClick={edit.onAddBlock}><Plus size={14} /></button>}
      <button type="button" title="删除" aria-label="删除区块" onClick={edit.onRequestDelete}><Trash2 size={14} /></button>
    </div>
    <div className="lanqi-section-body" data-template-body-text="true">
      <BlockList section={edit} themeColor={theme.primaryColor} spacingScale={theme.spacingScale}
        rendererStyles={{ header:'lanqi-block-head', title:{className:'lanqi-block-title'},
          subtitle:{className:'lanqi-block-subtitle'}, dateRange:{className:'lanqi-block-date'},
          content:'lanqi-rich', contentColor:theme.textColor }} />
    </div>
    <DeleteSectionDialog open={edit.isDeleteDialogOpen} sectionTitle={edit.displayTitle}
      onOpenChange={edit.setDeleteDialogOpen} onConfirm={edit.confirmDelete} />
  </section>
}
