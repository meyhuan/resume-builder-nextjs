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

/** 参考 Canva EAF-zxQrtUQ 的边框、顶端深色短带和深浅双色章节条，以可编辑组件重新构建。 */
export default function ShenkeTemplate({ resume, theme }: TemplateProps): ReactElement {
  const header = useEditableHeader(resume.name, resume.baseInfo ?? null)
  const job = useEditableJobIntention(resume.jobIntention)
  const showJob = resume.jobIntentionVisible ?? job.fields.length > 0
  const accent = theme.primaryColor || '#344052'
  const style = {
    minHeight: '297mm', background: '#fff', color: theme.textColor,
    fontFamily: theme.fontFamily, fontSize: `${theme.fontSize}px`,
    '--shenke-accent': accent,
    '--shenke-line-height': `${theme.lineHeight}`,
    '--shenke-spacing': `${theme.spacingScale}`,
    '--shenke-print-padding': `${theme.pagePaddingVertical}mm`,
  } as CSSProperties

  return <ResumeFrame resume={resume} theme={theme} className="shenke-resume" style={style}>
    <style>{`
      .shenke-page { box-sizing:border-box; min-height:297mm; overflow-wrap:anywhere; }
      .shenke-sheet { position:relative; min-height:calc(297mm - 2 * var(--shenke-print-padding)); border:2px solid var(--shenke-accent); padding:22px 25px 24px; }
      .shenke-tab { position:absolute; left:50%; top:-2px; transform:translateX(-50%); width:166px; height:32px; border-radius:0 0 20px 20px; background:var(--shenke-accent); }
      .shenke-tab::after { content:''; position:absolute; left:50%; top:12px; transform:translateX(-50%); width:58px; height:8px; border-radius:9px; background:#fff; }
      .shenke-header { display:flex; gap:22px; align-items:center; min-height:154px; padding:25px 4px 22px; break-inside:avoid; }
      .shenke-header > div:last-child { flex:1; min-width:0; }
      .shenke-avatar { flex:none; width:110px; height:140px; border:1px solid var(--shenke-accent); background:#eceff2; }
      .shenke-name { margin:0 0 8px; color:var(--shenke-accent); font-size:1.7em; font-weight:790; line-height:1.15; }
      .shenke-fields, .shenke-job { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:4px 13px; font-size:.82em; line-height:1.58; cursor:pointer; }
      .shenke-fields > *, .shenke-job > * { min-width:0; overflow-wrap:anywhere; }
      .shenke-job { margin-top:9px; padding-top:8px; border-top:1px solid #d5d9dd; }
      .shenke-job > * { position:relative; }
      .shenke-section { position:relative; margin:0 0 calc(15px * var(--shenke-spacing)); break-inside:auto; }
      .shenke-heading { position:relative; min-height:28px; padding:0 0 0 28px; background:#f0f1f2; break-after:avoid; }
      .shenke-heading h2 { display:inline-flex; min-width:138px; min-height:28px; align-items:center; margin:0; padding:3px 16px; background:var(--shenke-accent); color:#fff; font-weight:750; line-height:1.35; letter-spacing:.08em; }
      .shenke-body { padding:calc(10px * var(--shenke-spacing)) 28px 0; }
      .shenke-actions { position:absolute; z-index:2; right:0; top:-26px; display:flex; gap:2px; padding:2px; border:1px solid #cbd5e1; border-radius:4px; background:#fff; }
      .shenke-actions button { display:grid; place-items:center; width:23px; height:23px; border:0; background:transparent; cursor:pointer; }
      .shenke-actions button:hover { background:#eff2f5; }
      .shenke-block-head { display:flex; flex-wrap:wrap; align-items:baseline; gap:2px 9px; margin-bottom:4px; break-after:avoid; }
      .shenke-block-title { color:#2d3746; font-size:.98em; font-weight:730; }
      .shenke-block-subtitle, .shenke-block-date { color:#56606d; font-size:.85em; }
      .shenke-block-date { margin-left:auto; white-space:nowrap; }
      .shenke-rich, .shenke-rich p, .shenke-rich li { line-height:var(--shenke-line-height); }
      .shenke-rich p { margin:0; }
      .shenke-rich ul, .shenke-rich ol { margin:0; padding-left:1.45em; }
      .shenke-rich li { margin:0; }
      .shenke-resume [data-resume-block] { break-inside:auto; }
      @media print {
        .shenke-resume, .shenke-page { min-height:calc(297mm - 2 * var(--shenke-print-padding) - 2px) !important; overflow:visible !important; }
        .shenke-sheet { min-height:0 !important; border-bottom:0; }
        .shenke-resume p, .shenke-resume li { orphans:2; widows:2; }
      }
    `}</style>
    <div className="shenke-page" data-template-padding-probe="true"
      style={{ padding: `${mmToPx(theme.pagePaddingVertical)}px ${mmToPx(theme.pagePaddingHorizontal)}px` }}>
      <div className="shenke-sheet">
        <div className="shenke-tab" aria-hidden="true" />
        <header className="shenke-header">
          <AvatarSlot header={header} className="shenke-avatar" placeholderSize={44} placeholderColor="#a4acb5" />
          <div>
            <EditableText as="h1" value={header.name} onCommit={header.onCommitName} className="shenke-name" />
            <div className="shenke-fields" data-template-base-info-trigger="true" role="button" tabIndex={0}
              onClick={header.openEditModal} onKeyDown={(event) => { if (event.key === 'Enter') header.openEditModal() }}>
              {header.fields.map((field) => <FieldChip key={field.key} field={field} header={header}>
                <span>{field.label}：{field.value}</span>
              </FieldChip>)}
              {header.fields.length === 0 && <span>＋ 编辑基本信息</span>}
            </div>
            {showJob && job.fields.length > 0 && <div className="shenke-job" data-template-job-intention-trigger="true"
              data-template-job-intention-layout="header" role="button" tabIndex={0}
              onClick={job.openEditModal} onKeyDown={(event) => { if (event.key === 'Enter') job.openEditModal() }}>
              {job.fields.map((field) => <span key={field.key} onMouseEnter={() => job.setHoveredField(field.key)}
                onMouseLeave={() => job.setHoveredField(null)}>{field.label}：{field.value}
                {job.hoveredField === field.key && <button type="button" className="absolute -right-2 -top-2 bg-white text-red-500 print:hidden"
                  aria-label={`删除 ${field.label}`} onClick={(event) => { event.stopPropagation(); job.deleteField(field.key) }}><X size={12} /></button>}
              </span>)}
            </div>}
          </div>
        </header>
        <main>
          {resume.sections.map((section) => <SortableSection key={section.id} sectionId={section.id}>
            {(drag) => <ShenkeSection section={section} drag={drag} theme={theme} />}
          </SortableSection>)}
        </main>
      </div>
    </div>
    {header.modals}
    {job.modals}
  </ResumeFrame>
}

