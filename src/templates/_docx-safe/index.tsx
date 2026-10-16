'use client'

import type { CSSProperties, ReactElement } from 'react'
import { GripVertical, Plus, Trash2, X } from 'lucide-react'
import { SectionTitleText } from '@/components/sections/section-title-text'
import type { Section } from '@/entities/resume/section'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import {
  AvatarSlot,
  BlockList,
  DeleteSectionDialog,
  EditableText,
  FieldChip,
  ResumeFrame,
  SortableSection,
  contrastingInk,
  useEditableHeader,
  useEditableJobIntention,
  useEditableSection,
} from '@/templates/_core'
import type { DragHandleProps, EditableJobIntention, TemplateProps } from '@/templates/_core'

export type DocxSafeVariant = 'minimal' | 'columns' | 'sidebar'

const TEMPLATE_IDS: Record<DocxSafeVariant, string> = {
  minimal: 'canva-minimal',
  columns: 'canva-columns',
  sidebar: 'canva-sidebar',
}

function hasSidebarCandidate(section: Section): boolean {
  const title = section.title.toLowerCase()
  return section.blocks.every((block) => block.type === 'text' || block.type === 'list')
    || ['技能', '语言', '证书', '自我', '评价', '兴趣', 'skill', 'language', 'certificate'].some((keyword) => title.includes(keyword))
}

function sectionIdsForColumns(resume: TemplateProps['resume'], ids?: readonly string[]): Set<string> {
  if (ids && ids.length > 0) return new Set(ids)
  const candidates = resume.sections.filter(hasSidebarCandidate).slice(0, 2)
  return new Set(candidates.map((section) => section.id))
}

function FieldGroup({ header, dark = false }: { readonly header: ReturnType<typeof useEditableHeader>; readonly dark?: boolean }): ReactElement | null {
  if (header.fields.length === 0) return null
  return (
    <div className="docx-safe-fields" data-template-base-info-trigger="true" role="button" tabIndex={0}
      onClick={header.openEditModal}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); header.openEditModal() } }}>
      {header.fields.map((field) => (
        <FieldChip key={field.key} field={field} header={header} deleteColor={dark ? '#ffffff' : undefined} className="docx-safe-field">
          <span>{field.label}：{field.value}</span>
        </FieldChip>
      ))}
    </div>
  )
}

function JobFields({ job, vertical = false }: { readonly job: EditableJobIntention; readonly vertical?: boolean }): ReactElement | null {
  if (job.fields.length === 0) return null
  return (
    <div className={`docx-safe-job ${vertical ? 'docx-safe-job-vertical' : ''}`} data-template-job-intention-trigger="true"
      data-template-job-intention-layout="header" role="button" tabIndex={0}
      onClick={job.openEditModal}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); job.openEditModal() } }}>
      {job.fields.map((field) => (
        <span key={field.key} className="docx-safe-job-field" onMouseEnter={() => job.setHoveredField(field.key)} onMouseLeave={() => job.setHoveredField(null)}>
          {field.label}：<strong>{field.value}</strong>
          {job.hoveredField === field.key ? <button type="button" className="docx-safe-delete print:hidden" aria-label={`删除${field.label}`}
            onClick={(event) => { event.stopPropagation(); job.deleteField(field.key) }}><X size={12} /></button> : null}
        </span>
      ))}
    </div>
  )
}

function HeaderBlock({ header, job, dark = false, sidebar = false, showJob = true }: {
  readonly header: ReturnType<typeof useEditableHeader>
  readonly job: EditableJobIntention
  readonly dark?: boolean
  readonly sidebar?: boolean
  readonly showJob?: boolean
}): ReactElement {
  return (
    <header className={`docx-safe-header ${dark ? 'docx-safe-header-dark' : ''} ${sidebar ? 'docx-safe-header-sidebar' : ''}`}>
      {sidebar ? <AvatarSlot header={header} className="docx-safe-avatar docx-safe-avatar-sidebar" placeholderSize={46} placeholderColor="#dbeafe" /> : null}
      <div className="docx-safe-header-copy">
        <EditableText as="h1" value={header.name} onCommit={header.onCommitName} className="docx-safe-name" />
        {header.baseInfo?.title ? <div className="docx-safe-role">{header.baseInfo.title}</div> : null}
        {!sidebar ? <FieldGroup header={header} dark={dark} /> : null}
        {showJob ? <JobFields job={job} vertical={sidebar} /> : null}
      </div>
      {!sidebar ? <AvatarSlot header={header} className="docx-safe-avatar" placeholderSize={38} placeholderColor="#94a3b8" /> : null}
    </header>
  )
}

