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

export function scaledSpacing(base: number, theme?: Pick<ThemeTokens, 'spacingScale'>): number {
  const scale = Math.max(0.2, theme?.spacingScale ?? 1)
  return Math.round(base * scale * 10) / 10
}

export function sectionStackGap(config: Pick<VariantConfig, 'density' | 'formal'>): number {
  if (config.density === 'ultra') return 12
  if (config.density === 'compact') return 16
  if (config.formal) return 18
  return 22
}

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
      style={{ gap: vertical ? (compact ? 4 : 8) : compact ? '4px 10px' : '8px 16px', marginTop: compact ? 6 : 14, color, fontSize: compact ? '0.74em' : '0.82em', lineHeight: compact ? 1.34 : 1.55 }}
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

export function JobIntentionBlock(props: {
  readonly jobIntention: EditableJobIntention
  readonly config: VariantConfig
  readonly theme?: ThemeTokens
  readonly topMargin?: number
}): ReactElement {
  const { jobIntention, config, theme, topMargin = 12 } = props
  return (
    <section
      className="group/job relative"
      data-template-job-intention-trigger="true"
      onClick={jobIntention.openEditModal}
      style={{ marginTop: scaledSpacing(topMargin, theme), cursor: 'pointer' }}
    >
      <SectionTitle title="求职意向" config={config} />
      <div className="flex flex-wrap" style={{ gap: '5px 12px', color: config.muted, fontSize: '0.95em', lineHeight: 1.36 }}>
        {jobIntention.fields.map((field) => <JobField key={field.key} field={field} jobIntention={jobIntention} config={config} />)}
      </div>
      <button type="button" className="absolute right-0 top-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 opacity-0 shadow-sm transition-opacity hover:bg-slate-50 group-hover/job:opacity-100 print:hidden" onClick={(e) => { e.stopPropagation(); jobIntention.openEditModal() }}>编辑</button>
    </section>
  )
}

