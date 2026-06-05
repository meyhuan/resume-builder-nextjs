"use client"

import { useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import type { Section } from '@/entities/resume/section'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import type { BaseInfo } from '@/entities/user/base-info'
import type { BlockRendererStyles } from '@/templates/components/v2'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  isTemplateExclusiveBaseInfoField,
  isTemplateHighlightField,
  isTemplateMetricField,
} from '@/lib/template-exclusive-fields'
import {
  AvatarSlot,
  BlockList,
  DeleteSectionDialog,
  EditableText,
  FieldChip,
  SortableSection,
  lightenHex,
  useEditableSection,
} from '@/templates/_core'
import type { DragHandleProps, EditableHeader, EditableJobIntention } from '@/templates/_core'
import { CONFIG } from './configs'
import type { VariantConfig } from './types'
import { SERIF } from './types'

export function HeaderFields(props: {
  readonly header: EditableHeader
  readonly color: string
  readonly accent: string
  readonly vertical?: boolean
  readonly light?: boolean
  readonly formal?: boolean
  readonly compact?: boolean
}): ReactElement {
  const { header, color, accent, vertical, light, formal, compact } = props
  if (formal) return <></>
  return (
    <div
      className={vertical ? 'grid' : 'flex flex-wrap'}
      style={{ gap: vertical ? (compact ? 5 : 8) : compact ? '5px 12px' : '8px 16px', marginTop: compact ? 10 : 14, color, fontSize: compact ? '0.76em' : '0.82em', lineHeight: compact ? 1.42 : 1.55 }}
    >
      {visibleHeaderFields(header).map((field) => (
        <FieldChip
          key={field.key}
          field={field}
          header={header}
          deleteColor={accent}
          className={`${vertical ? 'w-full' : ''} min-w-0 max-w-full flex-wrap items-baseline`}
          style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
        >
          <span style={{ flex: '0 0 auto' }}>{field.label}：</span>
          <span style={{ minWidth: 0, color: light ? '#fff' : undefined, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
            {field.value}
          </span>
        </FieldChip>
      ))}
    </div>
  )
}

export function FormalInfoGrid({ header }: { readonly header: EditableHeader }): ReactElement {
  const fields = visibleHeaderFields(header)
  if (fields.length === 0) return <></>
  return (
    <div className="grid" style={{ gridTemplateColumns: '96px 1fr 96px 1fr', marginTop: 18, borderTop: '1px solid #cbd5e1', borderLeft: '1px solid #cbd5e1', fontSize: '0.8em' }}>
      {fields.map((field) => (
        <div key={field.key} style={{ display: 'contents' }}>
          <div style={formalCell(true)}>{field.label}</div>
          <FieldChip field={field} header={header} deleteColor="#334155" style={formalCell(false)}>{field.value}</FieldChip>
        </div>
      ))}
    </div>
  )
}

function formalCell(label: boolean): CSSProperties {
  return { minHeight: 32, minWidth: 0, padding: '6px 8px', borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', backgroundColor: label ? '#f8fafc' : '#fff', color: label ? '#475569' : '#0f172a', fontWeight: label ? 700 : 400, overflowWrap: 'anywhere', wordBreak: 'break-word' }
}

function visibleHeaderFields(header: EditableHeader): EditableHeader['fields'] {
  return header.fields.filter((field) => !isTemplateExclusiveBaseInfoField(field.label))
}

export function AvatarBox({ header, accent, radius, compact }: { readonly header: EditableHeader; readonly accent: string; readonly radius: number; readonly compact?: boolean }): ReactElement {
  return (
    <AvatarSlot
      header={header}
      render={({ image, uploadOverlay }) => (
        <div className="relative overflow-hidden" style={{ width: compact ? 82 : 96, height: compact ? 98 : 116, borderRadius: radius, border: `2px solid ${lightenHex(accent, 0.55)}`, backgroundColor: '#f8fafc' }}>
          {image}
          {uploadOverlay}
        </div>
      )}
    />
  )
}

export function Metrics(props: {
  readonly config: VariantConfig
  readonly items: string[][]
  readonly onEdit?: () => void
}): ReactElement {
  const { config, items, onEdit } = props
  return (
    <div className="grid grid-cols-3 gap-3" style={{ marginTop: 12 }}>
      {items.map(([value, label], index) => (
        <button
          key={`${index}-${label}`}
          type="button"
          className="text-left transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-slate-300 print:cursor-default"
          style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, backgroundColor: '#fff', cursor: onEdit ? 'pointer' : 'default' }}
          title={onEdit ? '编辑核心业绩' : undefined}
          onClick={(event) => {
            event.stopPropagation()
            onEdit?.()
          }}
        >
          <strong style={{ display: 'block', fontSize: '1.25em', lineHeight: 1.25, color: config.ink }}>{value}</strong>
          <span style={{ color: config.muted, fontSize: '0.78em' }}>{label}</span>
        </button>
      ))}
    </div>
  )
}

export function metricItems(config: VariantConfig, header: EditableHeader): string[][] {
  const defaults = defaultMetricItems(config)
  const customFields = header.baseInfo?.customFields ?? []
  return defaults.map((fallback, index) => {
    const field = customFields.find((item) => item.label === `业绩${index + 1}`)
    if (!field?.value) return fallback
    const parts = field.value.split(/[|｜]/).map((part) => part.trim()).filter(Boolean)
    if (parts.length >= 2) return [parts[0], parts.slice(1).join(' / ')]
    return [field.value, fallback[1]]
  })
}

function defaultMetricItems(config: VariantConfig): string[][] {
  if (config.metrics === 'executive') return [['3.8亿', '年度 GMV 规模'], ['46%', '渠道获客成本下降'], ['60+', '团队规模']]
  if (config.metrics === 'media') return [['10万+', '内容累计曝光'], ['28%', '互动率提升'], ['6个', '账号矩阵运营']]
  return [['32%', '核心漏斗转化提升'], ['120万', '累计服务用户'], ['18人', '跨职能项目协作']]
}

export function buildBaseInfoWithMetrics(baseInfo: BaseInfo | null, items: string[][]): BaseInfo {
  const existing = (baseInfo?.customFields ?? []).filter((field) => !isTemplateMetricField(field.label))
  const metrics = items.map(([value, text], index) => ({
    label: `业绩${index + 1}`,
    value: `${value}｜${text}`,
  }))
  return {
    ...(baseInfo ?? {}),
    customFields: [...existing, ...metrics],
  }
}

export function MetricsDialog(props: {
  readonly config: VariantConfig
  readonly values: string[][]
  readonly onClose: () => void
  readonly onSave: (items: string[][]) => void
}): ReactElement {
  const { config, values, onClose, onSave } = props
  const [items, setItems] = useState<string[][]>(values.map(([value, text]) => [value, text]))

  function updateItem(index: number, part: 0 | 1, value: string): void {
    setItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? [part === 0 ? value : item[0], part === 1 ? value : item[1]] : item
    )))
  }

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>编辑核心业绩</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {items.map(([value, text], index) => (
            <div key={index} className="grid grid-cols-[120px_1fr] gap-3 rounded-lg border border-slate-200 p-3">
              <div className="space-y-2">
                <Label htmlFor={`metric-value-${index}`}>大字内容</Label>
                <Input
                  id={`metric-value-${index}`}
                  value={value}
                  onChange={(event) => updateItem(index, 0, event.target.value)}
                  placeholder={index === 0 ? '3.8亿' : index === 1 ? '46%' : '60+'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`metric-text-${index}`}>说明文字</Label>
                <Input
                  id={`metric-text-${index}`}
                  value={text}
                  onChange={(event) => updateItem(index, 1, event.target.value)}
                  placeholder={index === 0 ? '年度 GMV 规模' : index === 1 ? '渠道获客成本下降' : '团队规模'}
                />
              </div>
            </div>
          ))}
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500">
            这些内容会保存为基础信息的隐藏业绩字段，不会重复显示在联系方式区域。
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button
            style={{ backgroundColor: config.accent }}
            onClick={() => onSave(items.map(([value, text]) => [value.trim(), text.trim()]))}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function campusMetricItems(config: VariantConfig, header: EditableHeader): string[][] {
  const defaults = [['Top 10%', '专业排名 / 成绩亮点'], ['3段', '实习与校园经历'], ['10万+', '项目成果与作品']]
  const customFields = header.baseInfo?.customFields ?? []
  return defaults.map((fallback, index) => {
    const field = customFields.find((item) => item.label === `亮点${index + 1}`)
    if (!field?.value) return fallback
    const parts = field.value.split(/[|｜]/).map((part) => part.trim()).filter(Boolean)
    if (parts.length >= 2) return [parts[0], parts.slice(1).join(' / ')]
    return [field.value, fallback[1]]
  })
}

