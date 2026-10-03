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

export default function MixuTemplate({ resume, theme, sidebarSectionIds: externalIds, onSidebarSectionIdsChange }: TemplateProps): ReactElement {
  const header = useEditableHeader(resume.name, resume.baseInfo ?? null)
  const job = useEditableJobIntention(resume.jobIntention)
  const moveSection = useAppStore((state) => state.moveSection)
  const moveBlockInSection = useAppStore((state) => state.moveBlockInSection)
  const moveBlockToSection = useAppStore((state) => state.moveBlockToSection)
  const sectionIds = useMemo(() => resume.sections.map((section) => section.id), [resume.sections])
  const sectionIdSet = useMemo(() => new Set(sectionIds), [sectionIds])
  const defaults = useMemo(() => resume.sections.filter(isTextOnlySection).map((section) => section.id), [resume.sections])
  const [localIds, setLocalIds] = useState<readonly string[]>(defaults)
  const resumeIdRef = useRef(resume.id)
  const knownIdsRef = useRef<ReadonlySet<string>>(sectionIdSet)
  const sidebarIds = externalIds ?? localIds
  const validSidebarIds = useMemo(
    () => sidebarIds.filter((id, index) => sectionIdSet.has(id) && sidebarIds.indexOf(id) === index),
    [sidebarIds, sectionIdSet],
  )
  const sidebarSet = useMemo(() => new Set(validSidebarIds), [validSidebarIds])
  const left = useMemo(() => resume.sections.filter((section) => sidebarSet.has(section.id)), [resume.sections, sidebarSet])
  const right = useMemo(() => resume.sections.filter((section) => !sidebarSet.has(section.id)), [resume.sections, sidebarSet])

  useEffect(() => {
    if (externalIds) {
      resumeIdRef.current = resume.id
      knownIdsRef.current = sectionIdSet
      return
    }
    const changedResume = resumeIdRef.current !== resume.id
    const knownIds = knownIdsRef.current
    resumeIdRef.current = resume.id
    knownIdsRef.current = sectionIdSet
    setLocalIds((current) => {
      if (changedResume) return defaults
      const next = current.filter((id, index) => sectionIdSet.has(id) && current.indexOf(id) === index)
      for (const id of defaults) if (!knownIds.has(id) && !next.includes(id)) next.push(id)
      return next
    })
  }, [defaults, externalIds, resume.id, sectionIdSet])

  const setSidebar = useCallback((ids: readonly string[]) => {
    const next = ids.filter((id, index) => sectionIdSet.has(id) && ids.indexOf(id) === index)
    setLocalIds(next)
    onSidebarSectionIdsChange?.(next)
  }, [onSidebarSectionIdsChange, sectionIdSet])

  const moveToColumn = useCallback((id: string, column: 'left' | 'right') => {
    setSidebar(column === 'left' ? [...validSidebarIds, id] : validSidebarIds.filter((item) => item !== id))
  }, [setSidebar, validSidebarIds])

  const accent = theme.primaryColor || '#2a201f'
  const showJob = resume.jobIntentionVisible ?? job.fields.length > 0
  const variables: Variables = {
    minHeight: '297mm',
    background: '#fff',
    color: theme.textColor,
    fontFamily: theme.fontFamily,
    fontSize: `${theme.fontSize}px`,
    '--mixu-accent': accent,
    '--mixu-line-height': `${theme.lineHeight}`,
    '--mixu-spacing': `${theme.spacingScale}`,
    '--mixu-print-padding': `${theme.pagePaddingVertical}mm`,
  }

  return (
    <ResumeFrame resume={resume} theme={theme} className="mixu-resume" style={variables} disableDnd>
      <style>{`
        .mixu-page { box-sizing:border-box; display:grid; grid-template-columns:31% minmax(0,1fr); min-height:297mm; overflow-wrap:anywhere; }
        .mixu-side { min-width:0; background:#eeece8; padding:22px 18px 30px; }
        .mixu-avatar { width:118px; height:118px; margin:0 auto 18px; border-radius:50%; background:#d8d4ce; }
        .mixu-name { margin:0; font-size:1.75em; line-height:1.2; font-weight:760; letter-spacing:.04em; }
        .mixu-title-rule { width:34px; height:2px; margin:12px 0 13px; background:var(--mixu-accent); }
        .mixu-fields { font-size:.77em; line-height:1.6; cursor:pointer; }
        .mixu-fields > * { display:block; overflow-wrap:anywhere; }
        .mixu-side-label { margin:calc(18px * var(--mixu-spacing)) 0 7px; padding-top:9px; border-top:1px solid #c9c5bf; color:var(--mixu-accent); font-size:.88em; font-weight:750; }
        .mixu-job { font-size:.77em; line-height:1.6; cursor:pointer; }
        .mixu-job > * { display:block; position:relative; overflow-wrap:anywhere; }
        .mixu-left-section { position:relative; margin-top:calc(17px * var(--mixu-spacing)); padding-top:9px; border-top:1px solid #c9c5bf; break-inside:avoid; }
        .mixu-left-section h2 { margin:0 0 8px; color:var(--mixu-accent); font-size:.88em; line-height:1.4; font-weight:750; }
        .mixu-left-section [data-resume-block] { font-size:.77em; }
        .mixu-main { min-width:0; padding:20px 24px 28px; }
        .mixu-kicker { margin:0 0 17px; padding-bottom:6px; border-bottom:1px solid #aaa49d; color:#867e7a; font-size:.63em; letter-spacing:.19em; text-align:right; }
        .mixu-section { position:relative; margin-top:calc(22px * var(--mixu-spacing)); break-inside:auto; }
        .mixu-section:first-child { margin-top:0; }
        .mixu-section-head { display:grid; grid-template-columns:auto minmax(0,1fr); gap:10px; align-items:baseline; padding-bottom:7px; border-bottom:1px solid #c9c5bf; break-after:avoid; }
        .mixu-number { color:var(--mixu-accent); font-size:2.1em; line-height:1; font-weight:350; letter-spacing:-.07em; }
        .mixu-section-head h2 { margin:0; color:var(--mixu-accent); font-size:1.04em; line-height:1.4; font-weight:730; }
        .mixu-section-body { padding:calc(9px * var(--mixu-spacing)) 0 0 1px; }
        .mixu-block-head { display:flex; flex-wrap:wrap; gap:2px 8px; align-items:baseline; margin-bottom:3px; break-after:avoid; }
        .mixu-block-title { font-size:.94em; font-weight:720; }
        .mixu-block-subtitle, .mixu-block-date { color:#625d59; font-size:.82em; }
        .mixu-block-date { margin-left:auto; white-space:nowrap; }
        .mixu-rich p, .mixu-rich li { line-height:var(--mixu-line-height); }
        .mixu-rich p { margin:0; }
        .mixu-rich ul, .mixu-rich ol { margin:0; padding-left:1.4em; }
        .mixu-rich li { margin:0; }
        .mixu-actions { position:absolute; z-index:3; right:0; top:-23px; display:flex; gap:3px; padding:2px; border:1px solid #c9c5bf; border-radius:4px; background:#fff; }
        .mixu-actions button { display:grid; place-items:center; width:23px; height:23px; border:0; border-radius:2px; background:transparent; cursor:pointer; }
        .mixu-actions button:hover { background:#eeeae5; }
        .mixu-left-section .mixu-actions { right:-1px; }
        .mixu-resume [data-resume-block] { break-inside:auto; }
        @media print {
          .mixu-resume, .mixu-page { min-height:calc(297mm - 2 * var(--mixu-print-padding) - 2px) !important; overflow:visible !important; }
          .mixu-side { min-height:0 !important; }
          .mixu-resume p, .mixu-resume li { orphans:2; widows:2; }
        }
      `}</style>
      <TwoColumnDndProvider
        leftSections={left} rightSections={right} allSections={resume.sections} theme={theme}
        onMoveSection={moveSection} onMoveWithinSection={moveBlockInSection}
        onMoveToSection={moveBlockToSection} onMoveSectionToColumn={moveToColumn}
        canMoveSectionToColumn={isTextOnlySection}
      >
        <div className="mixu-page">
          <ColumnDroppable id={COLUMN_LEFT_ID}>
            <aside className="mixu-side" data-template-column="left" style={{ minHeight: '100%' }}>
              <AvatarSlot header={header} className="mixu-avatar" placeholderSize={48} placeholderColor="#aaa49d" />
              <EditableText as="h1" value={header.name} onCommit={header.onCommitName} className="mixu-name" />
              <div className="mixu-title-rule" aria-hidden="true" />
              <div className="mixu-fields" data-template-base-info-trigger="true" role="button" tabIndex={0}
                onClick={header.openEditModal}
                onKeyDown={(event) => { if (event.key === 'Enter') header.openEditModal() }}>
                {header.fields.map((field) => <FieldChip key={field.key} field={field} header={header}><span>{field.label}：{field.value}</span></FieldChip>)}
                {header.fields.length === 0 && <span>＋ 编辑基本信息</span>}
              </div>
              {showJob && job.fields.length > 0 && <>
                <div className="mixu-side-label">求职意向</div>
                <div className="mixu-job" data-template-job-intention-trigger="true" role="button" tabIndex={0}
                  onClick={job.openEditModal} onKeyDown={(event) => { if (event.key === 'Enter') job.openEditModal() }}>
                  {job.fields.map((field) => <span key={field.key} onMouseEnter={() => job.setHoveredField(field.key)} onMouseLeave={() => job.setHoveredField(null)}>
                    {field.label}：{field.value}
                    {job.hoveredField === field.key && <button type="button" className="absolute -right-2 -top-2 bg-white text-red-500 print:hidden" aria-label={`删除 ${field.label}`}
                      onClick={(event) => { event.stopPropagation(); job.deleteField(field.key) }}><X size={12} /></button>}
                  </span>)}
                </div>
              </>}
              {left.map((section) => <SortableSection key={section.id} sectionId={section.id}>
                {(drag) => <MixuSection section={section} drag={drag} theme={theme} side />}
              </SortableSection>)}
              <CrossColumnPlaceholder columnId={COLUMN_LEFT_ID} />
            </aside>
          </ColumnDroppable>
          <ColumnDroppable id={COLUMN_RIGHT_ID}>
            <main className="mixu-main" data-template-column="right" data-template-padding-probe="true" style={{ padding: `${mmToPx(theme.pagePaddingVertical)}px ${mmToPx(theme.pagePaddingHorizontal)}px` }}>
              <div className="mixu-kicker" aria-hidden="true">CURRICULUM VITAE</div>
              {right.map((section, index) => <SortableSection key={section.id} sectionId={section.id}>
                {(drag) => <MixuSection section={section} index={index} drag={drag} theme={theme} />}
              </SortableSection>)}
              <CrossColumnPlaceholder columnId={COLUMN_RIGHT_ID} />
            </main>
          </ColumnDroppable>
        </div>
      </TwoColumnDndProvider>
      {header.modals}
      {job.modals}
    </ResumeFrame>
  )
}