export function SidebarJob({ jobIntention, accent }: { readonly jobIntention: EditableJobIntention; readonly accent: string }): ReactElement {
  return (
    <div
      className="group/job relative"
      data-template-job-intention-trigger="true"
      onClick={(event) => {
        event.stopPropagation()
        jobIntention.openEditModal()
      }}
      style={{ marginTop: 26, cursor: 'pointer' }}
    >
      <h3 style={{ margin: '0 0 10px', color: accent, fontSize: '0.95em', fontWeight: 700 }}>求职意向</h3>
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
  const isPlanner = config.id === 'qiance'
  return (
    <span
      className="relative inline-flex min-w-0 max-w-full flex-wrap items-baseline"
      style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
      onMouseEnter={() => jobIntention.setHoveredField(field.key)}
      onMouseLeave={() => jobIntention.setHoveredField(null)}
    >
      <span style={{ flex: '0 0 auto' }}>{field.label}：</span>
      <strong style={{ minWidth: 0, color: config.id === 'lifeng' ? 'inherit' : isPlanner ? config.muted : config.ink, fontWeight: isPlanner ? 500 : 600, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
        {field.value}
      </strong>
      <button type="button" className="absolute -right-3 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[12px] leading-none text-red-500 shadow-sm print:hidden" style={{ opacity: hovered ? 1 : 0 }} onClick={(e) => { e.stopPropagation(); jobIntention.deleteField(field.key) }}>×</button>
    </span>
  )
}

export function SectionStack({ sections, theme, config, topMargin }: { readonly sections: readonly Section[]; readonly theme: ThemeTokens; readonly config: VariantConfig; readonly topMargin?: number }): ReactElement {
  const gap = sectionStackGap(config)
  const marginTop = topMargin ?? (config.density === 'ultra' ? 12 : config.formal ? 18 : 22)
  return (
    <main className="flex flex-col" style={{ gap: `${scaledSpacing(gap, theme)}px`, marginTop: scaledSpacing(marginTop, theme) }}>
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
    <div className="grid" style={{ gap: scaledSpacing(18, theme), marginTop: scaledSpacing(24, theme), textAlign: 'left' }}>
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
  let rendererStyles: BlockRendererStyles = {
    title: { className: dark ? 'font-bold text-slate-50' : 'font-bold', fontSize: '1.03em', fontWeight: '700' },
    subtitle: { className: dark ? 'text-slate-300' : 'text-gray-600', fontSize: '0.97em', fontWeight: '700' },
    dateRange: { className: dark ? 'text-slate-300 ml-4 shrink-0' : 'text-gray-500 ml-4 shrink-0', fontSize: '0.97em', fontWeight: '700' },
    content: `original-rich mt-1 text-[0.98em] ${dark ? 'text-slate-200' : ''}`,
    contentColor: dark ? '#e2e8f0' : undefined,
    contentEditingColor: dark ? '#0f172a' : undefined,
  }
  if (config.id === 'lanfa') {
    rendererStyles = {
      ...rendererStyles,
      header: 'grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 mb-2',
      title: { className: 'font-bold', color: config.accent, fontSize: '1.03em', fontWeight: '700' },
      subtitle: { className: 'text-slate-700', fontSize: '0.97em', fontWeight: '700' },
      dateRange: { className: 'ml-4 shrink-0 whitespace-nowrap', color: config.accent, fontSize: '0.97em', fontWeight: '700' },
      content: 'original-rich mt-1 text-[0.98em]',
    }
  } else if (config.id === 'qiance') {
    rendererStyles = {
      ...rendererStyles,
      header: 'grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 mb-1',
      title: { className: 'font-medium', color: '#4b5563', fontSize: '1.02em', fontWeight: '500' },
      subtitle: { className: 'text-slate-500', fontSize: '0.96em', fontWeight: '500' },
      dateRange: { className: 'ml-4 shrink-0 whitespace-nowrap', color: '#6b7280', fontSize: '0.96em', fontWeight: '500' },
      content: 'original-rich mt-1 text-[0.98em]',
      contentColor: '#374151',
    }
  } else if (config.id === 'heijiao') {
    rendererStyles = {
      ...rendererStyles,
      header: 'grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 mb-1',
      title: { className: 'font-bold', color: config.accent, fontSize: '1.03em', fontWeight: '700' },
      subtitle: { className: 'text-zinc-700', fontSize: '0.97em', fontWeight: '700' },
      dateRange: { className: 'ml-4 shrink-0 whitespace-nowrap', color: config.accent, fontSize: '0.97em', fontWeight: '700' },
      content: 'original-rich mt-1 text-[0.98em]',
      contentColor: '#222',
    }
  } else if (config.id === 'jinhang') {
    rendererStyles = {
      ...rendererStyles,
      header: 'grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 mb-2',
      title: { className: 'font-bold', color: config.accent, fontSize: '1.03em', fontWeight: '700' },
      subtitle: { className: 'text-stone-700', fontSize: '0.97em', fontWeight: '700' },
      dateRange: { className: 'ml-4 shrink-0 whitespace-nowrap', color: config.accent, fontSize: '0.97em', fontWeight: '700' },
      content: 'original-rich mt-1 text-[0.98em]',
      contentColor: '#333',
    }
  } else if (config.id === 'jijian') {
    rendererStyles = {
      ...rendererStyles,
      header: 'grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 mb-2',
      title: { className: 'font-bold', color: config.accent, fontSize: '1.03em', fontWeight: '700' },
      subtitle: { className: 'text-zinc-700', fontSize: '0.97em', fontWeight: '700' },
      dateRange: { className: 'ml-4 shrink-0 whitespace-nowrap', color: config.accent, fontSize: '0.97em', fontWeight: '700' },
      content: 'original-rich mt-1 text-[0.98em]',
      contentColor: '#111',
    }
  }

  return (
    <section
      className="group/section relative"
      data-template-section="true"
      data-template-section-title={section.title}
      onMouseEnter={() => editable.setHovered(true)}
      onMouseLeave={() => editable.setHovered(false)}
    >
      <div className="relative">
        <div style={{ display: config.sectionStyle === 'numbered' ? 'flex' : 'block', alignItems: 'center', gap: 10, marginBottom: config.sectionStyle === 'numbered' ? 10 : 0 }}>
          {config.sectionStyle === 'numbered' ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 999, backgroundColor: config.accent, color: '#fff', fontSize: '0.78em', fontWeight: 700 }}>
              {String((index ?? 0) + 1).padStart(2, '0')}
            </span>
          ) : null}
          <EditableSectionTitle
            title={editable.title}
            canEditTitle={editable.canEditTitle}
            onCommitTitle={editable.onCommitTitle}
            config={config}
            titleScale={titleScale}
            compact={compact}
            dark={dark}
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

function EditableSectionTitle(props: {
  readonly title: string
  readonly canEditTitle: boolean
  readonly onCommitTitle: (value: string) => void
  readonly config: VariantConfig
  readonly titleScale: number
  readonly compact?: boolean
  readonly dark?: boolean
}): ReactElement {
  const { title, canEditTitle, onCommitTitle, config, titleScale, compact, dark } = props
  if (config.id === 'lanying') {
    return (
      <div style={marketingTitleWrapStyle(config)}>
        <EditableText as="h2" value={title} onCommit={canEditTitle ? onCommitTitle : undefined} style={marketingTitleLabelStyle(config, titleScale)} />
        <span style={marketingTitleEnglishStyle()}>{sectionEnglishTitle(title)}</span>
      </div>
    )
  }
  if (config.id === 'qiance') {
    return (
      <div style={plannerTitleWrapStyle(config)}>
        <span aria-hidden style={plannerTitleDotStyle(config)} />
        <EditableText as="h2" value={title} onCommit={canEditTitle ? onCommitTitle : undefined} style={plannerTitleLabelStyle(config, titleScale)} />
        <span style={plannerTitleEnglishStyle(config)}>{sectionEnglishTitle(title)}</span>
      </div>
    )
  }
  if (config.id === 'jinhang') {
    return (
      <div style={bankTitleWrapStyle(config)}>
        <span aria-hidden style={bankTitleLineStyle(config)} />
        <EditableText as="h2" value={title} onCommit={canEditTitle ? onCommitTitle : undefined} style={bankTitleLabelStyle(config, titleScale)} />
        <span style={bankTitleEnglishStyle(config)}>{sectionEnglishTitle(title)}</span>
        <span aria-hidden style={bankTitleLineStyle(config)} />
      </div>
    )
  }
  if (config.id === 'jijian') {
    return (
      <div className="minimal-info-title">
        <EditableText as="h2" value={title} onCommit={canEditTitle ? onCommitTitle : undefined} className="minimal-title-label" />
        <span>{sectionEnglishTitle(title)}</span>
      </div>
    )
  }
  if (config.id === 'shanglan') {
    return (
      <div style={shanglanTitleWrapStyle(config, dark)}>
        <EditableText as="h2" value={title} onCommit={canEditTitle ? onCommitTitle : undefined} style={shanglanTitleLabelStyle(config, titleScale, dark)} />
        <span style={shanglanTitleEnglishStyle(dark)}>{sectionEnglishTitle(title)}</span>
      </div>
    )
  }
  if (config.id === 'lanzix') {
    return (
      <div style={purpleTitleWrapStyle(config)}>
        <PurpleDoubleChevron color={config.accent} />
        <EditableText as="h2" value={title} onCommit={canEditTitle ? onCommitTitle : undefined} style={purpleTitleLabelStyle(config, titleScale)} />
        <span aria-hidden style={purpleTitleLineStyle(config)} />
      </div>
    )
  }
  return (
    <EditableText
      as="h2"
      value={title}
      onCommit={canEditTitle ? onCommitTitle : undefined}
      className={sectionTitleClassName(config)}
      style={sectionTitleStyle(config, titleScale, compact, dark)}
    />
  )
}

function SectionTitle({ title, config }: { readonly title: string; readonly config: VariantConfig }): ReactElement {
  if (config.id === 'lanying') {
    return (
      <div style={marketingTitleWrapStyle(config)}>
        <h2 style={marketingTitleLabelStyle(config, 1)}>{title}</h2>
        <span style={marketingTitleEnglishStyle()}>{sectionEnglishTitle(title)}</span>
      </div>
    )
  }
  if (config.id === 'qiance') {
    return (
      <div style={plannerTitleWrapStyle(config)}>
        <span aria-hidden style={plannerTitleDotStyle(config)} />
        <h2 style={plannerTitleLabelStyle(config, 1)}>{title}</h2>
        <span style={plannerTitleEnglishStyle(config)}>{sectionEnglishTitle(title)}</span>
      </div>
    )
  }
  if (config.id === 'jinhang') {
    return (
      <div style={bankTitleWrapStyle(config)}>
        <span aria-hidden style={bankTitleLineStyle(config)} />
        <h2 style={bankTitleLabelStyle(config, 1)}>{title}</h2>
        <span style={bankTitleEnglishStyle(config)}>{sectionEnglishTitle(title)}</span>
        <span aria-hidden style={bankTitleLineStyle(config)} />
      </div>
    )
  }
  if (config.id === 'jijian') {
    return <div className="minimal-info-title"><h2 className="minimal-title-label">{title}</h2><span>{sectionEnglishTitle(title)}</span></div>
  }
  if (config.id === 'shanglan') {
    return (
      <div style={shanglanTitleWrapStyle(config, false)}>
        <h2 style={shanglanTitleLabelStyle(config, 1, false)}>{title}</h2>
        <span style={shanglanTitleEnglishStyle(false)}>{sectionEnglishTitle(title)}</span>
      </div>
    )
  }
  if (config.id === 'lanzix') {
    return (
      <div style={purpleTitleWrapStyle(config)}>
        <PurpleDoubleChevron color={config.accent} />
        <h2 style={purpleTitleLabelStyle(config, 1)}>{title}</h2>
        <span aria-hidden style={purpleTitleLineStyle(config)} />
      </div>
    )
  }
  return <h2 className={sectionTitleClassName(config)} style={sectionTitleStyle(config, 1, false, false)}>{title}</h2>
}

function sectionTitleClassName(config: VariantConfig): string | undefined {
  if (config.id === 'lanfa') return 'original-legal-title'
  if (config.id === 'jinhang') return 'original-bank-title'
  if (config.id === 'heijiao') return 'original-teacher-title'
  if (config.id === 'jijian') return 'original-minimal-title'
  if (config.id === 'lanzix') return 'original-purple-title'
  return undefined
}

function sectionEnglishTitle(title: string): string {
  if (/求职|意向/.test(title)) return 'Job objective'
  if (/教育|学校|学历|毕业/.test(title)) return 'Education'
  if (/工作/.test(title)) return 'Work experience'
  if (/实习/.test(title)) return 'Internship'
  if (/项目/.test(title)) return 'Project experience'
  if (/校园|社团|学生/.test(title)) return 'Campus experience'
  if (/获奖|荣誉|奖项/.test(title)) return 'Awards'
  if (/证书|资格/.test(title)) return 'Certificates'
  if (/技能/.test(title)) return 'Skills'
  if (/评价|优势|自我/.test(title)) return 'Profile'
  return 'Resume section'
}

function marketingTitleWrapStyle(config: VariantConfig): CSSProperties {
  return { display: 'flex', alignItems: 'flex-end', height: 35, marginBottom: 12, borderBottom: `2px solid ${lightenHex(config.accent, 0.1)}` }
}

function marketingTitleLabelStyle(config: VariantConfig, titleScale: number): CSSProperties {
  return { minWidth: 119, margin: 0, padding: '4px 17px', textAlign: 'center', backgroundColor: config.accent, color: '#fff', fontSize: `${1.15 * titleScale}em`, lineHeight: 1.25, fontWeight: 700 }
}

function marketingTitleEnglishStyle(): CSSProperties {
  return { marginLeft: 12, color: '#111', fontSize: '0.94em', fontWeight: 700, letterSpacing: 0 }
}

function plannerTitleWrapStyle(config: VariantConfig): CSSProperties {
  return { position: 'relative', display: 'flex', alignItems: 'baseline', gap: 10, margin: '0 0 12px', padding: '0 0 6px 16px', borderBottom: `1px dotted ${lightenHex(config.accent, 0.34)}` }
}

function plannerTitleDotStyle(config: VariantConfig): CSSProperties {
  return { position: 'absolute', left: 0, bottom: -4, width: 8, height: 8, borderRadius: 999, backgroundColor: config.accent }
}

function plannerTitleLabelStyle(config: VariantConfig, titleScale: number): CSSProperties {
  return { margin: 0, color: '#333', fontSize: `${1.12 * titleScale}em`, lineHeight: 1.25, fontWeight: 700, letterSpacing: '0.08em' }
}

function plannerTitleEnglishStyle(config: VariantConfig): CSSProperties {
  return { color: lightenHex(config.ink, 0.34), fontSize: '0.74em', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }
}

function bankTitleWrapStyle(config: VariantConfig): CSSProperties {
  return { display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 14px', color: config.secondary }
}

function bankTitleLineStyle(config: VariantConfig): CSSProperties {
  return { flex: 1, height: 1, backgroundColor: config.accent }
}

function bankTitleLabelStyle(config: VariantConfig, titleScale: number): CSSProperties {
  return { margin: 0, color: config.accent, fontSize: `${1.08 * titleScale}em`, lineHeight: 1.3, fontWeight: 700, letterSpacing: '0.12em', fontFamily: SERIF, whiteSpace: 'nowrap' }
}

function bankTitleEnglishStyle(config: VariantConfig): CSSProperties {
  return { color: lightenHex(config.secondary, 0.22), fontSize: '0.68em', fontFamily: SERIF, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }
}

function purpleTitleWrapStyle(config: VariantConfig): CSSProperties {
  return { display: 'flex', alignItems: 'center', margin: '0 0 12px', color: config.accent }
}

export function PurpleDoubleChevron({ color, height = '1.4em' }: { readonly color: string; readonly height?: string | number }): ReactElement {
  return (
    <svg height={height} viewBox="40.75 208.82 23.07 16.41" fill={color} aria-hidden style={{ flex: '0 0 auto', marginRight: 8 }}>
      <path d="M 41.914062 225.230469 C 41.640625 225.230469 41.371094 225.128906 41.167969 224.921875 C 40.753906 224.511719 40.753906 223.84375 41.164062 223.429688 L 47.515625 217.066406 L 41.167969 210.734375 C 40.753906 210.320312 40.753906 209.652344 41.164062 209.238281 C 41.578125 208.824219 42.246094 208.824219 42.660156 209.238281 L 49.753906 216.316406 C 49.953125 216.511719 50.0625 216.78125 50.0625 217.0625 C 50.066406 217.339844 49.953125 217.609375 49.757812 217.808594 L 42.660156 224.921875 C 42.453125 225.128906 42.183594 225.230469 41.914062 225.230469" />
      <path d="M 55.664062 225.230469 L 47.351562 225.230469 C 46.925781 225.230469 46.539062 224.976562 46.378906 224.582031 C 46.214844 224.1875 46.304688 223.730469 46.605469 223.429688 L 52.953125 217.066406 L 46.605469 210.734375 C 46.304688 210.429688 46.214844 209.976562 46.375 209.582031 C 46.539062 209.1875 46.925781 208.929688 47.351562 208.929688 L 55.664062 208.929688 C 55.941406 208.929688 56.210938 209.039062 56.410156 209.238281 L 63.503906 216.316406 C 63.703125 216.511719 63.816406 216.78125 63.816406 217.0625 C 63.816406 217.339844 63.703125 217.609375 63.507812 217.808594 L 56.410156 224.921875 C 56.214844 225.121094 55.945312 225.230469 55.664062 225.230469" />
    </svg>
  )
}

function purpleTitleLabelStyle(config: VariantConfig, titleScale: number): CSSProperties {
  return { margin: 0, color: config.accent, fontSize: `${1.28 * titleScale}em`, lineHeight: 1.25, fontWeight: 700 }
}

function purpleTitleLineStyle(config: VariantConfig): CSSProperties {
  return { flex: 1, marginLeft: 8, borderTop: `2px dotted ${lightenHex(config.accent, 0.2)}` }
}

function shanglanTitleColor(config: VariantConfig, dark?: boolean): string {
  return dark ? '#fff' : config.accent
}

function shanglanTitleWrapStyle(config: VariantConfig, dark?: boolean): CSSProperties {
  return { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, minWidth: 0, margin: '0 0 18px', paddingBottom: 8, color: shanglanTitleColor(config, dark), borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.55)' : '#777'}` }
}

function shanglanTitleLabelStyle(config: VariantConfig, titleScale: number, dark?: boolean): CSSProperties {
  return { margin: 0, color: shanglanTitleColor(config, dark), fontSize: `${(dark ? 1.02 : 1.18) * titleScale}em`, lineHeight: 1.22, fontWeight: 700, whiteSpace: 'nowrap' }
}

function shanglanTitleEnglishStyle(dark?: boolean): CSSProperties {
  return { minWidth: 0, color: dark ? 'rgba(255,255,255,0.72)' : '#777', fontSize: '0.78em', lineHeight: 1.2, fontWeight: 400, textAlign: 'right', whiteSpace: 'nowrap' }
}

function sectionTitleStyle(config: VariantConfig, titleScale: number, compact?: boolean, dark?: boolean): CSSProperties {
  const base: CSSProperties = {
    margin: '0 0 10px',
    fontSize: `${(compact ? 0.95 : config.formal ? 1.04 : 1.12) * titleScale}em`,
    lineHeight: 1.35,
    fontWeight: 700,
    color: dark ? '#a78bfa' : config.accent,
  }
  if (config.id === 'lanfa') return { ...base, position: 'relative', display: 'flex', alignItems: 'center', minHeight: 39, margin: '0 0 13px', padding: '0 0 0 52px', color: config.accent, borderBottom: 'none', fontSize: `${1.05 * titleScale}em`, letterSpacing: '0.24em', backgroundImage: 'linear-gradient(#f1f1f1, #f1f1f1)', backgroundRepeat: 'no-repeat', backgroundSize: 'calc(100% - 160px) 6px', backgroundPosition: '160px center' }
  if (config.id === 'heijiao') return { ...base, position: 'relative', display: 'flex', alignItems: 'center', height: 24, margin: '0 0 7px', padding: '0 0 0 13px', backgroundColor: 'transparent', backgroundImage: `linear-gradient(${config.accent}, ${config.accent}), linear-gradient(${config.accent}, ${config.accent})`, backgroundRepeat: 'no-repeat', backgroundSize: '110px 24px, calc(100% - 110px) 1px', backgroundPosition: '0 0, 110px bottom', color: '#fff', borderBottom: 'none', fontSize: `${0.96 * titleScale}em`, letterSpacing: 0 }
  if (config.id === 'jinhang') return { ...base, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '0 0 14px', padding: '0 116px', color: config.secondary, borderBottom: 'none', fontSize: `${1.08 * titleScale}em`, letterSpacing: '0.12em', fontFamily: SERIF, textAlign: 'center' }
  if (config.id === 'jijian') return { ...base, position: 'relative', display: 'flex', alignItems: 'center', width: '100%', minHeight: 30, margin: '0 0 13px', padding: '0 0 0 24px', backgroundColor: 'transparent', backgroundImage: 'linear-gradient(#111, #111), linear-gradient(#111, #111)', backgroundRepeat: 'no-repeat', backgroundSize: '150px 30px, calc(100% - 150px) 2px', backgroundPosition: '0 0, 150px bottom', color: '#fff', borderBottom: 'none', fontSize: `${1.02 * titleScale}em`, letterSpacing: 0 }
  if (config.formal) return { ...base, padding: '5px 10px', borderLeft: `5px solid ${config.accent}`, backgroundColor: '#f1f5f9', color: config.ink }
  if (config.id === 'lanying') return { ...base, display: 'flex', alignItems: 'flex-end', height: 35, margin: '0 0 12px', color: '#111', borderBottom: `2px solid ${lightenHex(config.accent, 0.1)}`, fontSize: `${1.08 * titleScale}em`, letterSpacing: 0 }
  if (config.id === 'qiance') return { ...base, position: 'relative', display: 'flex', alignItems: 'baseline', marginBottom: 12, color: '#333', fontSize: `${1.18 * titleScale}em`, fontWeight: 600, letterSpacing: 2, borderBottom: `1px dotted ${lightenHex(config.accent, 0.34)}`, padding: '0 0 5px 14px', textTransform: 'uppercase' }
  if (config.id === 'shanglan') return { ...base, color: shanglanTitleColor(config, dark), fontSize: `${(dark ? 1.02 : 1.18) * titleScale}em`, borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.55)' : '#777'}`, paddingBottom: 8 }
  if (config.id === 'lanzix') return { ...base, position: 'relative', display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px', padding: '0 0 6px 28px', color: config.accent, fontSize: `${1.28 * titleScale}em`, borderBottom: `2px dotted ${lightenHex(config.accent, 0.25)}` }
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
