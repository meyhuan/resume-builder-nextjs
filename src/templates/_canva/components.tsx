"use client"

import type { CSSProperties, ReactElement } from 'react'
import { BriefcaseBusiness, GraduationCap, GripVertical, Plus, Trash2, UserRound, Send, Star } from 'lucide-react'
import { SectionTitleText } from '@/components/sections/section-title-text'
import type { Section } from '@/entities/resume/section'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import { findModuleBySectionTitle } from '@/entities/module/module-config'
import { useAppStore } from '@/state/store'
import { AvatarSlot, BlockList, DeleteSectionDialog, EditableText, FieldChip, SortableSection, lightenHex, useEditableSection } from '@/templates/_core'
import type { DragHandleProps, EditableHeader, EditableJobIntention } from '@/templates/_core'
import type { BlockRendererStyles } from '@/templates/components/v2'
import type { ReferenceDesign } from './designs'

export type DesignStyle = CSSProperties & Record<`--${string}`, string | number>

export { contrastingInk } from '@/templates/_core/contrast'

export function gap(base: number, theme: ThemeTokens): number {
  return base * Math.max(0, theme.spacingScale)
}

export function Name({ header, large = false, center = false }: { readonly header: EditableHeader; readonly large?: boolean; readonly center?: boolean }): ReactElement {
  const readOnly = useAppStore((s) => s.readOnly)
  const position = useAppStore((s) => s.resume.jobIntention?.position?.trim())
  const titleVisible = useAppStore((s) => s.resume.jobIntentionVisible !== false && s.resume.headerJobIntentionVisible !== false)
  const title = header.baseInfo?.title?.trim()
  return <><EditableText as="h1" value={header.name} onCommit={readOnly ? undefined : header.onCommitName} style={{ margin: 0, fontWeight: 750, fontSize: large ? '2.2em' : '1.8em', lineHeight: 1.3, textAlign: center ? 'center' : undefined, overflowWrap: 'anywhere' }} />{titleVisible && title && title !== position ? <div style={{ marginTop: 6, fontSize: '.95em', textAlign: center ? 'center' : undefined, overflowWrap: 'anywhere' }} onClick={readOnly ? undefined : header.openEditModal}>{title}</div> : null}</>
}

export function Portrait({ header, design, large = false }: { readonly header: EditableHeader; readonly design: ReferenceDesign; readonly large?: boolean }): ReactElement | null {
  const [width, height] = design.avatar
  const circle = design.avatarShape === 'circle'
  const polaroid = design.avatarShape === 'polaroid'
  return <AvatarSlot header={header} placeholderSize={width * .44} placeholderColor={lightenHex(design.accent, .55)} render={({ image, uploadOverlay }) => <div className={`canva-portrait ${polaroid ? 'canva-polaroid' : ''}`} style={{ width: large ? '100%' : width, maxWidth: '100%', height: 'auto', aspectRatio: `${width}/${height}`, position: 'relative', borderRadius: circle ? '50%' : design.avatarShape === 'rounded' ? 10 : 0, overflow: polaroid ? 'visible' : 'hidden', border: circle ? '4px solid #fff' : undefined, padding: polaroid ? '8px 8px 25px' : undefined, background: '#fff', boxShadow: polaroid ? '0 3px 8px #0002' : undefined, transform: polaroid ? 'rotate(-4deg)' : undefined }}>
    <div style={{ position: 'absolute', inset: polaroid ? '8px 8px 25px' : 0, overflow: 'hidden', borderRadius: circle ? '50%' : undefined }}>{image}</div>
    {polaroid ? <span aria-hidden className="canva-photo-tape" /> : null}
    {uploadOverlay}
  </div>} />
}

export function Fields({ header, columns = 2, inline = false }: { readonly header: EditableHeader; readonly columns?: number; readonly inline?: boolean }): ReactElement | null {
  const readOnly = useAppStore((s) => s.readOnly)
  if (!header.fields.length) return null
  return <div className="canva-base-fields" data-template-base-info-trigger="true" onClick={readOnly ? undefined : (event) => { event.stopPropagation(); header.openEditModal() }} style={{ cursor: readOnly ? undefined : 'pointer', display: inline ? 'flex' : 'grid', flexWrap: 'wrap', justifyContent: inline ? 'center' : undefined, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: '5px 16px', fontSize: '.85em', marginTop: 12 }}>
    {header.fields.map((field) => <FieldChip key={field.key} field={field} header={header} deleteColor="var(--canva-accent)" className="min-w-0 max-w-full flex-wrap items-baseline" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}><span style={{ flex: '0 0 auto' }}>{field.label}：</span><span style={{ minWidth: 0 }}>{field.value}</span></FieldChip>)}
  </div>
}