function SideHeader({ header, job }: { readonly header: ReturnType<typeof useEditableHeader>; readonly job: EditableJobIntention }): ReactElement {
  return (
    <div className="docx-safe-side-header">
      <AvatarSlot header={header} className="docx-safe-avatar docx-safe-avatar-side" placeholderSize={50} placeholderColor="#dbeafe" />
      <EditableText as="h1" value={header.name} onCommit={header.onCommitName} className="docx-safe-side-name" />
      {header.baseInfo?.title ? <div className="docx-safe-side-role">{header.baseInfo.title}</div> : null}
      <FieldGroup header={header} dark />
      {job.fields.length > 0 ? <JobFields job={job} vertical /> : null}
    </div>
  )
}

function SafeSection({ section, drag, theme, dark = false, variant }: { readonly section: Section; readonly drag: DragHandleProps; readonly theme: ThemeTokens; readonly dark?: boolean; readonly variant: DocxSafeVariant }): ReactElement {
  const edit = useEditableSection(section)
  const attachDragHandle = (element: HTMLButtonElement | null): void => { drag.ref(element) }
  const dragAttributes = drag.attributes as Record<string, unknown>
  const dragListeners = drag.listeners as Record<string, unknown>
  const headingStyle: CSSProperties = { fontSize: `${1.08 * (theme.titleScale ?? 1)}em`, color: dark ? '#ffffff' : theme.primaryColor, fontWeight: 760 }
  return (
    <section className={`docx-safe-section docx-safe-section-${variant} ${dark ? 'docx-safe-section-dark' : ''}`} data-template-section="true"
      data-template-section-title={section.title} onMouseEnter={() => edit.setHovered(true)} onMouseLeave={() => edit.setHovered(false)}>
      <div className="docx-safe-section-title-row">
        <SectionTitleText as="h2" value={edit.displayTitle} onCommit={edit.canEditTitle ? edit.onCommitTitle : undefined} style={headingStyle} />
        <span className="docx-safe-title-rule" aria-hidden="true" />
      </div>
      <div className="docx-safe-actions print:hidden" style={{ opacity: edit.isHovered ? 1 : 0, pointerEvents: edit.isHovered ? 'auto' : 'none' }}>
        <button type="button" title="拖动" aria-label="拖动" ref={attachDragHandle} {...dragAttributes} {...dragListeners}><GripVertical size={14} /></button>
        {!edit.isTextOnly ? <button type="button" title="添加" aria-label="添加内容" onClick={edit.onAddBlock}><Plus size={14} /></button> : null}
        <button type="button" title="删除" aria-label="删除区块" onClick={edit.onRequestDelete}><Trash2 size={14} /></button>
      </div>
      <div className="docx-safe-section-body" data-template-body-text="true">
        <BlockList section={edit} themeColor={theme.primaryColor} spacingScale={theme.spacingScale}
          rendererStyles={{
            header: 'docx-safe-block-header',
            title: { className: 'docx-safe-block-title', color: dark ? '#ffffff' : theme.textColor },
            subtitle: { className: 'docx-safe-block-subtitle', color: dark ? '#dbeafe' : '#475569' },
            dateRange: { className: 'docx-safe-block-date', color: dark ? '#dbeafe' : theme.primaryColor },
            content: 'docx-safe-rich', contentColor: dark ? '#f8fafc' : theme.textColor,
          }} />
      </div>
      <DeleteSectionDialog open={edit.isDeleteDialogOpen} sectionTitle={edit.displayTitle} onOpenChange={edit.setDeleteDialogOpen} onConfirm={edit.confirmDelete} />
    </section>
  )
}

function SectionList({ sections, theme, dark = false, variant }: { readonly sections: readonly Section[]; readonly theme: ThemeTokens; readonly dark?: boolean; readonly variant: DocxSafeVariant }): ReactElement {
  return <>{sections.map((section) => <SortableSection key={section.id} sectionId={section.id}>{(drag) => <SafeSection section={section} drag={drag} theme={theme} dark={dark} variant={variant} />}</SortableSection>)}</>
}

function baseStyle(theme: ThemeTokens, variant: DocxSafeVariant): CSSProperties {
  const accent = theme.primaryColor || (variant === 'sidebar' ? '#5279a8' : '#27313b')
  return {
    minHeight: '297mm', background: '#ffffff', color: theme.textColor,
    fontFamily: theme.fontFamily, fontSize: `${theme.fontSize}px`, lineHeight: theme.lineHeight,
    '--docx-safe-accent': accent,
    '--docx-safe-on-accent': contrastingInk(accent),
    '--docx-safe-spacing': `${theme.spacingScale}`,
    '--docx-safe-line-height': `${theme.lineHeight}`,
    '--docx-safe-padding-v': `${theme.pagePaddingVertical}mm`,
    '--docx-safe-padding-h': `${theme.pagePaddingHorizontal}mm`,
  } as CSSProperties
}