export function buildBaseInfoWithHighlights(baseInfo: BaseInfo | null, items: string[][]): BaseInfo {
  const existing = (baseInfo?.customFields ?? []).filter((field) => !isTemplateHighlightField(field.label))
  const highlights = items.map(([value, text], index) => ({
    label: `亮点${index + 1}`,
    value: `${value}｜${text}`,
  }))
  return {
    ...(baseInfo ?? {}),
    customFields: [...existing, ...highlights],
  }
}

export function CampusHighlightsDialog(props: {
  readonly config: VariantConfig
  readonly values: string[][]
  readonly onClose: () => void
  readonly onSave: (items: string[][]) => void
}): ReactElement {
  const { config, values, onClose, onSave } = props
  const [items, setItems] = useState<string[][]>(values.map(([value, text]) => [value, text]))

  function updateItem(index: number, part: 0 | 1, value: string): void {
    setItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? [part === 0 ? value : item[0], part === 1 ? value : item[1]] : item
    )))
  }

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>编辑页眉亮点</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {items.map(([value, text], index) => (
            <div key={index} className="grid grid-cols-[120px_1fr] gap-3 rounded-lg border border-slate-200 p-3">
              <div className="space-y-2">
                <Label htmlFor={`highlight-value-${index}`}>大字内容</Label>
                <Input
                  id={`highlight-value-${index}`}
                  value={value}
                  onChange={(event) => updateItem(index, 0, event.target.value)}
                  placeholder={index === 0 ? 'Top 10%' : index === 1 ? '3段' : '10万+'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`highlight-text-${index}`}>说明文字</Label>
                <Input
                  id={`highlight-text-${index}`}
                  value={text}
                  onChange={(event) => updateItem(index, 1, event.target.value)}
                  placeholder={index === 0 ? '专业排名 / 成绩亮点' : index === 1 ? '实习与校园经历' : '项目成果与作品'}
                />
              </div>
            </div>
          ))}
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500">
            这些内容会保存为基础信息的隐藏亮点字段，不会重复显示在联系方式区域。
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button
            style={{ backgroundColor: config.accent }}
            onClick={() => onSave(items.map(([value, text]) => [value.trim(), text.trim()]))}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function JobIntentionBlock({ jobIntention, config }: { readonly jobIntention: EditableJobIntention; readonly config: VariantConfig }): ReactElement {
  return (
    <section className="group/job relative" onClick={jobIntention.openEditModal} style={{ marginTop: 20, cursor: 'pointer' }}>
      <SectionTitle title="求职意向" config={config} />
      <div className="flex flex-wrap" style={{ gap: '8px 18px', color: config.muted, fontSize: '0.86em' }}>
        {jobIntention.fields.map((field) => <JobField key={field.key} field={field} jobIntention={jobIntention} config={config} />)}
      </div>
      <button type="button" className="absolute right-0 top-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 opacity-0 shadow-sm transition-opacity hover:bg-slate-50 group-hover/job:opacity-100 print:hidden" onClick={(e) => { e.stopPropagation(); jobIntention.openEditModal() }}>编辑</button>
    </section>
  )
}

