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

/** Canva EAF9-DnaqKo 的信息框、顶端胶囊和逐节横框，转换为可伸缩的中文校招模板。 */
export default function KuangxuTemplate({ resume, theme }: TemplateProps): ReactElement {
  const header = useEditableHeader(resume.name, resume.baseInfo ?? null, 'kuangxu')
  const job = useEditableJobIntention(resume.jobIntention)
  const showJob = resume.jobIntentionVisible ?? job.fields.length > 0
  const accent = theme.primaryColor || '#343434'
  const style = {
    minHeight: '297mm', background: '#fff', color: theme.textColor,
    fontFamily: theme.fontFamily, fontSize: `${theme.fontSize}px`,
    '--kuangxu-accent': accent,
    '--kuangxu-line-height': `${theme.lineHeight}`,
    '--kuangxu-spacing': `${theme.spacingScale}`,
    '--kuangxu-print-padding': `${theme.pagePaddingVertical}mm`,
  } as CSSProperties

  return <ResumeFrame resume={resume} theme={theme} className="kuangxu-resume" style={style}>
    <style>{`
      .kuangxu-page { box-sizing:border-box; min-height:297mm; overflow-wrap:anywhere; }
      .kuangxu-top { position:relative; height:34px; margin-bottom:28px; background:#a3a3a3; border-bottom:7px solid #dedede; }
      .kuangxu-pill { position:absolute; left:50%; top:9px; transform:translateX(-50%); min-width:185px; padding:6px 28px; border-radius:100px; background:var(--kuangxu-accent); color:#fff; text-align:center; font-size:1.35em; font-weight:800; line-height:1.2; letter-spacing:.14em; }
      .kuangxu-header { display:flex; align-items:center; gap:20px; min-height:128px; margin:0 27px calc(23px * var(--kuangxu-spacing)); padding:16px 24px; border:1px solid #777; break-inside:avoid; }
      .kuangxu-header-main { flex:1; min-width:0; }
      .kuangxu-name-row { display:flex; flex-wrap:wrap; align-items:baseline; gap:4px 16px; margin-bottom:11px; }
      .kuangxu-name { margin:0; font-size:2.12em; font-weight:820; line-height:1.15; letter-spacing:.04em; }
      .kuangxu-job-summary { font-size:.96em; font-weight:690; }
      .kuangxu-fields, .kuangxu-job { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:4px 14px; cursor:pointer; font-size:.83em; line-height:1.55; }
      .kuangxu-fields > *, .kuangxu-job > * { min-width:0; overflow-wrap:anywhere; }
      .kuangxu-job { margin-top:7px; }
      .kuangxu-job > * { position:relative; }
      .kuangxu-avatar { flex:none; width:${92 * header.avatarScale}px; height:${92 * header.avatarScale}px; border-radius:50%; background:#e5e7eb; }
      .kuangxu-avatar img { border-radius:50%; }
      .kuangxu-sections { border-top:1px solid #888; }
      .kuangxu-section { position:relative; padding:calc(16px * var(--kuangxu-spacing)) 27px calc(17px * var(--kuangxu-spacing)); border-bottom:1px solid #888; break-inside:auto; }
      .kuangxu-section::after { content:''; display:block; position:absolute; left:0; right:0; bottom:-5px; border-bottom:1px solid #c7c7c7; }
      .kuangxu-heading { break-after:avoid; margin-bottom:calc(10px * var(--kuangxu-spacing)); }
      .kuangxu-heading h2 { margin:0; color:var(--kuangxu-accent); font-weight:790; line-height:1.3; }
      .kuangxu-body { min-width:0; }
      .kuangxu-actions { position:absolute; z-index:2; right:20px; top:-12px; display:flex; gap:2px; padding:2px; border:1px solid #cbd5e1; border-radius:4px; background:#fff; }
      .kuangxu-actions button { display:grid; place-items:center; width:23px; height:23px; border:0; background:transparent; cursor:pointer; }
      .kuangxu-actions button:hover { background:#f3f4f6; }
      .kuangxu-block-head { display:flex; flex-wrap:wrap; align-items:baseline; gap:2px 9px; margin-bottom:4px; break-after:avoid; }
      .kuangxu-block-title { font-size:.99em; font-weight:710; }
      .kuangxu-block-subtitle, .kuangxu-block-date { color:#505050; font-size:.86em; }
      .kuangxu-block-date { margin-left:auto; white-space:nowrap; }
      .kuangxu-rich, .kuangxu-rich p, .kuangxu-rich li { line-height:var(--kuangxu-line-height); }
      .kuangxu-rich p { margin:0; }
      .kuangxu-rich ul, .kuangxu-rich ol { margin:0; padding-left:1.4em; }
      .kuangxu-rich li { margin:0; }
      .kuangxu-resume [data-resume-block] { break-inside:auto; }
      @media print {
        .kuangxu-resume, .kuangxu-page { min-height:calc(297mm - 2 * var(--kuangxu-print-padding) - 2px) !important; overflow:visible !important; }
        .kuangxu-resume p, .kuangxu-resume li { orphans:2; widows:2; }
      }
    `}</style>
    <div className="kuangxu-page" data-template-padding-probe="true"
      style={{ padding: `${mmToPx(theme.pagePaddingVertical)}px ${mmToPx(theme.pagePaddingHorizontal)}px` }}>
      <div className="kuangxu-top"><span className="kuangxu-pill">简历</span></div>
      <header className="kuangxu-header">
        <div className="kuangxu-header-main">
          <div className="kuangxu-name-row">
            <EditableText as="h1" value={header.name} onCommit={header.onCommitName} className="kuangxu-name" />
          </div>
          <div className="kuangxu-fields" data-template-base-info-trigger="true" role="button" tabIndex={0}
            onClick={header.openEditModal} onKeyDown={(event) => { if (event.key === 'Enter') header.openEditModal() }}>
            {header.fields.map((field) => <FieldChip key={field.key} field={field} header={header}>
              <span>{field.label}：{field.value}</span>
            </FieldChip>)}
            {header.fields.length === 0 && <span>＋ 编辑基本信息</span>}
          </div>
          {showJob && job.fields.length > 0 && <div className="kuangxu-job" data-template-job-intention-trigger="true"
            data-template-job-intention-layout="header" role="button" tabIndex={0}
            onClick={job.openEditModal} onKeyDown={(event) => { if (event.key === 'Enter') job.openEditModal() }}>
            {job.fields.map((field) => <span key={field.key} onMouseEnter={() => job.setHoveredField(field.key)}
              onMouseLeave={() => job.setHoveredField(null)}>{field.label}：{field.value}
              {job.hoveredField === field.key && <button type="button" className="absolute -right-2 -top-2 bg-white text-red-500 print:hidden"
                aria-label={`删除 ${field.label}`} onClick={(event) => { event.stopPropagation(); job.deleteField(field.key) }}><X size={12} /></button>}
            </span>)}
          </div>}
        </div>
        <AvatarSlot header={header} className="kuangxu-avatar" placeholderSize={44} placeholderColor="#adb5bd" />
      </header>
      <main className="kuangxu-sections">
        {resume.sections.map((section) => <SortableSection key={section.id} sectionId={section.id}>
          {(drag) => <KuangxuSection section={section} drag={drag} theme={theme} />}
        </SortableSection>)}
      </main>
    </div>
    {header.modals}
    {job.modals}
  </ResumeFrame>
}

