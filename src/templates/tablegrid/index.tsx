"use client"

import { useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import type { Section } from '@/entities/resume/section'
import BlockWrapper from '@/components/blocks/block-wrapper'
import EditableBlockWrapper from '@/editor/editable-block-wrapper'
import EditableDateField from '@/editor/editable-date-field'
import EditableFieldWrapper from '@/editor/editable-field-wrapper'
import { useAiSection } from '@/components/ai-section/ai-section-provider'
import { blockTypeToModuleType, extractBlockContentHtml } from '@/components/ai-section/block-module-utils'
import { useAppStore } from '@/state/store'
import {
  AvatarSlot,
  BlockList,
  DeleteSectionDialog,
  EditableText,
  FieldChip,
  mmToPx,
  ResumeFrame,
  SortableSection,
  useEditableHeader,
  useEditableJobIntention,
  useEditableSection,
} from '@/templates/_core'
import type { DragHandleProps, TemplateProps } from '@/templates/_core'

const DEFAULT_PRIMARY = '#3d4b58'
const INK = '#20242c'
const MUTED = '#59636e'
const SANS = '"Inter", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif'

interface TablePalette {
  readonly primary: string
  readonly labelBg: string
  readonly border: string
  readonly ink: string
  readonly muted: string
  readonly photoBg: string
}

function normalizeHex(color: string | undefined): string {
  if (!color) return DEFAULT_PRIMARY
  const raw = color.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`
  }
  return DEFAULT_PRIMARY
}

function mixHex(color: string, target: string, amount: number): string {
  const from = normalizeHex(color).slice(1)
  const to = normalizeHex(target).slice(1)
  const next = [0, 2, 4].map((start) => {
    const source = Number.parseInt(from.slice(start, start + 2), 16)
    const destination = Number.parseInt(to.slice(start, start + 2), 16)
    return Math.round(source + (destination - source) * amount)
      .toString(16)
      .padStart(2, '0')
  })
  return `#${next.join('')}`
}

function buildPalette(primaryColor: string | undefined): TablePalette {
  const primary = normalizeHex(primaryColor)
  return {
    primary,
    labelBg: mixHex(primary, '#ffffff', 0.9),
    border: mixHex(primary, '#d7dee2', 0.78),
    ink: INK,
    muted: MUTED,
    photoBg: mixHex(primary, '#ffffff', 0.86),
  }
}

function getBlockTypeLabel(type: string): string {
  if (type === 'experience') return '工作经历'
  if (type === 'project') return '项目经历'
  if (type === 'education') return '教育经历'
  if (type === 'campus') return '校园经历'
  return '内容'
}

function normalizeTitle(title: string): string {
  return title.replace(/\s/g, '').toLowerCase()
}

function sectionMinHeight(section: Section): number {
  const title = normalizeTitle(section.title)
  if (title.includes('教育')) return 122
  if (title.includes('项目')) return 240
  if (title.includes('工作') || title.includes('实习')) return 180
  if (title.includes('校园')) return 120
  if (title.includes('技能')) return 93
  if (title.includes('自我') || title.includes('评价')) return 125
  return 110
}

export default function TableGridTemplate(props: TemplateProps): ReactElement {
  const { resume, theme } = props
  const header = useEditableHeader(resume.name, resume.baseInfo ?? null)
  const jobIntention = useEditableJobIntention(resume.jobIntention ?? null)
  const isJobIntentionVisible = resume.jobIntentionVisible ?? jobIntention.fields.length > 0
  const headerInfoField = getTableHeaderInfoField(header)
  const topHeaderFieldKeys = new Set(
    ['phone', 'email', headerInfoField?.key].filter((key): key is string => Boolean(key))
  )
  const extraBaseInfoFields = header.fields.filter((field) => !topHeaderFieldKeys.has(field.key))
  const bodyLineHeight = theme.lineHeight
  const palette = buildPalette(theme.primaryColor)
  const titleScale = Math.min(1.25, Math.max(0.85, theme.titleScale ?? 1))
  const spacingScale = Math.min(1.45, Math.max(0.72, theme.spacingScale))
  const paragraphIndent = Math.max(0, theme.paragraphIndent ?? 0)
  const pagePaddingVertical = Math.max(24, mmToPx(theme.pagePaddingVertical))
  const pagePaddingHorizontal = Math.max(32, mmToPx(theme.pagePaddingHorizontal))

  return (
    <ResumeFrame
      resume={resume}
      theme={theme}
      style={{
        minHeight: '297mm',
        backgroundColor: '#ffffff',
        color: palette.ink,
        fontFamily: theme.fontFamily || SANS,
        fontSize: `${theme.fontSize}px`,
        lineHeight: theme.lineHeight,
        padding: `${pagePaddingVertical}px ${pagePaddingHorizontal}px`,
      }}
    >
      <style>{`
        .tablegrid-rich-text p { margin: 0; text-indent: ${paragraphIndent}em; }
        .tablegrid-rich-text ul, .tablegrid-rich-text ol { margin: 0; padding-left: 1.2em; }
        .tablegrid-rich-text li { margin: 0; }
        .tablegrid-avatar-cell > .relative { height: 100%; }
      `}</style>

      <div
        style={{
          width: '100%',
          border: `1px solid ${palette.border}`,
          borderRadius: 7,
          overflow: 'hidden',
          backgroundColor: '#ffffff',
        }}
      >
        <TableHeader header={header} palette={palette} titleScale={titleScale} />

        {extraBaseInfoFields.length > 0 ? (
          <BaseInfoRow header={header} fields={extraBaseInfoFields} palette={palette} spacingScale={spacingScale} titleScale={titleScale} />
        ) : null}

        {isJobIntentionVisible && jobIntention.fields.length > 0 ? (
          <JobIntentionRow jobIntention={jobIntention} palette={palette} spacingScale={spacingScale} titleScale={titleScale} />
        ) : null}

        <main>
          {resume.sections.map((section, index) => (
            <SortableSection key={section.id} sectionId={section.id}>
              {(dragProps) => (
                <TableSectionRow
                  section={section}
                  dragProps={dragProps}
                  bodyLineHeight={bodyLineHeight}
                  spacingScale={spacingScale}
                  titleScale={titleScale}
                  palette={palette}
                  isLast={index === resume.sections.length - 1}
                />
              )}
            </SortableSection>
          ))}
        </main>
      </div>

      {header.modals}
      {jobIntention.modals}
    </ResumeFrame>
  )
}

function BaseInfoRow({
  header,
  fields,
  palette,
  spacingScale,
  titleScale,
}: {
  readonly header: ReturnType<typeof useEditableHeader>
  readonly fields: readonly Parameters<typeof FieldChip>[0]['field'][]
  readonly palette: TablePalette
  readonly spacingScale: number
  readonly titleScale: number
}): ReactElement {
  return (
    <div
      className="grid cursor-pointer"
      style={{
        gridTemplateColumns: '90px 1fr',
        minHeight: Math.round(62 * spacingScale),
        borderBottom: `1px solid ${palette.border}`,
      }}
      onClick={header.openEditModal}
    >
      <RowLabel palette={palette} titleScale={titleScale}>基本信息</RowLabel>
      <div
        className="flex min-w-0 flex-wrap content-center"
        style={{
          gap: `${6 * spacingScale}px ${16 * spacingScale}px`,
          padding: `${11 * spacingScale}px ${16 * spacingScale}px`,
          fontSize: '0.82em',
          lineHeight: 1.45,
          color: palette.ink,
        }}
      >
        {fields.map((field) => (
          <span key={field.key} className="inline-flex max-w-full min-w-0 items-baseline">
            <span style={{ flex: '0 0 auto', color: palette.muted }}>{field.label}：</span>
            <HeaderFieldChip field={field} header={header} />
          </span>
        ))}
      </div>
    </div>
  )
}

function findHeaderField(header: ReturnType<typeof useEditableHeader>, keyOrLabel: string) {
  return header.fields.find((field) => field.key === keyOrLabel || field.label.includes(keyOrLabel))
}

function getTableHeaderInfoField(header: ReturnType<typeof useEditableHeader>) {
  return findHeaderField(header, '出生')
    ?? findHeaderField(header, 'age')
    ?? findHeaderField(header, '年龄')
    ?? header.fields.find((field) => !['phone', 'email'].includes(field.key))
}

function TableHeader({
  header,
  palette,
  titleScale,
}: {
  readonly header: ReturnType<typeof useEditableHeader>
  readonly palette: TablePalette
  readonly titleScale: number
}): ReactElement {
  const infoField = getTableHeaderInfoField(header)
  const phone = findHeaderField(header, 'phone')
  const email = findHeaderField(header, 'email')
  const showAvatar = header.baseInfo?.showAvatar !== false
  const showSecondaryColumn = Boolean(showAvatar || infoField || phone)
  const gridTemplateColumns = showSecondaryColumn
    ? `90px minmax(0, 1fr) 90px minmax(0, 1fr)${showAvatar ? ' 109px' : ''}`
    : '90px minmax(0, 1fr)'

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns,
        gridTemplateRows: '72px 72px',
        borderBottom: `1px solid ${palette.border}`,
        cursor: 'pointer',
      }}
      onClick={header.openEditModal}
    >
      <HeaderLabel compact palette={palette} titleScale={titleScale}>姓名</HeaderLabel>
      <HeaderValue strong palette={palette}>
        <EditableText value={header.name} onCommit={header.onCommitName} />
      </HeaderValue>
      {showSecondaryColumn ? (
        <>
          <HeaderLabel palette={palette} titleScale={titleScale}>{infoField?.label ?? ''}</HeaderLabel>
          <HeaderValue palette={palette}>{infoField ? <HeaderFieldChip field={infoField} header={header} /> : null}</HeaderValue>

          {showAvatar ? (
            <div
              className="tablegrid-avatar-cell"
              data-tablegrid-avatar-cell="true"
              style={{ gridColumn: 5, gridRow: '1 / span 2', borderLeft: `1px solid ${palette.border}` }}
              onClick={(event) => event.stopPropagation()}
            >
              <AvatarSlot
                header={header}
                render={({ image, uploadOverlay }) => (
                  <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: palette.photoBg }}>
                    {image}
                    {uploadOverlay}
                  </div>
                )}
              />
            </div>
          ) : null}

          <HeaderLabel compact palette={palette} titleScale={titleScale}>邮箱</HeaderLabel>
          <HeaderValue palette={palette} dataField="email">{email ? <HeaderFieldChip field={email} header={header} /> : null}</HeaderValue>
          <HeaderLabel palette={palette} titleScale={titleScale}>{phone?.label ?? ''}</HeaderLabel>
          <HeaderValue palette={palette}>{phone ? <HeaderFieldChip field={phone} header={header} /> : null}</HeaderValue>
        </>
      ) : (
        <>
          <HeaderLabel compact palette={palette} titleScale={titleScale}>邮箱</HeaderLabel>
          <HeaderValue palette={palette} dataField="email">{email ? <HeaderFieldChip field={email} header={header} /> : null}</HeaderValue>
        </>
      )}
    </div>
  )
}