function MixuSection({ section, index, drag, theme, side = false }: {
  section: Section; index?: number; drag: DragHandleProps; theme: ThemeTokens; side?: boolean
}): ReactElement {
  const edit = useEditableSection(section)
  const attach = (node: HTMLButtonElement | null): void => { drag.ref(node) }
  return <section className={side ? 'mixu-left-section group/section' : 'mixu-section group/section'}
    data-template-section="true" data-template-section-title={section.title}
    onMouseEnter={() => edit.setHovered(true)} onMouseLeave={() => edit.setHovered(false)}>
    {side ? <SectionTitleText as="h2" value={edit.displayTitle} onCommit={edit.canEditTitle ? edit.onCommitTitle : undefined}
      style={{ fontSize: `${.88 * (theme.titleScale ?? 1)}em` }} />
      : <div className="mixu-section-head"><span className="mixu-number" aria-label={`第 ${(index ?? 0) + 1} 节`}>{String((index ?? 0) + 1).padStart(2, '0')}.</span>
        <SectionTitleText as="h2" value={edit.displayTitle} onCommit={edit.canEditTitle ? edit.onCommitTitle : undefined}
          style={{ fontSize: `${1.04 * (theme.titleScale ?? 1)}em` }} /></div>}
    <div className="mixu-actions print:hidden" style={{ opacity: edit.isHovered ? 1 : 0, pointerEvents: edit.isHovered ? 'auto' : 'none' }}>
      <button type="button" title="拖动" aria-label="拖动" ref={attach} {...drag.attributes as Record<string, unknown>} {...drag.listeners as Record<string, unknown>}><GripVertical size={14} /></button>
      {!edit.isTextOnly && <button type="button" title="添加" aria-label="添加内容" onClick={edit.onAddBlock}><Plus size={14} /></button>}
      <button type="button" title="删除" aria-label="删除区块" onClick={edit.onRequestDelete}><Trash2 size={14} /></button>
    </div>
    <div className={side ? 'mixu-side-body' : 'mixu-section-body'} data-template-body-text="true">
      <BlockList section={edit} themeColor={theme.primaryColor} spacingScale={theme.spacingScale}
        rendererStyles={{ header:'mixu-block-head', title:{className:'mixu-block-title'}, subtitle:{className:'mixu-block-subtitle'},
          dateRange:{className:'mixu-block-date'}, content:'mixu-rich', contentColor:theme.textColor }} />
    </div>
    <DeleteSectionDialog open={edit.isDeleteDialogOpen} sectionTitle={edit.displayTitle}
      onOpenChange={edit.setDeleteDialogOpen} onConfirm={edit.confirmDelete} />
  </section>
}
