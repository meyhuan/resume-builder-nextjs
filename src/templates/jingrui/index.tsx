'use client'

import { useState, type CSSProperties, type ReactElement } from 'react'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { SectionTitleText } from '@/components/sections/section-title-text'
import { getHeaderJobIntentionText } from '@/entities/resume/header-job-intention'
import type { Section } from '@/entities/resume/section'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import { getSectionIcon } from '@/utils/get-section-icon'
import { useAppStore } from '@/state/store'
import {
  AvatarSlot,
  BlockList,
  DeleteSectionDialog,
  EditableText,
  FieldChip,
  ResumeFrame,
  SortableSection,
  mmToPx,
  contrastingInk,
  useEditableHeader,
  useEditableJobIntention,
  useEditableSection,
} from '@/templates/_core'
import type { DragHandleProps, EditableJobIntention, TemplateProps } from '@/templates/_core'

/**
 * 蓝序：基于“蓝色商务风应届生求职简历模板”Canva 参考稿的可编辑适配。
 * 视觉保留蓝紫渐变侧栏、白色主内容区、英文副标题和双栏信息层级，
 * 数据与交互全部复用简历编辑器的 headless primitives。
 */
export default function JingruiTemplate({ resume, theme }: TemplateProps): ReactElement {
  const header = useEditableHeader(resume.name, resume.baseInfo ?? null)
  const readOnly = useAppStore((state) => state.readOnly)
  const job = useEditableJobIntention(resume.jobIntention)
  const showJob = resume.jobIntentionVisible ?? job.fields.length > 0
  const subtitle = getHeaderJobIntentionText(resume)
  const accent = theme.primaryColor || '#4c47ff'
  const showAvatar = header.baseInfo?.showAvatar !== false
  const style = {
    position: 'relative',
    minHeight: '297mm',
    background: '#ffffff',
    color: theme.textColor,
    '--jingrui-accent': accent,
    '--jingrui-on-accent': contrastingInk(accent),
    '--jingrui-spacing': `${theme.spacingScale}`,
    '--jingrui-line-height': `${theme.lineHeight}`,
    '--jingrui-print-padding': `${theme.pagePaddingVertical}mm`,
  } as CSSProperties

  return (
    <ResumeFrame resume={resume} theme={theme} className="jingrui-resume" style={style}>
      <style>{`
        .jingrui-resume { overflow-wrap:anywhere; font-size:${theme.fontSize}px; line-height:${theme.lineHeight}; font-family:${theme.fontFamily}; }
        .jingrui-shell { display:grid; grid-template-columns:34.8% minmax(0,1fr); min-height:297mm; }
        .jingrui-sidebar { position:relative; display:flex; flex-direction:column; min-width:0; color:var(--jingrui-on-accent); background:var(--jingrui-accent); }
        .jingrui-sidebar::after { content:""; position:absolute; inset:auto 0 0; height:27%; background:linear-gradient(135deg,transparent 0 48%,rgba(255,255,255,.08) 48% 64%,transparent 64%); pointer-events:none; }
        .jingrui-photo-panel { padding:${mmToPx(theme.pagePaddingVertical) * 0.8}px ${mmToPx(theme.pagePaddingHorizontal) * 0.72}px 36px; color:#29354b; background:#e9eef5; }
        .jingrui-side-top { margin-bottom:14px; color:inherit; font-size:.92em; letter-spacing:.28em; font-weight:500; }
        .jingrui-avatar { width:100%; height:390px !important; margin:0 auto; overflow:hidden; border-radius:4px; background:#dbe1ea; box-shadow:0 10px 24px rgba(37,38,106,.15); }
        .jingrui-avatar img { width:100%; height:100%; object-fit:cover; }
        .jingrui-side-content { position:relative; z-index:1; display:flex; flex-direction:column; flex:1; min-height:0; padding:${mmToPx(theme.pagePaddingVertical) * 0.8}px ${mmToPx(theme.pagePaddingHorizontal) * 0.72}px; background:var(--jingrui-accent); }
        .jingrui-photo-panel + .jingrui-side-content::before { content:""; position:absolute; inset:-32px 0 auto; height:33px; background:var(--jingrui-accent); clip-path:polygon(0 100%,100% 0,100% 100%); pointer-events:none; }
        .jingrui-side-kicker { font-size:.73em; letter-spacing:.18em; font-weight:700; opacity:.78; }
        .jingrui-name { margin:8px 0 0; font-size:2.05em; line-height:1.08; letter-spacing:.02em; font-weight:800; color:inherit; }
        .jingrui-role { margin-top:8px; color:inherit; font-size:.95em; line-height:1.5; }
        .jingrui-side-rule { width:34px; height:3px; margin:18px 0 14px; border-radius:999px; background:currentColor; }
        .jingrui-info { display:grid; gap:9px; font-size:.78em; }
        .jingrui-info > * { min-width:0; overflow-wrap:anywhere; }
        .jingrui-info [data-field-chip] { color:inherit; }
        .jingrui-info [data-field-chip] button { color:inherit; }
        .jingrui-job { display:flex; flex-wrap:wrap; gap:6px 12px; margin-top:14px; padding-top:14px; border-top:1px solid currentColor; color:inherit; font-size:.76em; line-height:1.5; }
        .jingrui-main { min-width:0; padding:${mmToPx(theme.pagePaddingVertical) * 0.88}px ${mmToPx(theme.pagePaddingHorizontal) * 1.12}px ${mmToPx(theme.pagePaddingVertical)}px; background:#fff; }
        .jingrui-main > main { display:block; }
        .jingrui-section { position:relative; min-width:0; margin-bottom:calc(28px * var(--jingrui-spacing)); break-inside:auto; }
        .jingrui-section:last-child { margin-bottom:0; }
        .jingrui-title-row { display:flex; align-items:center; gap:10px; margin-bottom:14px; break-after:avoid; }
        .jingrui-heading-mark { display:grid; place-items:center; width:28px; height:28px; flex:none; color:var(--jingrui-on-accent); background:var(--jingrui-accent); border-radius:3px 11px 3px 11px; }
        .jingrui-heading-mark svg { width:15px; height:15px; }
        .jingrui-heading-copy { min-width:0; }
        .jingrui-heading-en { margin-top:1px; color:#a1a1aa; font-size:.63em; letter-spacing:.12em; line-height:1.2; text-transform:uppercase; }
        .jingrui-rule { height:1px; min-width:14px; flex:1; background:linear-gradient(90deg,#d9dbe8,transparent); }
        .jingrui-actions { position:absolute; right:0; top:-4px; z-index:2; display:flex; gap:3px; padding:3px; border:1px solid #e0e2ec; border-radius:6px; background:#fff; color:var(--jingrui-accent); transition:opacity 120ms ease; }
        .jingrui-actions button { display:grid; place-items:center; width:24px; height:24px; border:0; border-radius:4px; color:inherit; background:transparent; cursor:pointer; }
        .jingrui-actions button:hover { background:#f0efff; }
        .jingrui-block-header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:5px; padding-bottom:4px; border-bottom:1px solid #eef0f6; }
        .jingrui-block-title { color:#20233b; font-weight:750; letter-spacing:.01em; }
        .jingrui-block-subtitle { color:#69708a; font-size:.86em; }
        .jingrui-block-date { flex:none; color:var(--jingrui-accent); font-size:.76em; white-space:nowrap; }
        .jingrui-rich, .jingrui-rich p, .jingrui-rich li { color:${theme.textColor}; line-height:var(--jingrui-line-height); }
        .jingrui-rich { font-size:.9em; }
        .jingrui-resume [data-resume-block] { break-inside:auto; }
        @media (max-width:700px) {
          .jingrui-shell { display:block; min-height:0; }
          .jingrui-sidebar { min-height:0; }
          .jingrui-photo-panel { padding:24px 24px 36px; }
          .jingrui-avatar { width:150px; height:178px !important; margin:0; }
          .jingrui-side-content { padding:24px; }
          .jingrui-main { padding:28px 24px 32px; }
        }
        @media print {
          .jingrui-resume { min-height:calc(297mm - 2 * var(--jingrui-print-padding) - 2px) !important; overflow:visible !important; }
          .jingrui-shell { min-height:calc(297mm - 2 * var(--jingrui-print-padding) - 2px); }
          .jingrui-sidebar { min-height:0; }
          .jingrui-main { padding-bottom:0 !important; }
          .jingrui-resume p, .jingrui-resume li { orphans:2; widows:2; }
        }
      `}</style>
      <div className="jingrui-shell">
        <aside className="jingrui-sidebar" data-template-base-info-trigger="true" role={readOnly ? undefined : 'button'} tabIndex={readOnly ? undefined : 0} onClick={readOnly ? undefined : header.openEditModal} onKeyDown={readOnly ? undefined : (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); header.openEditModal() } }}>
          {showAvatar ? <div className="jingrui-photo-panel">
            <div className="jingrui-side-top">RESUME</div>
            <AvatarSlot header={header} className="jingrui-avatar" style={{ width: '100%', height: 390, flexShrink: 0 }} />
          </div> : null}
          <div className="jingrui-side-content">
            {!showAvatar ? <div className="jingrui-side-top">RESUME</div> : null}
            <h1 className="jingrui-name"><EditableText value={header.name} onCommit={readOnly ? undefined : header.onCommitName} /></h1>
            {showJob && subtitle ? (
              <div data-template-job-intention-trigger="true" data-template-job-intention-layout="header" role={readOnly ? undefined : 'button'} tabIndex={readOnly ? undefined : 0} className="jingrui-role" onClick={readOnly ? undefined : (event) => { event.stopPropagation(); job.openEditModal() }} onKeyDown={readOnly ? undefined : (event) => { event.stopPropagation(); if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); job.openEditModal() } }}>
                {subtitle}
              </div>
            ) : null}
            <div className="jingrui-side-rule" aria-hidden="true" />
            <div className="jingrui-info">
              {header.fields.map((field) => (
                <FieldChip key={field.key} field={field} header={header} className="min-w-0" style={{ minWidth: 0, overflowWrap: 'anywhere', gap: 7 }}>
                  <span aria-hidden="true" style={{ display: 'inline-flex', flexShrink: 0 }}>{field.icon}</span>
                  <span>{field.label}：{field.value}</span>
                </FieldChip>
              ))}
            </div>
            {showJob && job.fields.length > 0 ? <JobLine job={job} /> : null}
          </div>
        </aside>
        <div className="jingrui-main" data-template-padding-probe="true">
          <main data-template-body-text="true">
            {resume.sections.map((section) => (
              <SortableSection key={section.id} sectionId={section.id}>
                {(drag) => <JingruiSection section={section} drag={drag} theme={theme} />}
              </SortableSection>
            ))}
          </main>
        </div>
      </div>
      {header.modals}
      {job.modals}
    </ResumeFrame>
  )
}