/** The role and every other saved intention field are rendered exactly once. */
export function Intention({ intention, visible, vertical = false }: { readonly intention: EditableJobIntention; readonly visible: boolean; readonly vertical?: boolean }): ReactElement | null {
  const readOnly = useAppStore((s) => s.readOnly)
  if (!visible || !intention.fields.length) return null
  return <div className="canva-job-fields" data-template-job-intention-trigger="true" data-template-job-intention-layout="header" onClick={readOnly ? undefined : (event) => { event.stopPropagation(); intention.openEditModal() }} style={{ display: vertical ? 'grid' : 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 10, fontSize: '.88em', overflowWrap: 'anywhere' }}>
    {intention.fields.map((field) => <span key={field.key} className="relative group/job-field" onMouseEnter={() => intention.setHoveredField(field.key)} onMouseLeave={() => intention.setHoveredField(null)}>
      <span className={readOnly ? '' : 'cursor-pointer'} onClick={readOnly ? undefined : (event) => { event.stopPropagation(); intention.openEditModal() }}>{field.label}：<strong style={{ fontWeight: field.key === 'position' ? 700 : 400 }}>{field.value}</strong></span>
      {!readOnly && intention.hoveredField === field.key ? <button type="button" className="absolute -right-3 -top-2 rounded-full bg-white text-red-600 print:hidden" aria-label={`删除${field.label}`} title="删除字段" onClick={(event) => { event.stopPropagation(); intention.deleteField(field.key) }}><Trash2 size={12} /></button> : null}
    </span>)}
  </div>
}

export function englishTitle(title: string): string {
  const module = findModuleBySectionTitle(title)
  const titles: Partial<Record<NonNullable<typeof module>['key'], string>> = { eduExp: 'Education', workExp: 'Work Experience', internExp: 'Internship', programExp: 'Projects', schoolExp: 'Campus Experience', skill: 'Skills', summary: 'Profile', qualifications: 'Awards & Certificates' }
  return module ? titles[module.key] ?? '' : ''
}

export function Heading(props: { readonly value: string; readonly originalTitle?: string; readonly onCommit?: (next: string) => void; readonly design: ReferenceDesign; readonly compact?: boolean; readonly dark?: boolean; readonly index?: number }): ReactElement {
  const { value, originalTitle = value, onCommit, design, compact, dark, index = 0 } = props
  const kind = compact && design.heading === 'hexagon' ? 'pill' : design.heading
  const Icon = findModuleBySectionTitle(originalTitle)?.key === 'eduExp' ? GraduationCap : findModuleBySectionTitle(originalTitle)?.key === 'summary' ? UserRound : BriefcaseBusiness
  const icons = ['hexagon', 'square', 'solid-icon', 'plane', 'bubble', 'outline-icon', 'capsule', 'arrow'].includes(kind)
  const style: CSSProperties = { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, minHeight: 30, marginBottom: 10, color: kind === 'rounded-bar' ? 'var(--canva-on-accent)' : dark ? '#fff' : kind === 'bubble' ? '#183945' : kind === 'flat' ? '#252525' : 'var(--canva-accent)' }
  const labelStyle: CSSProperties = { margin: 0, fontSize: 'calc(1.15em * var(--canva-title-scale))', fontWeight: 750, lineHeight: 1.45, maxWidth: '100%' }
  const english = englishTitle(originalTitle)
  return <div className={`canva-heading canva-heading-${kind} ${dark ? 'canva-heading-dark' : ''}`} style={style} data-heading-kind={kind}>
    {icons ? <span className="canva-heading-icon" aria-hidden>{kind === 'plane' ? <Send size={16} /> : <Icon size={18} />}</span> : kind === 'triangle' || kind === 'bullet' ? <span className="canva-heading-marker" aria-hidden /> : null}
    <span className="canva-heading-label" style={{ maxWidth: '100%', minWidth: 0, ...(kind === 'tape' ? { backgroundColor: index % 2 ? '#ddd1e8' : '#d7e6d6' } : {}) }}><SectionTitleText as="h2" value={value} onCommit={onCommit} style={labelStyle} /></span>
    {english && kind !== 'dotted' && kind !== 'triangle' && kind !== 'hexagon' && kind !== 'bullet' && kind !== 'caps-rule' ? <span aria-hidden className="canva-heading-english" style={{ fontSize: '.62em', color: dark ? '#fff' : '#666' }}>{english}</span> : null}
    <span className="canva-heading-line" aria-hidden />
  </div>
}

