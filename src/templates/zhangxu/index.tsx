'use client'

import { type CSSProperties, type ReactElement } from 'react'
import { BookOpen, BriefcaseBusiness, FileText, GripVertical, Plus, Trash2, X } from 'lucide-react'
import { SectionTitleText } from '@/components/sections/section-title-text'
import type { Section } from '@/entities/resume/section'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
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
  useEditableHeader,
  useEditableJobIntention,
  useEditableSection,
  contrastingInk,
} from '@/templates/_core'
import type { DragHandleProps, TemplateProps } from '@/templates/_core'

/**
 * Canva 校招编号稿的参考改编。线条、圆章与编号为原创 CSS / 项目图标，
 * 不包含原稿的头像、字体文件或图形素材。
 */
export default function ZhangxuTemplate({ resume, theme }: TemplateProps): ReactElement {
  const header = useEditableHeader(resume.name, resume.baseInfo ?? null, 'zhangxu')
  const job = useEditableJobIntention(resume.jobIntention)
  const showJob = resume.jobIntentionVisible ?? job.fields.length > 0
  const accent = theme.primaryColor || '#3a4351'
  const readOnly = useAppStore((state) => state.readOnly)
  const style = {
    minHeight: '297mm',
    background: '#fff',
    color: theme.textColor,
    fontFamily: theme.fontFamily,
    fontSize: `${theme.fontSize}px`,
    '--zhangxu-accent': accent,
    '--zhangxu-on-accent': contrastingInk(accent),
    '--zhangxu-line-height': `${theme.lineHeight}`,
    '--zhangxu-spacing': `${theme.spacingScale}`,
    '--zhangxu-print-padding': `${theme.pagePaddingVertical}mm`,
  } as CSSProperties

  return (
    <ResumeFrame resume={resume} theme={theme} className="zhangxu-resume" style={style}>
      <style>{`
        .zhangxu-page { box-sizing:border-box; min-height:297mm; overflow-wrap:anywhere; border-bottom:7px solid var(--zhangxu-accent); }
        .zhangxu-topline { display:flex; align-items:center; gap:9px; color:var(--zhangxu-accent); font-size:.77em; font-weight:800; letter-spacing:.08em; line-height:1; }
        .zhangxu-topline::before, .zhangxu-topline::after { content:''; height:7px; background:var(--zhangxu-accent); }
        .zhangxu-topline::before { width:24px; flex:none; }
        .zhangxu-topline::after { flex:1; }
        .zhangxu-hero { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:start; gap:15px; padding:18px 23px 17px; break-inside:avoid; }
        .zhangxu-name { margin:0 0 8px; font-size:2em; font-weight:800; letter-spacing:.025em; line-height:1.15; overflow-wrap:anywhere; }
        .zhangxu-fields { display:flex; flex-wrap:wrap; gap:3px 12px; max-width:100%; cursor:pointer; font-size:.83em; line-height:1.6; }
        .zhangxu-fields > * { min-width:0; max-width:100%; overflow-wrap:anywhere; }
        .zhangxu-job { display:flex; flex-wrap:wrap; gap:3px 12px; margin-top:8px; padding-top:7px; border-top:1px solid #e5e7eb; cursor:pointer; font-size:.83em; line-height:1.6; }
        .zhangxu-job > * { position:relative; min-width:0; overflow-wrap:anywhere; }
        .zhangxu-avatar { width:${84 * header.avatarScale}px; height:${100 * header.avatarScale}px; background:#f3f4f6; }
        .zhangxu-main { padding:0 23px 18px; }
        .zhangxu-section { position:relative; margin-top:calc(16px * var(--zhangxu-spacing)); break-inside:auto; }
        .zhangxu-section.first { margin-top:0; }
        .zhangxu-section-heading { display:grid; grid-template-columns:26px minmax(0,1fr) auto; align-items:center; gap:9px; padding-bottom:6px; border-bottom:1px solid #929191; break-after:avoid; }
        .zhangxu-icon { display:grid; place-items:center; width:23px; height:23px; border-radius:50%; background:var(--zhangxu-accent); color:var(--zhangxu-on-accent); }
        .zhangxu-section-heading h2 { margin:0; color:#1f2937; font-weight:780; line-height:1.35; }
        .zhangxu-number { color:var(--zhangxu-accent); font-size:.9em; font-weight:750; letter-spacing:.04em; }
        .zhangxu-section-body { padding:calc(8px * var(--zhangxu-spacing)) 0 0 35px; }
        .zhangxu-actions { position:absolute; z-index:2; right:32px; top:-5px; display:flex; gap:3px; padding:3px; border:1px solid #d1d5db; border-radius:5px; background:#fff; color:#303030; }
        .zhangxu-actions button { display:grid; place-items:center; width:24px; height:24px; border:0; border-radius:3px; background:transparent; cursor:pointer; }
        .zhangxu-actions button:hover { background:#f3f4f6; }
        .zhangxu-block-head { display:flex; flex-wrap:wrap; align-items:baseline; gap:2px 9px; margin-bottom:3px; break-after:avoid; }
        .zhangxu-block-title { color:#1f2937; font-size:1em; font-weight:700; }
        .zhangxu-block-subtitle { color:#4b5563; font-size:.9em; }
        .zhangxu-block-date { margin-left:auto; color:#4b5563; font-size:.86em; white-space:nowrap; }
        .zhangxu-rich, .zhangxu-rich p, .zhangxu-rich li { line-height:var(--zhangxu-line-height); }
        .zhangxu-rich p { margin:0; }
        .zhangxu-rich ul, .zhangxu-rich ol { margin:0; padding-left:1.5em; }
        .zhangxu-rich li { margin:0; }
        .zhangxu-resume [data-resume-block] { break-inside:auto; }
        @media print {
          .zhangxu-resume { min-height:calc(297mm - 2 * var(--zhangxu-print-padding) - 2px) !important; overflow:visible !important; }
          .zhangxu-page { min-height:calc(297mm - 2 * var(--zhangxu-print-padding) - 2px) !important; padding-bottom:0 !important; }
          .zhangxu-resume p, .zhangxu-resume li { orphans:2; widows:2; }
        }
      `}</style>
      <div
        className="zhangxu-page"
        data-template-padding-probe="true"
        style={{ padding: `${mmToPx(theme.pagePaddingVertical)}px ${mmToPx(theme.pagePaddingHorizontal)}px ${mmToPx(theme.pagePaddingVertical) * 0.75}px` }}
      >
        <div className="zhangxu-topline" aria-hidden="true"><span>PERSONAL RESUME</span></div>
        <header className="zhangxu-hero">
          <div>
            <EditableText as="h1" value={header.name} onCommit={readOnly ? undefined : header.onCommitName} className="zhangxu-name" />
            <div
              className="zhangxu-fields"
              data-template-base-info-trigger="true"
              role={readOnly ? undefined : 'button'}
              tabIndex={readOnly ? undefined : 0}
              onClick={readOnly ? undefined : header.openEditModal}
              onKeyDown={(event) => { if (!readOnly && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); header.openEditModal() } }}
            >
              {header.fields.map((field) => (
                <FieldChip key={field.key} field={field} header={header}>
                  <span>{field.label}：{field.value}</span>
                </FieldChip>
              ))}
              {!readOnly && header.fields.length === 0 && <span>＋ 编辑基本信息</span>}
            </div>
            {showJob && job.fields.length > 0 && (
              <div
                className="zhangxu-job"
                data-template-job-intention-trigger="true"
                data-template-job-intention-layout="header"
                role={readOnly ? undefined : 'button'}
                tabIndex={readOnly ? undefined : 0}
                onClick={readOnly ? undefined : job.openEditModal}
                onKeyDown={(event) => { if (!readOnly && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); job.openEditModal() } }}
              >
                {job.fields.map((field) => (
                  <span key={field.key} onMouseEnter={() => !readOnly && job.setHoveredField(field.key)} onMouseLeave={() => job.setHoveredField(null)}>
                    {field.label}：{field.value}
                    {!readOnly && job.hoveredField === field.key && (
                      <button
                        type="button"
                        aria-label={`删除 ${field.label}`}
                        className="absolute -right-3 -top-2 rounded-full bg-white text-red-500 print:hidden"
                        onClick={(event) => { event.stopPropagation(); job.deleteField(field.key) }}
                      ><X size={13} /></button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
          <AvatarSlot header={header} className="zhangxu-avatar" placeholderSize={43} placeholderColor="#cbd5e1" />
        </header>
        <main className="zhangxu-main">
          {resume.sections.map((section, index) => (
            <SortableSection key={section.id} sectionId={section.id}>
              {(drag) => <ZhangxuSection section={section} index={index} first={index === 0} drag={drag} theme={theme} />}
            </SortableSection>
          ))}
        </main>
      </div>
      {header.modals}
      {job.modals}
    </ResumeFrame>
  )
}

function ZhangxuSection({ section, index, first, drag, theme }: {
  section: Section
  index: number
  first: boolean
  drag: DragHandleProps
  theme: ThemeTokens
}): ReactElement {
  const edit = useEditableSection(section)
  const readOnly = useAppStore((state) => state.readOnly)
  const attachDragHandle = (element: HTMLButtonElement | null): void => { drag.ref(element) }
  const dragAttributes = drag.attributes as Record<string, unknown>
  const dragListeners = drag.listeners as Record<string, unknown>
  const leadingType = section.blocks[0]?.type
  const Icon = leadingType === 'education' ? BookOpen : leadingType === 'experience' || leadingType === 'campus' ? BriefcaseBusiness : FileText

  return (
    <section
      className={`zhangxu-section group/section${first ? ' first' : ''}`}
      data-template-section="true"
      data-template-section-title={section.title}
      onMouseEnter={() => edit.setHovered(true)}
      onMouseLeave={() => edit.setHovered(false)}
    >
      <div className="zhangxu-section-heading">
        <span className="zhangxu-icon" aria-hidden="true"><Icon size={13} strokeWidth={2.2} /></span>
        <SectionTitleText
          as="h2"
          value={edit.displayTitle}
          onCommit={edit.canEditTitle ? edit.onCommitTitle : undefined}
          style={{ fontSize: `${1.08 * (theme.titleScale ?? 1)}em` }}
        />
        <span className="zhangxu-number" aria-label={`第 ${index + 1} 节`}>{String(index + 1).padStart(2, '0')}</span>
      </div>
      {!readOnly && <div className="zhangxu-actions print:hidden" style={{ opacity: edit.isHovered ? 1 : 0, pointerEvents: edit.isHovered ? 'auto' : 'none' }}>
        <button type="button" title="拖动" aria-label="拖动" ref={attachDragHandle} {...dragAttributes} {...dragListeners}><GripVertical size={15} /></button>
        {!edit.isTextOnly && <button type="button" title="添加" aria-label="添加内容" onClick={edit.onAddBlock}><Plus size={15} /></button>}
        <button type="button" title="删除" aria-label="删除区块" onClick={edit.onRequestDelete}><Trash2 size={15} /></button>
      </div>}
      <div className="zhangxu-section-body" data-template-body-text="true">
        <BlockList
          section={edit}
          themeColor={theme.primaryColor}
          spacingScale={theme.spacingScale}
          rendererStyles={{
            header: 'zhangxu-block-head',
            title: { className: 'zhangxu-block-title' },
            subtitle: { className: 'zhangxu-block-subtitle' },
            dateRange: { className: 'zhangxu-block-date' },
            content: 'zhangxu-rich',
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