function HeaderFieldChip({
  field,
  header,
}: {
  readonly field: Parameters<typeof FieldChip>[0]['field']
  readonly header: ReturnType<typeof useEditableHeader>
}): ReactElement {
  return (
    <FieldChip
      field={field}
      header={header}
      style={{
        display: 'inline',
        maxWidth: '100%',
        overflowWrap: 'anywhere',
        wordBreak: 'break-word',
      }}
    >
      {field.value}
    </FieldChip>
  )
}

function HeaderLabel({
  children,
  palette,
  titleScale,
  compact = false,
}: {
  readonly children: ReactNode
  readonly palette: TablePalette
  readonly titleScale: number
  readonly compact?: boolean
}): ReactElement {
  return (
    <div
      className="flex items-center justify-center"
      style={{
        borderRight: `1px solid ${palette.border}`,
        borderBottom: `1px solid ${palette.border}`,
        backgroundColor: palette.labelBg,
        color: palette.primary,
        fontSize: `${titleScale}em`,
        fontWeight: 800,
        lineHeight: 1,
        letterSpacing: compact ? '0.75em' : 0,
        paddingLeft: compact ? '0.75em' : 0,
      }}
    >
      {children}
    </div>
  )
}

function HeaderValue({
  children,
  palette,
  strong = false,
  dataField,
}: {
  readonly children: ReactNode
  readonly palette: TablePalette
  readonly strong?: boolean
  readonly dataField?: string
}): ReactElement {
  return (
    <div
      className="flex min-w-0 items-center overflow-hidden"
      data-tablegrid-header-value={dataField ?? undefined}
      style={{
        borderRight: `1px solid ${palette.border}`,
        borderBottom: `1px solid ${palette.border}`,
        paddingLeft: 16,
        fontSize: '1.04em',
        lineHeight: 1.2,
        fontWeight: strong ? 800 : 500,
        color: palette.ink,
      }}
    >
      <span style={{ minWidth: 0, maxWidth: '100%', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
        {children}
      </span>
    </div>
  )
}

function JobIntentionRow({
  jobIntention,
  palette,
  spacingScale,
  titleScale,
}: {
  readonly jobIntention: ReturnType<typeof useEditableJobIntention>
  readonly palette: TablePalette
  readonly spacingScale: number
  readonly titleScale: number
}): ReactElement {
  return (
    <div
      className="grid cursor-pointer"
      style={{
        gridTemplateColumns: '90px 1fr',
        minHeight: Math.round(71 * spacingScale),
        borderBottom: `1px solid ${palette.border}`,
      }}
      onClick={jobIntention.openEditModal}
    >
      <RowLabel palette={palette} titleScale={titleScale}>求职意向</RowLabel>
      <div
        className="flex min-w-0 flex-wrap content-center"
        style={{
          gap: `${6 * spacingScale}px ${18 * spacingScale}px`,
          padding: `${12 * spacingScale}px ${16 * spacingScale}px`,
          fontSize: '0.88em',
          lineHeight: 1.45,
          fontWeight: 500,
          color: palette.ink,
        }}
      >
        {jobIntention.fields.map((field) => {
          const isHovered = jobIntention.hoveredField === field.key
          return (
            <span
              key={field.key}
              className="relative inline-flex max-w-full min-w-0 items-baseline"
              style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
              onMouseEnter={() => jobIntention.setHoveredField(field.key)}
              onMouseLeave={() => jobIntention.setHoveredField(null)}
            >
              <span style={{ flex: '0 0 auto', color: palette.muted }}>{field.label}：</span>
              <span style={{ minWidth: 0, color: palette.ink, fontWeight: 600 }}>{field.value}</span>
              <button
                type="button"
                className="absolute -right-3 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[12px] leading-none text-red-500 shadow-sm print:hidden"
                style={{ opacity: isHovered ? 1 : 0 }}
                onClick={(event) => {
                  event.stopPropagation()
                  jobIntention.deleteField(field.key)
                }}
              >
                ×
              </button>
            </span>
          )
        })}
      </div>
    </div>
  )
}

interface TableSectionRowProps {
  readonly section: Section
  readonly dragProps: DragHandleProps
  readonly bodyLineHeight: number
  readonly spacingScale: number
  readonly titleScale: number
  readonly palette: TablePalette
  readonly isLast: boolean
}

function TableSectionRow(props: TableSectionRowProps): ReactElement {
  const { section, dragProps, bodyLineHeight, spacingScale, titleScale, palette, isLast } = props
  const editable = useEditableSection(section)
  const verticalPadding = Math.round(18 * spacingScale)
  const horizontalPadding = Math.round(16 * spacingScale)

  return (
    <section
      className="group/table-section grid"
      style={{
        gridTemplateColumns: '90px 1fr',
        minHeight: Math.round(sectionMinHeight(section) * spacingScale),
        borderBottom: isLast ? 0 : `1px solid ${palette.border}`,
      }}
      onMouseEnter={() => editable.setHovered(true)}
      onMouseLeave={() => editable.setHovered(false)}
    >
      <RowLabel palette={palette} titleScale={titleScale}>
        <EditableText
          as="span"
          value={editable.title}
          onCommit={editable.canEditTitle ? editable.onCommitTitle : undefined}
        />
      </RowLabel>

      <div className="relative" style={{ padding: `${verticalPadding}px ${horizontalPadding}px ${Math.max(10, verticalPadding - 4)}px` }}>
        <SectionActions
          visible={editable.isHovered}
          isTextOnly={editable.isTextOnly}
          onAdd={editable.onAddBlock}
          onDelete={editable.onRequestDelete}
          dragProps={dragProps}
        />

        <BlockList
          section={editable}
          themeColor={palette.primary}
          spacingScale={spacingScale}
          className="flex flex-col"
          renderBlock={({ block, index, total }) => (
            <TableBlock
              block={block}
              sectionId={section.id}
              index={index}
              total={total}
              bodyLineHeight={bodyLineHeight}
              spacingScale={spacingScale}
              titleScale={titleScale}
              palette={palette}
            />
          )}
        />
      </div>

      <DeleteSectionDialog
        open={editable.isDeleteDialogOpen}
        sectionTitle={editable.title}
        onOpenChange={editable.setDeleteDialogOpen}
        onConfirm={editable.confirmDelete}
      />
    </section>
  )
}

function RowLabel({
  children,
  palette,
  titleScale,
}: {
  readonly children: ReactNode
  readonly palette: TablePalette
  readonly titleScale: number
}): ReactElement {
  return (
    <div
      className="flex items-center justify-center text-center"
      style={{
        borderRight: `1px solid ${palette.border}`,
        backgroundColor: palette.labelBg,
        color: palette.primary,
        fontSize: `${titleScale}em`,
        fontWeight: 800,
        lineHeight: 1.15,
        padding: '0 10px',
      }}
    >
      {children}
    </div>
  )
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
    <div
      className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1 py-0.5 shadow-sm transition-opacity print:hidden"
      style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
    >
      <button type="button" ref={attachDragHandle} {...sortAttributes} {...sortListeners} className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100" title="拖动">
        <GripVertical size={14} />
      </button>
      {!isTextOnly ? (
        <button type="button" onClick={(e) => { e.stopPropagation(); onAdd() }} className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100" title="添加">
          <Plus size={14} />
        </button>
      ) : null}
      <button type="button" onClick={(e) => { e.stopPropagation(); onDelete() }} className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-red-50 hover:text-red-600" title="删除">
        <Trash2 size={14} />
      </button>
    </div>
  )
}

interface TableBlockProps {
  readonly block: ResumeBlock
  readonly sectionId: string
  readonly index: number
  readonly total: number
  readonly bodyLineHeight: number
  readonly spacingScale: number
  readonly titleScale: number
  readonly palette: TablePalette
}

function TableBlock(props: TableBlockProps): ReactElement {
  const { block, sectionId, index, total, bodyLineHeight, spacingScale, titleScale, palette } = props
  const addBlock = useAppStore((s) => s.addBlockByType)
  const deleteBlock = useAppStore((s) => s.deleteBlock)
  const moveBlockUp = useAppStore((s) => s.moveBlockUp)
  const moveBlockDown = useAppStore((s) => s.moveBlockDown)
  const [isEditing, setIsEditing] = useState(false)
  const { openPolish, openGenerate } = useAiSection()
  const moduleType = blockTypeToModuleType(block.type)

  return (
    <div style={{ marginBottom: index < total - 1 ? `${22 * spacingScale}px` : 0 }}>
      <BlockWrapper
        blockType={getBlockTypeLabel(block.type)}
        onAdd={block.type !== 'text' ? (): void => addBlock(sectionId) : undefined}
        onPolish={moduleType ? (): void => openPolish(block.id, extractBlockContentHtml(block), moduleType) : undefined}
        onGenerate={moduleType ? (): void => openGenerate(block.id, moduleType, block) : undefined}
        onDelete={(): void => deleteBlock(sectionId, block.id)}
        onMoveUp={index > 0 ? (): void => moveBlockUp(sectionId, block.id) : undefined}
        onMoveDown={index < total - 1 ? (): void => moveBlockDown(sectionId, block.id) : undefined}
        showDragHandle={false}
        disableHover={isEditing}
      >
        <BlockBody block={block} bodyLineHeight={bodyLineHeight} titleScale={titleScale} palette={palette} onEditingChange={setIsEditing} />
      </BlockWrapper>
    </div>
  )
}

function BlockBody(props: {
  readonly block: ResumeBlock
  readonly bodyLineHeight: number
  readonly titleScale: number
  readonly palette: TablePalette
  readonly onEditingChange: (value: boolean) => void
}): ReactElement {
  const { block, bodyLineHeight, titleScale, palette, onEditingChange } = props

  if (block.type === 'text') {
    return (
      <TextContent lineHeight={bodyLineHeight}>
        <EditableBlockWrapper blockId={block.id} contentField="html" contentSize="sm" className="tablegrid-rich-text" onEditingChange={onEditingChange} />
      </TextContent>
    )
  }

  return (
    <div>
      <BlockHeader block={block} titleScale={titleScale} palette={palette} onEditingChange={onEditingChange} />
      <BlockContent block={block} lineHeight={bodyLineHeight} onEditingChange={onEditingChange} />
    </div>
  )
}

function BlockHeader({
  block,
  titleScale,
  palette,
  onEditingChange,
}: {
  readonly block: ResumeBlock
  readonly titleScale: number
  readonly palette: TablePalette
  readonly onEditingChange: (value: boolean) => void
}): ReactElement {
  if (block.type === 'education') {
    return (
      <TitleMetaWithDate
        title={<EditableFieldWrapper blockId={block.id} fieldName="school" value={block.school ?? ''} onUpdate={() => {}} onEditingChange={onEditingChange} />}
        meta={[
          <EditableFieldWrapper key="major" blockId={block.id} fieldName="major" value={block.major ?? ''} onUpdate={() => {}} />,
          <EditableFieldWrapper key="degree" blockId={block.id} fieldName="degree" value={block.degree ?? ''} onUpdate={() => {}} />,
        ]}
        block={block}
        titleScale={titleScale}
        palette={palette}
      />
    )
  }

  if (block.type === 'experience') {
    return (
      <TitleMetaWithDate
        title={<EditableFieldWrapper blockId={block.id} fieldName="company" value={block.company ?? ''} onUpdate={() => {}} onEditingChange={onEditingChange} />}
        meta={[<EditableFieldWrapper key="position" blockId={block.id} fieldName="position" value={block.position ?? ''} onUpdate={() => {}} />]}
        block={block}
        titleScale={titleScale}
        palette={palette}
      />
    )
  }

  if (block.type === 'project') {
    return (
      <TitleMetaWithDate
        title={<EditableFieldWrapper blockId={block.id} fieldName="name" value={block.name ?? ''} onUpdate={() => {}} onEditingChange={onEditingChange} />}
        meta={[<EditableFieldWrapper key="role" blockId={block.id} fieldName="role" value={block.role ?? ''} onUpdate={() => {}} />]}
        block={block}
        titleScale={titleScale}
        palette={palette}
      />
    )
  }

  if (block.type === 'campus') {
    return (
      <TitleMetaWithDate
        title={<EditableFieldWrapper blockId={block.id} fieldName="organization" value={block.organization ?? ''} onUpdate={() => {}} onEditingChange={onEditingChange} />}
        meta={[<EditableFieldWrapper key="position" blockId={block.id} fieldName="position" value={block.position ?? ''} onUpdate={() => {}} />]}
        block={block}
        titleScale={titleScale}
        palette={palette}
        plainDate
      />
    )
  }

  return <></>
}

function TitleMetaWithDate(props: {
  readonly title: ReactNode
  readonly meta: readonly ReactNode[]
  readonly block: Extract<ResumeBlock, { startDate?: string; endDate?: string }>
  readonly titleScale: number
  readonly palette: TablePalette
  readonly plainDate?: boolean
}): ReactElement {
  const { title, meta, block, titleScale, palette, plainDate } = props
  const visibleMeta = meta.filter(Boolean)
  return (
    <div className="flex min-w-0 items-start justify-between gap-3" style={{ marginBottom: 7 }}>
      <div className="flex min-w-0 flex-wrap items-baseline" style={{ gap: '0.35em 1.2em' }}>
        <h2 style={{ margin: 0, fontSize: `${1.03 * titleScale}em`, lineHeight: 1.25, fontWeight: 700, color: palette.ink }}>
          {title}
        </h2>
        {visibleMeta.map((item, index) => (
          <span key={index} style={{ fontSize: `${0.97 * titleScale}em`, lineHeight: 1.25, fontWeight: 700, color: palette.ink }}>
            {item}
          </span>
        ))}
      </div>
      <div className="shrink-0 whitespace-nowrap" style={{ fontSize: `${0.97 * titleScale}em`, lineHeight: 1.25, fontWeight: 700, color: palette.ink }}>
        {plainDate ? (
          <>
            <EditableFieldWrapper blockId={block.id} fieldName="startDate" value={block.startDate ?? ''} onUpdate={() => {}} />
            <span> - </span>
            <EditableFieldWrapper blockId={block.id} fieldName="endDate" value={block.endDate ?? ''} onUpdate={() => {}} />
          </>
        ) : (
          <>
            <EditableDateField blockId={block.id} fieldName="startDate" value={block.startDate ?? ''} />
            <span>-</span>
            <EditableDateField blockId={block.id} fieldName="endDate" value={block.endDate ?? ''} />
          </>
        )}
      </div>
    </div>
  )
}

function BlockContent(props: {
  readonly block: ResumeBlock
  readonly lineHeight: number
  readonly onEditingChange: (value: boolean) => void
}): ReactElement {
  const { block, lineHeight, onEditingChange } = props

  if (block.type === 'education') {
    return block.courseHtml ? (
      <TextContent lineHeight={lineHeight}>
        <EditableBlockWrapper blockId={block.id} contentField="courseHtml" contentSize="sm" className="tablegrid-rich-text" onEditingChange={onEditingChange} />
      </TextContent>
    ) : <></>
  }

  if (block.type === 'experience' || block.type === 'project' || block.type === 'campus') {
    return (
      <TextContent lineHeight={lineHeight}>
        <EditableBlockWrapper blockId={block.id} contentField="contentHtml" contentSize="sm" className="tablegrid-rich-text" onEditingChange={onEditingChange} />
      </TextContent>
    )
  }

  return <></>
}

function TextContent({ children, lineHeight }: { readonly children: ReactNode; readonly lineHeight: number }): ReactElement {
  return (
    <div style={{ color: '#555555', fontSize: '0.98em', lineHeight, fontWeight: 400 }}>
      {children}
    </div>
  )
}