export function DocxSafeTemplate({ resume, theme, sidebarSectionIds, variant }: TemplateProps & { readonly variant: DocxSafeVariant }): ReactElement {
  const header = useEditableHeader(resume.name, resume.baseInfo ?? null, TEMPLATE_IDS[variant])
  const job = useEditableJobIntention(resume.jobIntention)
  const sidebarIds = sectionIdsForColumns(resume, sidebarSectionIds)
  const sidebarSections = variant === 'columns' ? resume.sections.filter((section) => sidebarIds.has(section.id)) : []
  const mainSections = variant === 'columns' ? resume.sections.filter((section) => !sidebarIds.has(section.id)) : resume.sections
  const style = baseStyle(theme, variant)

  return (
    <ResumeFrame resume={resume} theme={theme} className={`docx-safe docx-safe-${variant}`} style={style}>
      <style>{`
        .docx-safe { box-sizing:border-box; overflow-wrap:anywhere; }
        .docx-safe *, .docx-safe *::before, .docx-safe *::after { box-sizing:border-box; }
        .docx-safe-page { display:flex; flex-direction:column; min-height:297mm; padding:var(--docx-safe-padding-v) var(--docx-safe-padding-h); }
        .docx-safe-header { display:flex; align-items:flex-start; gap:18px; padding:0 0 15px; border-bottom:2px solid var(--docx-safe-accent); break-inside:avoid; }
        .docx-safe-header-copy { min-width:0; flex:1; }
        .docx-safe-name { margin:0; color:#111827; font-size:2.1em; line-height:1.1; font-weight:800; letter-spacing:.02em; }
        .docx-safe-role { margin-top:6px; color:var(--docx-safe-accent); font-size:1em; font-weight:650; }
        .docx-safe-avatar { width:74px; height:90px; flex:none; border:1px solid #cbd5e1; background:#f8fafc; }
        .docx-safe-fields { display:flex; flex-wrap:wrap; gap:4px 14px; margin-top:11px; color:#475569; font-size:.78em; line-height:1.5; cursor:pointer; }
        .docx-safe-field { min-width:0; max-width:100%; overflow-wrap:anywhere; }
        .docx-safe-job { display:flex; flex-wrap:wrap; gap:4px 15px; margin-top:10px; padding-top:8px; border-top:1px solid #e2e8f0; color:#334155; font-size:.8em; line-height:1.5; cursor:pointer; }
        .docx-safe-job-vertical { display:grid; gap:6px; border-top:1px solid currentColor; }
        .docx-safe-job-field { position:relative; min-width:0; overflow-wrap:anywhere; }
        .docx-safe-delete { position:absolute; right:-16px; top:-5px; display:grid; place-items:center; width:15px; height:15px; border:0; border-radius:50%; background:#fff; color:#ef4444; }
        .docx-safe-main { padding-top:20px; }
        .docx-safe-section { position:relative; min-width:0; margin-bottom:calc(26px * var(--docx-safe-spacing)); break-inside:auto; }
        .docx-safe-section:last-child { margin-bottom:0; }
        .docx-safe-section-title-row { display:flex; align-items:baseline; gap:10px; margin-bottom:10px; break-after:avoid; }
        .docx-safe-section-title-row h2 { margin:0; max-width:100%; line-height:1.35; }
        .docx-safe-title-rule { height:1px; flex:1; min-width:12px; background:#cbd5e1; }
        .docx-safe-section-body { min-width:0; }
        .docx-safe-block-header { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; align-items:baseline; margin-bottom:4px; break-after:avoid; }
        .docx-safe-block-title { font-weight:730; }
        .docx-safe-block-subtitle { font-size:.88em; }
        .docx-safe-block-date { font-size:.8em; white-space:nowrap; }
        .docx-safe-rich, .docx-safe-rich p, .docx-safe-rich li { line-height:var(--docx-safe-line-height); }
        .docx-safe-rich { font-size:.9em; }
        .docx-safe-rich p { margin:0; }
        .docx-safe-rich ul, .docx-safe-rich ol { margin:0; padding-left:1.35em; }
        .docx-safe-rich li { margin:0; }
        .docx-safe-actions { position:absolute; right:0; top:-4px; z-index:2; display:flex; gap:3px; padding:2px; border:1px solid #cbd5e1; border-radius:4px; background:#fff; color:var(--docx-safe-accent); transition:opacity 120ms ease; }
        .docx-safe-actions button { display:grid; place-items:center; width:24px; height:24px; border:0; border-radius:3px; color:inherit; background:transparent; cursor:pointer; }
        .docx-safe-actions button:hover { background:#f1f5f9; }
        .docx-safe-shell { display:grid; flex:1; grid-template-columns:34% minmax(0,1fr); min-height:0; }
        .docx-safe-columns-side { min-width:0; padding:var(--docx-safe-padding-v) 18px; background:#f8fafc; border-right:1px solid #cbd5e1; }
        .docx-safe-columns-main { min-width:0; padding:var(--docx-safe-padding-v) var(--docx-safe-padding-h); }
        .docx-safe-columns-side .docx-safe-section-title-row { display:block; padding-bottom:5px; border-bottom:1px solid #94a3b8; }
        .docx-safe-columns-side .docx-safe-title-rule { display:none; }
        .docx-safe-sidebar-shell { display:grid; grid-template-columns:34% minmax(0,1fr); min-height:297mm; }
        .docx-safe-sidebar-side { min-width:0; padding:var(--docx-safe-padding-v) 18px; color:var(--docx-safe-on-accent); background:var(--docx-safe-accent); }
        .docx-safe-sidebar-main { min-width:0; padding:var(--docx-safe-padding-v) var(--docx-safe-padding-h); background:#fff; }
        .docx-safe-side-header { display:flex; flex-direction:column; align-items:stretch; gap:8px; }
        .docx-safe-avatar-side { width:100%; height:145px; margin:0 auto 8px; border-color:#dbeafe; background:#e2e8f0; }
        .docx-safe-side-name { margin:0; color:inherit; font-size:1.8em; line-height:1.1; font-weight:800; }
        .docx-safe-side-role { color:inherit; font-size:.9em; opacity:.9; }
        .docx-safe-header-dark .docx-safe-fields, .docx-safe-header-dark .docx-safe-job { color:inherit; border-color:currentColor; }
        .docx-safe-section-dark .docx-safe-section-title-row { border-color:#bfdbfe; }
        .docx-safe-section-dark .docx-safe-title-rule { background:#bfdbfe; }
        .docx-safe-section-dark .docx-safe-actions { color:var(--docx-safe-accent); }
        @media (max-width:700px) {
          .docx-safe-shell, .docx-safe-sidebar-shell { display:block; min-height:0; }
          .docx-safe-columns-side, .docx-safe-sidebar-side { padding:24px; border-right:0; }
          .docx-safe-columns-main, .docx-safe-sidebar-main { padding:24px; }
          .docx-safe-avatar-side { width:150px; margin-left:0; }
        }
        @media print {
          .docx-safe, .docx-safe-page, .docx-safe-sidebar-shell { min-height:calc(297mm - 2 * var(--docx-safe-padding-v) - 2px) !important; overflow:visible !important; }
          .docx-safe-shell { min-height:0 !important; overflow:visible !important; }
          .docx-safe-rich p, .docx-safe-rich li { orphans:2; widows:2; }
        }
      `}</style>
      {variant === 'sidebar' ? (
        <div className="docx-safe-sidebar-shell">
          <aside className="docx-safe-sidebar-side" data-template-base-info-trigger="true">
            <SideHeader header={header} job={job} />
          </aside>
          <main className="docx-safe-sidebar-main" data-template-padding-probe="true" data-template-body-text="true">
            <SectionList sections={mainSections} theme={theme} variant={variant} />
          </main>
        </div>
      ) : variant === 'columns' ? (
        <div className="docx-safe-page" data-template-padding-probe="true">
          <HeaderBlock header={header} job={job} showJob={false} />
          <div className="docx-safe-shell">
            <aside className="docx-safe-columns-side">
              {job.fields.length > 0 ? <JobFields job={job} vertical /> : null}
              {sidebarSections.length > 0 ? <SectionList sections={sidebarSections} theme={theme} variant={variant} /> : null}
            </aside>
            <main className="docx-safe-columns-main" data-template-body-text="true">
              <SectionList sections={mainSections} theme={theme} variant={variant} />
            </main>
          </div>
        </div>
      ) : (
        <div className="docx-safe-page" data-template-padding-probe="true">
          <HeaderBlock header={header} job={job} />
          <main className="docx-safe-main" data-template-body-text="true">
            <SectionList sections={mainSections} theme={theme} variant={variant} />
          </main>
        </div>
      )}
      {header.modals}
      {job.modals}
    </ResumeFrame>
  )
}

export type { TemplateProps }
