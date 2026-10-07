'use client'

import type { CSSProperties, ReactElement } from 'react'
import { GripVertical, Plus, Trash2, X } from 'lucide-react'
import { SectionTitleText } from '@/components/sections/section-title-text'
import type { Section } from '@/entities/resume/section'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import {
  AvatarSlot, BlockList, DeleteSectionDialog, EditableText, FieldChip,
  ResumeFrame, SortableSection, mmToPx, useEditableHeader,
  useEditableJobIntention, useEditableSection,
} from '@/templates/_core'
import type { DragHandleProps, TemplateProps } from '@/templates/_core'

/** 独立改编：不使用 Canva 原稿素材。 */
export default function ChengyanTemplate({ resume, theme }: TemplateProps): ReactElement {
  const header = useEditableHeader(resume.name, resume.baseInfo ?? null, 'chengyan')
  const job = useEditableJobIntention(resume.jobIntention)
  const showJob = resume.jobIntentionVisible ?? job.fields.length > 0
  const style = {
    minHeight: '297mm', background: '#fff', color: theme.textColor,
    fontFamily: theme.fontFamily, fontSize: `${theme.fontSize}px`,
    '--chengyan-accent': theme.primaryColor || '#b6653a',
    '--chengyan-line-height': `${theme.lineHeight}`,
    '--chengyan-spacing': `${theme.spacingScale}`,
    '--chengyan-print-padding': `${theme.pagePaddingVertical}mm`,
  } as CSSProperties

  return <ResumeFrame resume={resume} theme={theme} className="chengyan-resume" style={style}>
    <style>{`
      .chengyan-page { box-sizing:border-box; min-height:297mm; overflow-wrap:anywhere; }
      .chengyan-topband { height:9px; background:var(--chengyan-accent); }
      .chengyan-header { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:18px; align-items:start; padding:17px 21px; background:#f6f4f1; border-bottom:1px solid #d9d4ce; break-inside:avoid; }
      .chengyan-name { margin:0 0 8px; font-size:1.82em; line-height:1.18; font-weight:780; letter-spacing:.03em; }
      .chengyan-fields, .chengyan-job { display:flex; flex-wrap:wrap; gap:3px 12px; font-size:.8em; line-height:1.58; cursor:pointer; }
      .chengyan-fields > *, .chengyan-job > * { min-width:0; max-width:100%; overflow-wrap:anywhere; }
      .chengyan-job { margin-top:9px; padding-top:8px; border-top:1px solid #d9d4ce; }
      .chengyan-job > * { position:relative; }
      .chengyan-avatar { width:${78 * header.avatarScale}px; height:${93 * header.avatarScale}px; background:#e3ded7; }
      .chengyan-main { padding:15px 21px 27px; }
      .chengyan-section { position:relative; min-height:48px; padding:0 0 calc(22px * var(--chengyan-spacing)) 120px; break-inside:auto; }
      .chengyan-section::before { content:''; position:absolute; left:107px; top:17px; bottom:0; width:1px; background:#d7c7bb; }
      .chengyan-section:last-child::before { bottom:auto; height:18px; }
      .chengyan-heading { position:absolute; left:0; top:0; width:112px; min-height:32px; box-sizing:border-box; padding:5px 13px 5px 10px; background:var(--chengyan-accent); color:#fff; clip-path:polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%); break-after:avoid; }
      .chengyan-heading::after { content:''; position:absolute; left:0; bottom:-8px; width:0; height:0; border-top:8px solid color-mix(in srgb, var(--chengyan-accent) 70%, #000); border-left:8px solid transparent; }
      .chengyan-heading h2 { margin:0; color:#fff; line-height:1.36; font-weight:750; }
      .chengyan-section-body { min-width:0; padding-top:calc(8px * var(--chengyan-spacing)); border-top:1px solid #cfcac4; }
      .chengyan-block-head { display:flex; flex-wrap:wrap; align-items:baseline; gap:2px 8px; margin-bottom:3px; break-after:avoid; }
      .chengyan-block-title { font-size:.96em; font-weight:730; }
      .chengyan-block-subtitle, .chengyan-block-date { color:#686665; font-size:.82em; }
      .chengyan-block-date { margin-left:auto; white-space:nowrap; }
      .chengyan-rich, .chengyan-rich p, .chengyan-rich li { line-height:var(--chengyan-line-height); }
      .chengyan-rich p { margin:0; }
      .chengyan-rich ul, .chengyan-rich ol { margin:0; padding-left:1.4em; }
      .chengyan-rich li { margin:0; }
      .chengyan-actions { position:absolute; z-index:2; right:0; top:-17px; display:flex; gap:3px; padding:2px; border:1px solid #d5c7bd; border-radius:4px; background:#fff; }
      .chengyan-actions button { display:grid; place-items:center; width:24px; height:24px; border:0; background:transparent; cursor:pointer; }
      .chengyan-actions button:hover { background:#f6eee8; }
      .chengyan-resume [data-resume-block] { break-inside:auto; }
      @media print {
        .chengyan-resume, .chengyan-page { min-height:calc(297mm - 2 * var(--chengyan-print-padding) - 2px) !important; overflow:visible !important; }
        .chengyan-resume p, .chengyan-resume li { orphans:2; widows:2; }
      }
    `}</style>
    <div className="chengyan-page" data-template-padding-probe="true"
      style={{ padding: `${mmToPx(theme.pagePaddingVertical)}px ${mmToPx(theme.pagePaddingHorizontal)}px` }}>
      <div className="chengyan-topband" aria-hidden="true" />
      <header className="chengyan-header">
        <div>
          <EditableText as="h1" value={header.name} onCommit={header.onCommitName} className="chengyan-name" />
          <div className="chengyan-fields" data-template-base-info-trigger="true" role="button" tabIndex={0}
            onClick={header.openEditModal} onKeyDown={(event) => { if (event.key === 'Enter') header.openEditModal() }}>
            {header.fields.map((field) => <FieldChip key={field.key} field={field} header={header}>
              <span>{field.label}：{field.value}</span>
            </FieldChip>)}
            {header.fields.length === 0 && <span>＋ 编辑基本信息</span>}
          </div>
          {showJob && job.fields.length > 0 && <div className="chengyan-job" data-template-job-intention-trigger="true"
            data-template-job-intention-layout="header" role="button" tabIndex={0}
            onClick={job.openEditModal} onKeyDown={(event) => { if (event.key === 'Enter') job.openEditModal() }}>
            {job.fields.map((field) => <span key={field.key} onMouseEnter={() => job.setHoveredField(field.key)} onMouseLeave={() => job.setHoveredField(null)}>
              {field.label}：{field.value}
              {job.hoveredField === field.key && <button type="button" className="absolute -right-2 -top-2 bg-white text-red-500 print:hidden"
                aria-label={`删除 ${field.label}`} onClick={(event) => { event.stopPropagation(); job.deleteField(field.key) }}><X size={12} /></button>}
            </span>)}
          </div>}
        </div>
        <AvatarSlot header={header} className="chengyan-avatar" placeholderSize={40} placeholderColor="#b5aaa0" />
      </header>
      <main className="chengyan-main">
        {resume.sections.map((section) => <SortableSection key={section.id} sectionId={section.id}>
          {(drag) => <ChengyanSection section={section} drag={drag} theme={theme} />}
        </SortableSection>)}
      </main>
    </div>
    {header.modals}
    {job.modals}
  </ResumeFrame>
}