function JobLine({ job }: { readonly job: EditableJobIntention }): ReactElement {
  const readOnly = useAppStore((state) => state.readOnly)
  return <div data-template-job-intention-trigger="true" data-template-job-intention-layout="header" className="jingrui-job" onClick={readOnly ? undefined : (event) => { event.stopPropagation(); job.openEditModal() }}>{job.fields.map((field) => <span key={field.key}>{field.label}：{field.value}</span>)}</div>
}

function englishSectionTitle(title: string): string {
  const normalized = title.trim()
  if (normalized.includes('教育')) return 'Education background'
  if (normalized.includes('校园')) return 'Campus experience'
  if (normalized.includes('工作') || normalized.includes('实习')) return 'Work experience'
  if (normalized.includes('项目')) return 'Project experience'
  if (normalized.includes('技能')) return 'Professional skills'
  if (normalized.includes('评价') || normalized.includes('介绍')) return 'Self introduction'
  return 'Resume section'
}

function JingruiSection({ section, drag, theme }: { readonly section: Section; readonly drag: DragHandleProps; readonly theme: ThemeTokens }): ReactElement {
  const edit = useEditableSection(section)
  const readOnly = useAppStore((state) => state.readOnly)
  const attachDragHandle = (element: HTMLButtonElement | null): void => { drag.ref(element) }
  const dragAttributes = drag.attributes as Record<string, unknown>
  const dragListeners = drag.listeners as Record<string, unknown>
  const [hovered, setHovered] = useState(false)
  return (
    <section className="jingrui-section" data-template-section="true" data-template-section-title={section.title} onMouseEnter={() => { setHovered(true); edit.setHovered(true) }} onMouseLeave={() => { setHovered(false); edit.setHovered(false) }}>
      <div className="jingrui-title-row">
        <span className="jingrui-heading-mark" aria-hidden="true">{getSectionIcon(section.title)}</span>
        <div className="jingrui-heading-copy">
          <SectionTitleText as="h2" value={edit.displayTitle} onCommit={edit.canEditTitle ? edit.onCommitTitle : undefined} style={{ margin: 0, fontSize: `${1.12 * (theme.titleScale ?? 1)}em`, lineHeight: 1.2, fontWeight: 760 }} />
          <div className="jingrui-heading-en">{englishSectionTitle(edit.displayTitle)}</div>
        </div>
        <span className="jingrui-rule" aria-hidden="true" />
      </div>
      <div className="relative">
        {!readOnly ? <div className="jingrui-actions print:hidden" style={{ opacity: hovered ? 1 : 0, pointerEvents: hovered ? 'auto' : 'none' }}>
          <button type="button" title="拖动" aria-label="拖动" ref={attachDragHandle} {...dragAttributes} {...dragListeners}><GripVertical size={15} /></button>
          {!edit.isTextOnly && <button type="button" title="添加" aria-label="添加内容" onClick={edit.onAddBlock}><Plus size={15} /></button>}
          <button type="button" title="删除" aria-label="删除区块" onClick={edit.onRequestDelete}><Trash2 size={15} /></button>
        </div> : null}
        <BlockList section={edit} themeColor={theme.primaryColor} spacingScale={theme.spacingScale} rendererStyles={{ header: 'jingrui-block-header', title: { className: 'jingrui-block-title' }, subtitle: { className: 'jingrui-block-subtitle' }, dateRange: { className: 'jingrui-block-date' }, content: 'jingrui-rich', contentColor: theme.textColor }} />
      </div>
      <DeleteSectionDialog open={edit.isDeleteDialogOpen} sectionTitle={edit.displayTitle} onOpenChange={edit.setDeleteDialogOpen} onConfirm={edit.confirmDelete} />
    </section>
  )
}