function ShenkeSection({ section, drag, theme }: { section: Section; drag: DragHandleProps; theme: ThemeTokens }): ReactElement {
  const edit = useEditableSection(section)
  const attach = (node: HTMLButtonElement | null): void => { drag.ref(node) }
  return <section className="shenke-section group/section" data-template-section="true"
    data-template-section-title={section.title} onMouseEnter={() => edit.setHovered(true)} onMouseLeave={() => edit.setHovered(false)}>
    <div className="shenke-heading"><SectionTitleText as="h2" value={edit.displayTitle}
      onCommit={edit.canEditTitle ? edit.onCommitTitle : undefined}
      style={{ fontSize: `${1.03 * (theme.titleScale ?? 1)}em` }} /></div>
    <div className="shenke-actions print:hidden" style={{ opacity: edit.isHovered ? 1 : 0, pointerEvents: edit.isHovered ? 'auto' : 'none' }}>
      <button type="button" title="拖动" aria-label="拖动" ref={attach} {...drag.attributes as Record<string, unknown>} {...drag.listeners as Record<string, unknown>}><GripVertical size={14} /></button>
      {!edit.isTextOnly && <button type="button" title="添加" aria-label="添加内容" onClick={edit.onAddBlock}><Plus size={14} /></button>}
      <button type="button" title="删除" aria-label="删除区块" onClick={edit.onRequestDelete}><Trash2 size={14} /></button>
    </div>
    <div className="shenke-body" data-template-body-text="true">
      <BlockList section={edit} themeColor={theme.primaryColor} spacingScale={theme.spacingScale}
        rendererStyles={{ header:'shenke-block-head', title:{className:'shenke-block-title'},
          subtitle:{className:'shenke-block-subtitle'}, dateRange:{className:'shenke-block-date'},
          content:'shenke-rich', contentColor:theme.textColor }} />
    </div>
    <DeleteSectionDialog open={edit.isDeleteDialogOpen} sectionTitle={edit.displayTitle}
      onOpenChange={edit.setDeleteDialogOpen} onConfirm={edit.confirmDelete} />
  </section>
}
