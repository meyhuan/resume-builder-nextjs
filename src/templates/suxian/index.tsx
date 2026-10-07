'use client'

import { type CSSProperties, type ReactElement } from 'react'
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
  mmToPx,
  useEditableHeader,
  useEditableJobIntention,
  useEditableSection,
} from '@/templates/_core'
import type { DragHandleProps, TemplateProps } from '@/templates/_core'

/**
 * 校招黑白细线稿的参考改编：原创 CSS 线条和排版，不包含 Canva 素材。
 * 原稿来源与取舍见 docs/template-reference-campus-fine-lines.md。
 */
export default function SuxianTemplate({ resume, theme }: TemplateProps): ReactElement {
  const header = useEditableHeader(resume.name, resume.baseInfo ?? null, 'suxian')
  const job = useEditableJobIntention(resume.jobIntention)
  const showJob = resume.jobIntentionVisible ?? job.fields.length > 0
  const verticalName = /^[\p{Script=Han}]{1,3}$/u.test(header.name.trim())
  const accent = theme.primaryColor || '#292929'
  const style = {
    minHeight: '297mm',
    background: '#fff',
    color: theme.textColor,
    fontFamily: theme.fontFamily,
    fontSize: `${theme.fontSize}px`,
    '--suxian-accent': accent,
    '--suxian-line-height': `${theme.lineHeight}`,
    '--suxian-spacing': `${theme.spacingScale}`,
    '--suxian-print-padding': `${theme.pagePaddingVertical}mm`,
  } as CSSProperties

  return (
    <ResumeFrame resume={resume} theme={theme} className="suxian-resume" style={style}>
      <style>{`
        .suxian-page { overflow-wrap:anywhere; }
        .suxian-head { display:grid; grid-template-columns:auto minmax(0,1fr) auto auto; align-items:stretch; gap:14px; padding:15px 0 16px; border-top:1px solid var(--suxian-accent); border-bottom:1px solid #9ca3af; break-inside:avoid; }
        .suxian-name-rail { display:flex; align-items:center; justify-content:center; min-width:53px; padding-right:13px; border-right:1px solid #d1d5db; }
        .suxian-name-rail h1 { margin:0; max-width:130px; font-size:2.25em; font-weight:750; line-height:1.12; letter-spacing:.04em; overflow-wrap:anywhere; }
        .suxian-name-rail.vertical h1 { writing-mode:vertical-rl; text-orientation:upright; max-height:135px; }
        .suxian-head-info { min-width:0; align-self:center; }
        .suxian-fields { display:flex; flex-wrap:wrap; gap:4px 13px; align-content:center; cursor:pointer; font-size:.86em; line-height:1.55; }
        .suxian-fields > * { min-width:0; max-width:100%; overflow-wrap:anywhere; }
        .suxian-job { display:flex; flex-wrap:wrap; gap:3px 12px; margin-top:8px; padding-top:7px; border-top:1px solid #e5e7eb; cursor:pointer; font-size:.86em; line-height:1.5; }
        .suxian-job > * { position:relative; min-width:0; overflow-wrap:anywhere; }
        .suxian-titlestamp { align-self:stretch; display:flex; align-items:center; justify-content:center; gap:4px; padding-left:12px; border-left:1px solid #d1d5db; color:var(--suxian-accent); }
        .suxian-titlestamp strong { writing-mode:vertical-rl; text-orientation:upright; font-size:1.24em; letter-spacing:.2em; line-height:1.1; }
        .suxian-titlestamp small { writing-mode:vertical-rl; font-size:.56em; letter-spacing:.14em; text-transform:uppercase; }
        .suxian-avatar { width:${88 * header.avatarScale}px; height:${112 * header.avatarScale}px; align-self:center; background:#f3f4f6; }
        .suxian-section { position:relative; margin-top:calc(20px * var(--suxian-spacing)); padding-top:calc(9px * var(--suxian-spacing)); border-top:1px solid #9ca3af; break-inside:auto; }
        .suxian-section.first { border-top:0; padding-top:0; }
        .suxian-section-heading { position:relative; display:flex; align-items:center; gap:8px; margin-bottom:calc(11px * var(--suxian-spacing)); break-after:avoid; }
        .suxian-section-heading::before { content:''; width:13px; height:2px; flex:none; background:var(--suxian-accent); }
        .suxian-section-heading h2 { margin:0; font-weight:700; line-height:1.35; }
        .suxian-actions { position:absolute; right:0; top:-6px; display:flex; gap:3px; padding:3px; border:1px solid #d1d5db; border-radius:5px; background:#fff; color:#303030; z-index:2; }
        .suxian-actions button { display:grid; place-items:center; width:25px; height:25px; border:0; border-radius:3px; background:transparent; cursor:pointer; }
        .suxian-actions button:hover { background:#f3f4f6; }
        .suxian-block-head { display:flex; flex-wrap:wrap; align-items:baseline; gap:3px 10px; margin-bottom:4px; break-after:avoid; }
        .suxian-block-title { font-size:1.02em; font-weight:650; color:#1f2937; }
        .suxian-block-subtitle { font-size:.91em; color:#4b5563; }
        .suxian-block-date { display:none; }
        .suxian-rich, .suxian-rich p, .suxian-rich li { line-height:var(--suxian-line-height); }
        .suxian-rich p { margin:0; }
        .suxian-rich ul, .suxian-rich ol { margin:0; padding-left:1.6em; }
        .suxian-rich li { margin:0; }
        .suxian-resume [data-resume-block] { break-inside:auto; }
        @media print {
          .suxian-resume { min-height:calc(297mm - 2 * var(--suxian-print-padding) - 2px) !important; overflow:visible !important; }
          .suxian-page { padding-bottom:0 !important; }
          .suxian-resume p, .suxian-resume li { orphans:2; widows:2; }
        }
      `}</style>
      <div
        className="suxian-page"
        data-template-padding-probe="true"
        style={{ padding: `${mmToPx(theme.pagePaddingVertical) * 0.8}px ${mmToPx(theme.pagePaddingHorizontal)}px ${mmToPx(theme.pagePaddingVertical)}px` }}
      >
        <header className="suxian-head">
          <div className={`suxian-name-rail${verticalName ? ' vertical' : ''}`}>
            <EditableText as="h1" value={header.name} onCommit={header.onCommitName} />
          </div>
          <div className="suxian-head-info">
            <div
              className="suxian-fields"
              data-template-base-info-trigger="true"
              role="button"
              tabIndex={0}
              onClick={header.openEditModal}
              onKeyDown={(event) => { if (event.key === 'Enter') header.openEditModal() }}
            >
              {header.fields.map((field) => (
                <FieldChip key={field.key} field={field} header={header}>
                  <span>{field.label}：{field.value}</span>
                </FieldChip>
              ))}
              {header.fields.length === 0 && <span>＋ 编辑基本信息</span>}
            </div>
            {showJob && job.fields.length > 0 && (
              <div
                className="suxian-job"
                data-template-job-intention-trigger="true"
                data-template-job-intention-layout="header"
                role="button"
                tabIndex={0}
                onClick={job.openEditModal}
                onKeyDown={(event) => { if (event.key === 'Enter') job.openEditModal() }}
              >
                {job.fields.map((field) => (
                  <span
                    key={field.key}
                    onMouseEnter={() => job.setHoveredField(field.key)}
                    onMouseLeave={() => job.setHoveredField(null)}
                  >
                    {field.label}：{field.value}
                    {job.hoveredField === field.key && (
                      <button
                        type="button"
                        aria-label={`删除 ${field.label}`}
                        className="absolute -right-3 -top-2 rounded-full bg-white text-red-500 print:hidden"
                        onClick={(event) => { event.stopPropagation(); job.deleteField(field.key) }}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="suxian-titlestamp" aria-hidden="true"><small>RESUME</small><strong>简历</strong></div>
          <AvatarSlot header={header} className="suxian-avatar" placeholderSize={44} placeholderColor="#cbd5e1" />
        </header>
        <main style={{ marginTop: 12 * theme.spacingScale }}>
          {resume.sections.map((section, index) => (
            <SortableSection key={section.id} sectionId={section.id}>
              {(drag) => <SuxianSection section={section} drag={drag} theme={theme} first={index === 0} />}
            </SortableSection>
          ))}
        </main>
      </div>
      {header.modals}
      {job.modals}
    </ResumeFrame>
  )
}

function SuxianSection({ section, drag, theme, first }: { section: Section; drag: DragHandleProps; theme: ThemeTokens; first: boolean }): ReactElement {
  const edit = useEditableSection(section)
  const dated = section.blocks.some((block) => 'startDate' in block)
  const attachDragHandle = (element: HTMLButtonElement | null): void => { drag.ref(element) }
  const dragAttributes = drag.attributes as Record<string, unknown>
  const dragListeners = drag.listeners as Record<string, unknown>
  return (
    <section
      className={`suxian-section group/section${first ? ' first' : ''}`}
      data-template-section="true"
      data-template-section-title={section.title}
      onMouseEnter={() => edit.setHovered(true)}
      onMouseLeave={() => edit.setHovered(false)}
    >
      <div className="suxian-section-heading">
        <SectionTitleText
          as="h2"
          value={edit.displayTitle}
          onCommit={edit.canEditTitle ? edit.onCommitTitle : undefined}
          style={{ fontSize: `${1.1 * (theme.titleScale ?? 1)}em` }}
        />
        <div className="suxian-actions print:hidden" style={{ opacity: edit.isHovered ? 1 : 0, pointerEvents: edit.isHovered ? 'auto' : 'none' }}>
          <button type="button" title="拖动" aria-label="拖动" ref={attachDragHandle} {...dragAttributes} {...dragListeners}><GripVertical size={16} /></button>
          {!edit.isTextOnly && <button type="button" title="添加" onClick={edit.onAddBlock}><Plus size={16} /></button>}
          <button type="button" title="删除" onClick={edit.onRequestDelete}><Trash2 size={16} /></button>
        </div>
      </div>
      <div data-template-body-text="true">
        <BlockList
          section={edit}
          themeColor={theme.primaryColor}
          spacingScale={theme.spacingScale}
          blockVariant={dated ? { variant: 'timeline-left-date', dateWidth: 142, dotColor: theme.primaryColor, axisColor: '#cbd0d6' } : { variant: 'default' }}
          rendererStyles={{
            header: 'suxian-block-head',
            title: { className: 'suxian-block-title' },
            subtitle: { className: 'suxian-block-subtitle' },
            dateRange: { className: 'suxian-block-date' },
            content: 'suxian-rich',
            contentColor: theme.textColor,
          }}
        />
      </div>
      <DeleteSectionDialog
        open={edit.isDeleteDialogOpen}
        sectionTitle={edit.displayTitle}
        onOpenChange={edit.setDeleteDialogOpen}
        onConfirm={edit.confirmDelete}
      />
    </section>
  )
}