function SectionActions({ editable, dragProps }: { readonly editable: ReturnType<typeof useEditableSection>; readonly dragProps: DragHandleProps }): ReactElement | null {
  const readOnly = useAppStore((s) => s.readOnly)
  const attachDragHandle = (element: HTMLButtonElement | null): void => { dragProps.ref(element) }
  const sortAttributes = dragProps.attributes as Record<string, unknown>
  const sortListeners = dragProps.listeners as Record<string, unknown>
  if (readOnly) return null
  return <div className="absolute right-0 top-0 z-10 flex gap-1 rounded border border-slate-200 bg-white px-1 py-0.5 text-slate-600 shadow-sm print:hidden" data-export-hide="true" style={{ opacity: editable.isHovered ? 1 : 0, pointerEvents: editable.isHovered ? 'auto' : 'none' }}>
    <button type="button" ref={attachDragHandle} {...sortAttributes} {...sortListeners} title="拖动" className="h-6 w-6"><GripVertical size={14} /></button>
    {!editable.isTextOnly ? <button type="button" title="添加" className="h-6 w-6" onClick={(event) => { event.stopPropagation(); editable.onAddBlock() }}><Plus size={14} /></button> : null}
    <button type="button" title="删除" className="h-6 w-6" onClick={(event) => { event.stopPropagation(); editable.onRequestDelete() }}><Trash2 size={14} /></button>
  </div>
}

function EditableReferenceSection({ section, design, theme, dragProps, compact, dark, index }: { readonly section: Section; readonly design: ReferenceDesign; readonly theme: ThemeTokens; readonly dragProps: DragHandleProps; readonly compact?: boolean; readonly dark?: boolean; readonly index: number }): ReactElement {
  const editable = useEditableSection(section)
  const styles: BlockRendererStyles = {
    container: design.blockFlow === 'date-track' ? 'canva-date-track-block' : undefined,
    header: design.blockFlow === 'date-track' ? 'canva-date-track-header' : design.blockFlow === 'ledger' ? 'canva-ledger-header' : 'grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 mb-1',
    title: { fontSize: '1em', fontWeight: '700', color: dark ? '#fff' : theme.textColor },
    subtitle: { fontSize: '.95em', color: dark ? '#f1f1f1' : theme.textColor },
    dateRange: { className: design.blockFlow === 'date-track' ? 'canva-date-track-date' : design.blockFlow === 'ledger' ? 'canva-ledger-date' : 'shrink-0', fontSize: '.85em', color: dark ? '#ddd' : '#555' },
    content: 'canva-rich mt-1',
    contentColor: dark ? '#f1f1f1' : theme.textColor,
    contentEditingColor: '#171717',
  }
  return <section className="resume-section canva-section relative" data-template-section="true" data-template-section-title={section.title} onMouseEnter={() => editable.setHovered(true)} onMouseLeave={() => editable.setHovered(false)} style={{ marginBottom: gap(design.density === 'compact' ? 15 : 22, theme), ...(design.heading === 'two-tone' ? { borderBottom: '1px dashed #b4c9ca', paddingBottom: gap(12, theme) } : {}), ...(design.heading === 'outline-icon' ? { borderBottom: '1px solid #bbb', paddingBottom: gap(12, theme) } : {}) }}>
    <Heading value={editable.displayTitle} originalTitle={section.title} onCommit={editable.canEditTitle ? editable.onCommitTitle : undefined} design={design} compact={compact} dark={dark} index={index} />
    <SectionActions editable={editable} dragProps={dragProps} />
    <BlockList section={editable} themeColor={design.accent} spacingScale={theme.spacingScale * (design.density === 'compact' ? .8 : 1)} rendererStyles={styles} className={section.columns === 2 && !compact ? 'grid grid-cols-2 gap-4' : 'block'} />
    <DeleteSectionDialog open={editable.isDeleteDialogOpen} sectionTitle={editable.displayTitle} onOpenChange={editable.setDeleteDialogOpen} onConfirm={editable.confirmDelete} />
  </section>
}

export function ReferenceSection(props: { readonly section: Section; readonly design: ReferenceDesign; readonly theme: ThemeTokens; readonly compact?: boolean; readonly dark?: boolean; readonly index: number }): ReactElement {
  return <SortableSection sectionId={props.section.id}>{(dragProps) => <EditableReferenceSection {...props} dragProps={dragProps} />}</SortableSection>
}

export function DecorativeStar(): ReactElement {
  return <Star size={29} fill="#daca99" stroke="#8a7a4c" aria-hidden />
}
