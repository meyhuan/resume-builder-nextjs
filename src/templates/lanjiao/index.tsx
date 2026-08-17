"use client"

import { useState } from 'react'
import type { CSSProperties, ReactElement, ReactNode } from 'react'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import { getHeaderJobIntentionText } from '@/entities/resume/header-job-intention'
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
  lightenHex,
  mmToPx,
  ResumeFrame,
  SortableSection,
  useEditableHeader,
  useEditableJobIntention,
  useEditableSection,
} from '@/templates/_core'
import type { DragHandleProps, TemplateProps } from '@/templates/_core'

const BLUE = '#0752cf'
const INK = '#111111'
const MUTED = '#3f3f46'
const SANS = '"Inter", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif'

type CssVars = CSSProperties & Record<`--${string}`, string | number>

function getBlockTypeLabel(type: string): string {
  if (type === 'experience') return '工作经历'
  if (type === 'project') return '项目经历'
  if (type === 'education') return '教育经历'
  if (type === 'campus') return '校园经历'
  return '内容'
}

export default function LanjiaoTemplate(props: TemplateProps): ReactElement {
  const { resume, theme } = props
  const header = useEditableHeader(resume.name, resume.baseInfo ?? null)
  const jobIntention = useEditableJobIntention(resume.jobIntention ?? null)
  const isJobIntentionVisible = resume.jobIntentionVisible ?? jobIntention.fields.length > 0
  const headerTitle = getHeaderJobIntentionText(resume)
  const contentLineHeight = Math.max(1.2, theme.lineHeight)
  const titleScale = Math.min(1.18, Math.max(0.88, theme.titleScale ?? 1))
  const primaryColor = theme.primaryColor || BLUE
  const paleBlue = lightenHex(primaryColor, 0.86)
  const pagePaddingVertical = Math.max(28, mmToPx(theme.pagePaddingVertical) * 0.88)
  const pagePaddingHorizontal = Math.max(0, mmToPx(theme.pagePaddingHorizontal) * 0.95)
  const heroHeight = 250
  const contentPaddingTop = Math.max(18 * theme.spacingScale, pagePaddingVertical * 0.48)
  const contentPaddingBottom = Math.max(34, pagePaddingVertical)
  const rootStyle: CssVars = {
    minHeight: '297mm',
    background: `linear-gradient(180deg, #fbfbfb 0%, #fbfbfb 88%, ${lightenHex(primaryColor, 0.91)} 100%)`,
    color: INK,
    fontFamily: theme.fontFamily || SANS,
    '--lanjiao-print-page-padding-v': `${theme.pagePaddingVertical}mm`,
    '--lanjiao-blue': primaryColor,
  }

  return (
    <ResumeFrame
      resume={resume}
      theme={theme}
      className="lanjiao-resume-root"
      style={rootStyle}
    >
      <style>{`
        .lanjiao-rich-text p { margin: 0; }
        .lanjiao-rich-text ul, .lanjiao-rich-text ol { margin: 0; padding-left: 1.2em; }
        .lanjiao-rich-text li { margin: 0; }
        .lanjiao-main-flow > * + * { margin-top: var(--lanjiao-section-gap); }
        @media print {
          .lanjiao-resume-root {
            min-height: calc(297mm - var(--lanjiao-print-page-padding-v) - 2px) !important;
            overflow: visible !important;
          }
          .lanjiao-page-content {
            padding-bottom: 0 !important;
          }
        }
      `}</style>
      <LanjiaoHero
        header={header}
        title={headerTitle}
        primaryColor={primaryColor}
        paleBlue={paleBlue}
        paddingHorizontal={pagePaddingHorizontal}
        paddingTop={pagePaddingVertical}
        minHeight={heroHeight}
      />

      <div
        data-template-padding-probe="true"
        className="lanjiao-page-content"
        style={{
          position: 'relative',
          padding: `${contentPaddingTop}px ${pagePaddingHorizontal}px ${contentPaddingBottom}px ${pagePaddingHorizontal}px`,
          backgroundColor: 'transparent',
        }}
      >
        <main className="lanjiao-main-flow" style={{ '--lanjiao-section-gap': `${36 * theme.spacingScale}px` } as CssVars}>
          {isJobIntentionVisible && jobIntention.fields.length > 0 ? (
            <LanjiaoJobIntentionSection jobIntention={jobIntention} primaryColor={primaryColor} />
          ) : null}
          {resume.sections.map((section) => (
            <SortableSection key={section.id} sectionId={section.id}>
              {(dragProps) => (
                <LanjiaoSection
                  section={section}
                  dragProps={dragProps}
                  spacingScale={theme.spacingScale}
                  contentLineHeight={contentLineHeight}
                  primaryColor={primaryColor}
                  titleScale={titleScale}
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

function LanjiaoHero(props: {
  readonly header: ReturnType<typeof useEditableHeader>
  readonly title: string
  readonly primaryColor: string
  readonly paleBlue: string
  readonly paddingHorizontal: number
  readonly paddingTop: number
  readonly minHeight: number
}): ReactElement {
  const { header, title, primaryColor, paleBlue, paddingHorizontal, paddingTop, minHeight } = props
  const visibleFields = header.fields
  const contactFields = visibleFields.filter((field) => /电话|手机|微信|邮箱|mail|phone/i.test(field.label)).slice(0, 3)
  const nonContactFields = visibleFields.filter((field) => !contactFields.some((item) => item.key === field.key))
  const profileFields = nonContactFields.slice(0, 3)
  const profileFieldKeys = new Set(profileFields.map((field) => field.key))
  const otherFields = nonContactFields.filter((field) => !profileFieldKeys.has(field.key)).slice(0, 8)

  return (
    <header
      className="relative group"
      onClick={header.openEditModal}
      data-template-base-info-trigger="true"
      style={{
        minHeight,
        padding: `${paddingTop}px ${paddingHorizontal}px 0`,
        paddingBottom: 28,
        cursor: 'pointer',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 210,
          height: 162,
          background: `linear-gradient(135deg, ${paleBlue} 0 58%, transparent 58%)`,
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 138,
          top: 16,
          width: 76,
          height: 52,
          opacity: 0.42,
          backgroundImage: `radial-gradient(${lightenHex(primaryColor, 0.58)} 2.3px, transparent 2.3px)`,
          backgroundSize: '12px 12px',
        }}
      />

      <div className="relative z-[1] grid items-start" style={{ gridTemplateColumns: '129px minmax(0, 1fr)', columnGap: 77 }}>
        <div style={{ width: 129, minHeight: 141 }}>
          <AvatarSlot
            header={header}
            render={({ image, uploadOverlay }) => (
              <div className="relative" style={{ width: 129, height: 141 }}>
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: -7,
                    top: -6,
                    width: 38,
                    height: 38,
                    backgroundColor: primaryColor,
                    clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                  }}
                />
                <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: lightenHex(primaryColor, 0.78) }}>
                  {image}
                  {uploadOverlay}
                </div>
              </div>
            )}
          />
        </div>

        <div className="min-w-0 flex-1 pt-3">
          <EditableText
            as="h1"
            value={header.name}
            onCommit={header.onCommitName}
            style={{
              margin: '0 0 22px',
              fontSize: '1.9em',
              lineHeight: 1,
              fontWeight: 800,
              color: primaryColor,
              letterSpacing: 3,
            }}
          />

          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-2"
            data-lanjiao-header-fields="true"
            style={{
              fontSize: '0.82em',
              lineHeight: 1.15,
              color: '#3e3e3e',
            }}
          >
            {profileFields.map((field, index) => (
              <FieldChip
                key={field.key}
                field={field}
                header={header}
                deleteColor={primaryColor}
                className="min-w-0 max-w-full items-baseline whitespace-nowrap"
                style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
              >
                <span style={{ minWidth: 0, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  {index > 0 ? '|' : ''} {field.value}
                </span>
              </FieldChip>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2" style={{ fontSize: '0.82em', lineHeight: 1.3, color: '#3e3e3e' }}>
            {otherFields.map((field, index) => (
              <FieldChip key={field.key} field={field} header={header} deleteColor={primaryColor} className="min-w-0 max-w-full">
                <span style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  {index > 0 ? '|' : ''} {field.label}：{field.value}
                </span>
              </FieldChip>
            ))}
            {title ? <span className="whitespace-nowrap">{otherFields.length > 0 ? '|' : ''} {title}</span> : null}
          </div>
          <div className="mt-5 flex flex-wrap items-start gap-x-12 gap-y-2" style={{ fontSize: '0.8em', lineHeight: 1.35, color: '#444' }}>
            {contactFields.map((field) => (
              <FieldChip key={field.key} field={field} header={header} deleteColor={primaryColor} className="min-w-0 max-w-full">
                <span className="inline-flex min-w-0 items-start gap-2">
                  <span
                    className="mt-[1px] inline-flex shrink-0 items-center justify-center rounded-full text-white"
                    style={{ width: 18, height: 18, backgroundColor: primaryColor, fontSize: 10, lineHeight: 1 }}
                  >
                    {field.label.includes('邮') ? '✉' : field.label.includes('微') ? '微' : '☎'}
                  </span>
                  <span style={{ minWidth: 0, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{field.value}</span>
                </span>
              </FieldChip>
            ))}
          </div>
          <span aria-hidden className="mt-7 block" style={{ width: 40, height: 4, backgroundColor: primaryColor }} />
        </div>
      </div>
    </header>
  )
}

function LanjiaoJobIntentionSection(props: {
  readonly jobIntention: ReturnType<typeof useEditableJobIntention>
  readonly primaryColor: string
}): ReactElement {
  const { jobIntention, primaryColor } = props

  return (
    <section
      className="group/job-intention grid cursor-pointer"
      onClick={jobIntention.openEditModal}
      style={{ gridTemplateColumns: '150px minmax(0, 1fr)', columnGap: 56, minHeight: 30 }}
    >
      <div className="relative">
        <span
          aria-hidden
          className="absolute"
          style={{
            right: -20,
            top: 22,
            width: 0,
            height: 0,
            borderTop: '9px solid transparent',
            borderBottom: '9px solid transparent',
            borderLeft: `14px solid ${lightenHex(primaryColor, 0.66)}`,
          }}
        />
        <h2
          style={{
            margin: 0,
            fontSize: '1.3em',
            lineHeight: 1.2,
            fontWeight: 800,
            color: INK,
          }}
        >
          {jobIntention.sectionTitle}
        </h2>
      </div>
      <div className="relative">
        <button
          type="button"
          className="absolute right-0 top-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 opacity-0 shadow-sm transition-opacity hover:bg-slate-50 group-hover/job-intention:opacity-100 print:hidden"
          onClick={(event) => { event.stopPropagation(); jobIntention.openEditModal() }}
        >
          编辑
        </button>

        <div data-template-job-intention-trigger="true" className="flex flex-wrap" style={{ gap: '8px 18px', fontSize: '0.82em', lineHeight: 1.75, color: MUTED }}>
          {jobIntention.fields.map((field) => {
            const isHovered = jobIntention.hoveredField === field.key
            return (
              <span
                key={field.key}
                className="relative inline-flex items-center"
                onMouseEnter={() => jobIntention.setHoveredField(field.key)}
                onMouseLeave={() => jobIntention.setHoveredField(null)}
              >
                <span style={{ color: '#6b7280' }}>{field.label}： </span>
                <span style={{ color: '#1e242c', fontWeight: 600 }}>{field.value}</span>
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
    </section>
  )
}

interface LanjiaoSectionProps {
  readonly section: Section
  readonly dragProps: DragHandleProps
  readonly spacingScale: number
  readonly contentLineHeight: number
  readonly primaryColor: string
  readonly titleScale: number
}

function LanjiaoSection({ section, dragProps, spacingScale, contentLineHeight, primaryColor, titleScale }: LanjiaoSectionProps): ReactElement {
  const editable = useEditableSection(section)

  return (
    <section
      data-template-section="true"
      className="group/section grid"
      onMouseEnter={() => editable.setHovered(true)}
      onMouseLeave={() => editable.setHovered(false)}
      style={{ gridTemplateColumns: '150px minmax(0, 1fr)', columnGap: 56, minHeight: 30 }}
    >
      <aside className="relative">
        <EditableText
          as="h2"
          value={editable.title}
          onCommit={editable.canEditTitle ? editable.onCommitTitle : undefined}
          style={{
            margin: 0,
            fontSize: `${1.3 * titleScale}em`,
            lineHeight: 1.2,
            fontWeight: 800,
            color: INK,
          }}
        />
        <TimelineDates blocks={section.blocks} primaryColor={primaryColor} spacingScale={spacingScale} />
      </aside>

      <div className="relative min-w-0">
        <div aria-hidden style={{ borderTop: '1px dashed #d1d1d1', margin: '2px 0 27px' }} />
        <SectionActions
          visible={editable.isHovered}
          isTextOnly={editable.isTextOnly}
          onAdd={editable.onAddBlock}
          onDelete={editable.onRequestDelete}
          dragProps={dragProps}
        />

        <BlockList
          section={editable}
          themeColor={primaryColor}
          spacingScale={spacingScale}
          className={section.columns === 2 ? 'grid grid-cols-2 gap-4' : 'flex flex-col'}
          renderBlock={({ block, index, total }) => (
            <LanjiaoBlock
              block={block}
              sectionId={section.id}
              index={index}
              total={total}
              spacingScale={spacingScale}
              contentLineHeight={contentLineHeight}
              titleScale={titleScale}
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

function getBlockDates(block: ResumeBlock): { readonly id: string; readonly startDate: string; readonly endDate: string } | null {
  if (block.type !== 'experience' && block.type !== 'project' && block.type !== 'education' && block.type !== 'campus') return null
  return {
    id: block.id,
    startDate: block.startDate ?? '',
    endDate: block.endDate ?? '',
  }
}

function TimelineDates(props: {
  readonly blocks: readonly ResumeBlock[]
  readonly primaryColor: string
  readonly spacingScale: number
}): ReactElement | null {
  const datedBlocks = props.blocks.map(getBlockDates).filter((item): item is NonNullable<typeof item> => item !== null)
  if (datedBlocks.length === 0) return null

  return (
    <div className="relative" style={{ marginTop: 28 * props.spacingScale, paddingLeft: 16 }}>
      {datedBlocks.length > 1 ? (
        <span
          aria-hidden
          className="absolute"
          style={{
            left: 3,
            top: 14,
            bottom: 14,
            borderLeft: '1px dashed #9d9d9d',
          }}
        />
      ) : null}
      <div className="flex flex-col" style={{ gap: 68 * props.spacingScale }}>
        {datedBlocks.map((block) => (
          <div key={block.id} className="relative whitespace-nowrap" style={{ fontSize: '0.83em', fontWeight: 700, color: '#171717', lineHeight: 1.2 }}>
            <span
              aria-hidden
              className="absolute rounded-full"
              style={{
                left: -16,
                top: 6,
                width: 7,
                height: 7,
                backgroundColor: '#434343',
              }}
            />
            <EditableDateField blockId={block.id} fieldName="startDate" value={block.startDate} />
            <span>-</span>
            <EditableDateField blockId={block.id} fieldName="endDate" value={block.endDate} />
          </div>
        ))}
      </div>
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
      className="absolute right-0 top-0 flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1 py-0.5 shadow-sm transition-opacity print:hidden"
      style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
    >
      <button
        type="button"
        ref={attachDragHandle}
        {...sortAttributes}
        {...sortListeners}
        className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
        title="拖动"
      >
        <GripVertical size={14} />
      </button>
      {!isTextOnly ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onAdd() }}
          className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
          title="添加"
        >
          <Plus size={14} />
        </button>
      ) : null}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-red-50 hover:text-red-600"
        title="删除"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

interface LanjiaoBlockProps {
  readonly block: ResumeBlock
  readonly sectionId: string
  readonly index: number
  readonly total: number
  readonly spacingScale: number
  readonly contentLineHeight: number
  readonly titleScale: number
}

function LanjiaoBlock(props: LanjiaoBlockProps): ReactElement {
  const { block, sectionId, index, total, spacingScale, contentLineHeight, titleScale } = props
  const addBlock = useAppStore((s) => s.addBlockByType)
  const deleteBlock = useAppStore((s) => s.deleteBlock)
  const moveBlockUp = useAppStore((s) => s.moveBlockUp)
  const moveBlockDown = useAppStore((s) => s.moveBlockDown)
  const [isEditing, setIsEditing] = useState(false)
  const { openPolish, openGenerate } = useAiSection()
  const moduleType = blockTypeToModuleType(block.type)

  return (
    <div style={{ marginBottom: index < total - 1 ? `${18 * spacingScale}px` : 0 }}>
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
        <LanjiaoBlockBody block={block} contentLineHeight={contentLineHeight} titleScale={titleScale} onEditingChange={setIsEditing} />
      </BlockWrapper>
    </div>
  )
}

function LanjiaoBlockBody(props: {
  readonly block: ResumeBlock
  readonly contentLineHeight: number
  readonly titleScale: number
  readonly onEditingChange: (value: boolean) => void
}): ReactElement {
  const { block, contentLineHeight, titleScale, onEditingChange } = props

  if (block.type === 'text') {
    return (
      <TextContent lineHeight={contentLineHeight}>
        <EditableBlockWrapper
          blockId={block.id}
          contentField="html"
          contentSize="sm"
          className="lanjiao-rich-text"
          onEditingChange={onEditingChange}
        />
      </TextContent>
    )
  }

  return (
    <div>
      <BlockMetaRow block={block} titleScale={titleScale} onEditingChange={onEditingChange} />
      <StructuredContent block={block} contentLineHeight={contentLineHeight} onEditingChange={onEditingChange} />
    </div>
  )
}

function BlockMetaRow(props: {
  readonly block: ResumeBlock
  readonly titleScale: number
  readonly onEditingChange: (value: boolean) => void
}): ReactElement {
  const { block, titleScale, onEditingChange } = props

  if (block.type === 'education') {
    return (
      <MetaGrid columns="auto auto auto" titleScale={titleScale}>
        <MetaCell blockId={block.id} fieldName="school" value={block.school ?? ''} onEditingChange={onEditingChange} />
        <MetaCell blockId={block.id} fieldName="major" value={block.major ?? ''} />
        <MetaCell blockId={block.id} fieldName="degree" value={block.degree ?? ''} />
      </MetaGrid>
    )
  }

  if (block.type === 'experience') {
    return (
      <MetaGrid columns="auto auto" titleScale={titleScale}>
        <MetaCell blockId={block.id} fieldName="company" value={block.company ?? ''} onEditingChange={onEditingChange} />
        <MetaCell blockId={block.id} fieldName="position" value={block.position ?? ''} />
      </MetaGrid>
    )
  }

  if (block.type === 'project') {
    return (
      <MetaGrid columns="auto auto" titleScale={titleScale}>
        <MetaCell blockId={block.id} fieldName="name" value={block.name ?? ''} onEditingChange={onEditingChange} />
        <MetaCell blockId={block.id} fieldName="role" value={block.role ?? ''} />
      </MetaGrid>
    )
  }

  if (block.type === 'campus') {
    return (
      <MetaGrid columns="auto auto" titleScale={titleScale}>
        <MetaCell blockId={block.id} fieldName="organization" value={block.organization ?? ''} onEditingChange={onEditingChange} />
        <MetaCell blockId={block.id} fieldName="position" value={block.position ?? ''} />
      </MetaGrid>
    )
  }

  return <></>
}

function MetaGrid({ columns, titleScale, children }: { readonly columns: string; readonly titleScale: number; readonly children: ReactNode }): ReactElement {
  return (
    <div
      className="items-baseline"
      style={{
        display: 'grid',
        gridTemplateColumns: columns,
        justifyContent: 'start',
        columnGap: 12,
        marginBottom: 9,
        fontSize: `${1.05 * titleScale}em`,
        lineHeight: 1.2,
        fontWeight: 800,
        color: 'var(--lanjiao-blue)',
      }}
    >
      {children}
    </div>
  )
}

function MetaCell(props: {
  readonly blockId: string
  readonly fieldName: string
  readonly value: string
  readonly onEditingChange?: (value: boolean) => void
}): ReactElement {
  const { blockId, fieldName, value, onEditingChange } = props
  return (
    <div className="min-w-0">
      <EditableFieldWrapper
        blockId={blockId}
        fieldName={fieldName}
        value={value}
        onUpdate={() => {}}
        onEditingChange={onEditingChange}
      />
    </div>
  )
}

function StructuredContent(props: {
  readonly block: ResumeBlock
  readonly contentLineHeight: number
  readonly onEditingChange: (value: boolean) => void
}): ReactElement {
  const { block, contentLineHeight, onEditingChange } = props

  if (block.type === 'education') {
    return block.courseHtml ? (
      <TextContent lineHeight={contentLineHeight}>
        <EditableBlockWrapper
          blockId={block.id}
          contentField="courseHtml"
          contentSize="xs"
          className="lanjiao-rich-text"
          onEditingChange={onEditingChange}
        />
      </TextContent>
    ) : <></>
  }

  if (block.type === 'experience' || block.type === 'project' || block.type === 'campus') {
    return (
      <TextContent lineHeight={contentLineHeight}>
        <EditableBlockWrapper
          blockId={block.id}
          contentField="contentHtml"
          contentSize="xs"
          className="lanjiao-rich-text"
          onEditingChange={onEditingChange}
        />
      </TextContent>
    )
  }

  return <></>
}

function TextContent({ children, lineHeight }: { readonly children: ReactNode; readonly lineHeight: number }): ReactElement {
  return (
    <div
      data-template-body-text="true"
      style={{
        fontSize: '0.98em',
        lineHeight,
        fontWeight: 400,
        color: MUTED,
      }}
    >
      {children}
    </div>
  )
}