function KuangxuSection({ section, drag, theme }: { section: Section; drag: DragHandleProps; theme: ThemeTokens }): ReactElement {
  const edit = useEditableSection(section)
  const attach = (node: HTMLButtonElement | null): void => { drag.ref(node) }
  return <section className="kuangxu-section group/section" data-template-section="true"
    data-template-section-title={section.title} onMouseEnter={() => edit.setHovered(true)} onMouseLeave={() => edit.setHovered(false)}>
    <div className="kuangxu-heading"><SectionTitleText as="h2" value={edit.displayTitle}
      onCommit={edit.canEditTitle ? edit.onCommitTitle : undefined}
      style={{ fontSize: `${1.1 * (theme.titleScale ?? 1)}em` }} /></div>
    <div className="kuangxu-actions print:hidden" style={{ opacity: edit.isHovered ? 1 : 0, pointerEvents: edit.isHovered ? 'auto' : 'none' }}>
      <button type="button" title="拖动" aria-label="拖动" ref={attach} {...drag.attributes as Record<string, unknown>} {...drag.listeners as Record<string, unknown>}><GripVertical size={14} /></button>
      {!edit.isTextOnly && <button type="button" title="添加" aria-label="添加内容" onClick={edit.onAddBlock}><Plus size={14} /></button>}
      <button type="button" title="删除" aria-label="删除区块" onClick={edit.onRequestDelete}><Trash2 size={14} /></button>
    </div>
    <div className="kuangxu-body" data-template-body-text="true">
      <BlockList section={edit} themeColor={theme.primaryColor} spacingScale={theme.spacingScale}
        rendererStyles={{ header:'kuangxu-block-head', title:{className:'kuangxu-block-title'},
          subtitle:{className:'kuangxu-block-subtitle'}, dateRange:{className:'kuangxu-block-date'},
          content:'kuangxu-rich', contentColor:theme.textColor }} />
    </div>
    <DeleteSectionDialog open={edit.isDeleteDialogOpen} sectionTitle={edit.displayTitle}
      onOpenChange={edit.setDeleteDialogOpen} onConfirm={edit.confirmDelete} />
  </section>
}