export function SidebarJob({ jobIntention, accent }: { readonly jobIntention: EditableJobIntention; readonly accent: string }): ReactElement {
  return (
    <div className="group/job relative" onClick={jobIntention.openEditModal} style={{ marginTop: 26, cursor: 'pointer' }}>
      <h3 style={{ margin: '0 0 10px', color: accent, fontSize: '0.95em', fontWeight: 800 }}>求职意向</h3>
      <div className="grid" style={{ gap: 5, fontSize: '0.82em', color: 'currentColor', opacity: 0.86 }}>
        {jobIntention.fields.map((field) => <JobField key={field.key} field={field} jobIntention={jobIntention} config={CONFIG.lifeng} />)}
      </div>
    </div>
  )
}

function JobField(props: {
  readonly field: { readonly key: string; readonly label: string; readonly value: string }
  readonly jobIntention: EditableJobIntention
  readonly config: VariantConfig
}): ReactElement {
  const { field, jobIntention, config } = props
  const hovered = jobIntention.hoveredField === field.key
  return (
    <span
      className="relative inline-flex min-w-0 max-w-full flex-wrap items-baseline"
      style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
      onMouseEnter={() => jobIntention.setHoveredField(field.key)}
      onMouseLeave={() => jobIntention.setHoveredField(null)}
    >
      <span style={{ flex: '0 0 auto' }}>{field.label}：</span>
      <strong style={{ minWidth: 0, color: config.id === 'lifeng' ? 'inherit' : config.ink, fontWeight: 600, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
        {field.value}
      </strong>
      <button type="button" className="absolute -right-3 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[12px] leading-none text-red-500 shadow-sm print:hidden" style={{ opacity: hovered ? 1 : 0 }} onClick={(e) => { e.stopPropagation(); jobIntention.deleteField(field.key) }}>×</button>
    </span>
  )
}

export function SectionStack({ sections, theme, config }: { readonly sections: readonly Section[]; readonly theme: ThemeTokens; readonly config: VariantConfig }): ReactElement {
  const gap = config.density === 'ultra' ? 12 : config.density === 'compact' ? 16 : config.formal ? 18 : 22
  return (
    <main className="flex flex-col" style={{ gap: `${gap * theme.spacingScale}px`, marginTop: config.density === 'ultra' ? 12 : config.formal ? 18 : 22 }}>
      {sections.map((section, index) => (
        <SortableSection key={section.id} sectionId={section.id}>
          {(dragProps) => <ConceptSection section={section} dragProps={dragProps} theme={theme} config={config} index={index} />}
        </SortableSection>
      ))}
    </main>
  )
}

export function SidebarSections({ sections, theme, config, dark }: { readonly sections: readonly Section[]; readonly theme: ThemeTokens; readonly config: VariantConfig; readonly dark?: boolean }): ReactElement {
  return (
    <div className="grid" style={{ gap: 18, marginTop: 24 }}>
      {sections.map((section) => (
        <SortableSection key={section.id} sectionId={section.id}>
          {(dragProps) => <ConceptSection section={section} dragProps={dragProps} theme={theme} config={config} compact dark={dark} />}
        </SortableSection>
      ))}
    </div>
  )
}

export function ConceptSection(props: {
  readonly section: Section
  readonly dragProps: DragHandleProps
  readonly theme: ThemeTokens
  readonly config: VariantConfig
  readonly index?: number
  readonly compact?: boolean
  readonly dark?: boolean
}): ReactElement {
  const { section, dragProps, theme, config, index, compact, dark } = props
  const editable = useEditableSection(section)
  const titleScale = Math.min(1.18, Math.max(0.88, theme.titleScale ?? 1))
  const rendererStyles: BlockRendererStyles = {
    title: { className: dark ? 'font-semibold text-slate-50' : 'font-semibold' },
    subtitle: { className: dark ? 'text-slate-300' : 'text-gray-600' },
    dateRange: { className: dark ? 'text-slate-300 ml-4 shrink-0' : 'text-gray-500 ml-4 shrink-0' },
    content: `original-rich mt-2 ${dark ? 'text-slate-200' : ''}`,
    contentColor: dark ? '#e2e8f0' : undefined,
  }

  return (
    <section className="group/section relative" onMouseEnter={() => editable.setHovered(true)} onMouseLeave={() => editable.setHovered(false)}>
      <div className="relative">
        <div style={{ display: config.sectionStyle === 'numbered' ? 'flex' : 'block', alignItems: 'center', gap: 10, marginBottom: config.sectionStyle === 'numbered' ? 10 : 0 }}>
          {config.sectionStyle === 'numbered' ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 999, backgroundColor: config.accent, color: '#fff', fontSize: '0.78em', fontWeight: 800 }}>
              {String((index ?? 0) + 1).padStart(2, '0')}
            </span>
          ) : null}
          <EditableText
            as="h2"
            value={editable.title}
            onCommit={editable.canEditTitle ? editable.onCommitTitle : undefined}
            style={sectionTitleStyle(config, titleScale, compact, dark)}
          />
        </div>
        <SectionActions visible={editable.isHovered} isTextOnly={editable.isTextOnly} onAdd={editable.onAddBlock} onDelete={editable.onRequestDelete} dragProps={dragProps} />
      </div>
      <BlockList
        section={editable}
        themeColor={config.accent}
        spacingScale={(config.density === 'ultra' ? 0.62 : config.density === 'compact' ? 0.78 : 1) * theme.spacingScale}
        className={section.columns === 2 && !compact ? 'grid grid-cols-2 gap-4' : 'flex flex-col'}
        rendererStyles={rendererStyles}
      />
      <DeleteSectionDialog open={editable.isDeleteDialogOpen} sectionTitle={editable.title} onOpenChange={editable.setDeleteDialogOpen} onConfirm={editable.confirmDelete} />
    </section>
  )
}