function ChengyanSection({ section, drag, theme }: { section: Section; drag: DragHandleProps; theme: ThemeTokens }): ReactElement {
  const edit = useEditableSection(section)
  const attach = (node: HTMLButtonElement | null): void => { drag.ref(node) }
  return <section className="chengyan-section group/section" data-template-section="true"
    data-template-section-title={section.title} onMouseEnter={() => edit.setHovered(true)} onMouseLeave={() => edit.setHovered(false)}>
    <div className="chengyan-heading"><SectionTitleText as="h2" value={edit.displayTitle}
      onCommit={edit.canEditTitle ? edit.onCommitTitle : undefined}
      style={{ fontSize: `${1.05 * (theme.titleScale ?? 1)}em` }} /></div>
    <div className="chengyan-actions print:hidden" style={{ opacity: edit.isHovered ? 1 : 0, pointerEvents: edit.isHovered ? 'auto' : 'none' }}>
      <button type="button" title="拖动" aria-label="拖动" ref={attach} {...drag.attributes as Record<string, unknown>} {...drag.listeners as Record<string, unknown>}><GripVertical size={14} /></button>
      {!edit.isTextOnly && <button type="button" title="添加" aria-label="添加内容" onClick={edit.onAddBlock}><Plus size={14} /></button>}
      <button type="button" title="删除" aria-label="删除区块" onClick={edit.onRequestDelete}><Trash2 size={14} /></button>
    </div>
    <div className="chengyan-section-body" data-template-body-text="true">
      <BlockList section={edit} themeColor={theme.primaryColor} spacingScale={theme.spacingScale}
        rendererStyles={{ header:'chengyan-block-head', title:{className:'chengyan-block-title'},
          subtitle:{className:'chengyan-block-subtitle'}, dateRange:{className:'chengyan-block-date'},
          content:'chengyan-rich', contentColor:theme.textColor }} />
    </div>
    <DeleteSectionDialog open={edit.isDeleteDialogOpen} sectionTitle={edit.displayTitle}
      onOpenChange={edit.setDeleteDialogOpen} onConfirm={edit.confirmDelete} />
  </section>
}