function SectionTitle({ title, config }: { readonly title: string; readonly config: VariantConfig }): ReactElement {
  return <h2 style={sectionTitleStyle(config, 1, false, false)}>{title}</h2>
}

function sectionTitleStyle(config: VariantConfig, titleScale: number, compact?: boolean, dark?: boolean): CSSProperties {
  const base: CSSProperties = {
    margin: '0 0 10px',
    fontSize: `${(compact ? 0.95 : config.formal ? 1.04 : 1.12) * titleScale}em`,
    lineHeight: 1.35,
    fontWeight: 800,
    color: dark ? '#a78bfa' : config.accent,
  }
  if (config.formal) return { ...base, padding: '5px 10px', borderLeft: `5px solid ${config.accent}`, backgroundColor: '#f1f5f9', color: config.ink }
  if (config.sectionStyle === 'numbered') return { ...base, margin: 0, color: config.ink, borderBottom: `1px solid ${lightenHex(config.accent, 0.68)}`, paddingBottom: 5, flex: 1 }
  if (config.sectionStyle === 'pill') return { ...base, display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: 999, backgroundColor: lightenHex(config.accent, 0.88), color: config.accent, borderBottom: 'none' }
  if (config.sectionStyle === 'minimal') return { ...base, color: dark ? config.accent : config.ink, borderBottom: `1px solid ${lightenHex(config.accent, 0.72)}`, paddingBottom: 5 }
  if (config.id === 'yuanshan') return { ...base, display: 'flex', alignItems: 'center', gap: 10, color: config.accent, fontFamily: SERIF, borderBottom: `1px solid ${config.accent}`, paddingBottom: 6 }
  if (config.id === 'lifeng') return { ...base, display: 'flex', alignItems: 'center', gap: 10, color: config.accent, borderBottom: dark ? 'none' : `1px solid ${lightenHex(config.accent, 0.45)}`, paddingBottom: dark ? 0 : 5 }
  if (config.id === 'qingsui') return { ...base, color: dark ? '#a78bfa' : config.accent }
  return { ...base, color: dark ? '#a78bfa' : config.accent, borderBottom: compact ? 'none' : `1px solid ${lightenHex(config.accent, 0.7)}`, paddingBottom: compact ? 0 : 6 }
}

function SectionActions(props: {
  readonly visible: boolean
  readonly isTextOnly: boolean
  readonly onAdd: () => void
  readonly onDelete: () => void
  readonly dragProps: DragHandleProps
}): ReactElement {
  const { visible, isTextOnly, onAdd, onDelete, dragProps } = props
  const attachDragHandle = (element: HTMLButtonElement | null): void => {
    dragProps.ref(element)
  }
  const sortAttributes = dragProps.attributes as Record<string, unknown>
  const sortListeners = dragProps.listeners as Record<string, unknown>
  return (
    <div className="absolute right-0 top-0 flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1 py-0.5 shadow-sm transition-opacity print:hidden" style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}>
      <button type="button" ref={attachDragHandle} {...sortAttributes} {...sortListeners} className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100" title="拖动"><GripVertical size={14} /></button>
      {!isTextOnly ? <button type="button" onClick={(e) => { e.stopPropagation(); onAdd() }} className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100" title="添加"><Plus size={14} /></button> : null}
      <button type="button" onClick={(e) => { e.stopPropagation(); onDelete() }} className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-red-50 hover:text-red-600" title="删除"><Trash2 size={14} /></button>
    </div>
  )
}
