'use client'

import { useCallback, useRef, useState, type ChangeEvent, type ReactElement, type ReactNode } from 'react'
import { Mail, Phone, PlusCircle, Trash2, GripVertical, Upload } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import type { ResumeData } from '@/entities/resume/resume-data'
import { getHeaderJobIntentionText, isHeaderJobIntentionVisible } from '@/entities/resume/header-job-intention'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import type { Section } from '@/entities/resume/section'
import type { BaseInfo } from '@/entities/user/base-info'
import BlockWrapper from '@/components/blocks/block-wrapper'
import DeleteSectionDialog from '@/components/sections/delete-section-dialog'
import BaseInfoModal from '@/components/modals/base-info-modal'
import AvatarCropModal from '@/components/modals/avatar-crop-modal'
import JobIntentionModal from '@/components/modals/job-intention-modal'
import EditableBlockWrapper from '@/editor/editable-block-wrapper'
import EditableDateField from '@/editor/editable-date-field'
import EditableFieldWrapper from '@/editor/editable-field-wrapper'
import SortableSectionWrapper from '@/components/sections/sortable-section-wrapper'
import DragDropProvider from '@/dnd/drag-drop-provider'
import { DndIds } from '@/dnd/ids'
import { isCustomSection } from '@/entities/blocks/block-factory'
import { useAiSection } from '@/components/ai-section/ai-section-provider'
import { blockTypeToModuleType, extractBlockContentHtml } from '@/components/ai-section/block-module-utils'
import { useAppStore } from '@/state/store'

interface DenseTemplateProps {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
}

const DEFAULT_ACCENT = '#4fb8ba'
const INK = '#111111'
const MUTED = '#333333'
const DEFAULT_NEUTRAL_COLORS = new Set(['#000000', '#0f172a', '#111111', '#111827', '#1e293b', '#1f2937', '#7c3aed'])

function isTextOnlySection(section: Section): boolean {
  return section.blocks.length > 0 && section.blocks.every((block) => block.type === 'text')
}

function blockLabel(type: string): string {
  if (type === 'experience') return '工作经历'
  if (type === 'project') return '项目经历'
  if (type === 'education') return '教育经历'
  if (type === 'campus') return '校园经历'
  if (type === 'list') return '列表'
  return '内容'
}

function resolveAccent(color: string): string {
  const normalized = color.trim().toLowerCase()
  if (!normalized || DEFAULT_NEUTRAL_COLORS.has(normalized)) {
    return DEFAULT_ACCENT
  }
  return color
}

export default function DenseTemplate(props: DenseTemplateProps): ReactElement {
  const { resume, theme } = props
  const accent = resolveAccent(theme.primaryColor)
  const pagePadding = `${theme.pagePaddingVertical}mm ${theme.pagePaddingHorizontal}mm`
  const contentLineHeight = theme.lineHeight

  return (
    <div
      className="resume-container mx-auto bg-white text-black"
      data-page-padding-vertical={theme.pagePaddingVertical}
      style={{
        color: theme.textColor || INK,
        fontFamily: theme.fontFamily,
        fontSize: `${theme.fontSize}px`,
        lineHeight: theme.lineHeight,
        padding: pagePadding,
      }}
    >
      <style>{`
        .dense-template p { margin: 0; }
        .dense-template ul, .dense-template ol { margin: 0; padding-left: 1.15em; }
        .dense-template li { margin: 0; }
        .dense-template [contenteditable] { min-height: 1em; }
      `}</style>
      <div className="dense-template relative" style={{ paddingLeft: 40 }}>
        <div
          aria-hidden
          className="absolute bottom-2 top-2 w-px"
          style={{ left: 5, backgroundColor: `${accent}66` }}
        />

        <DenseHeader resume={resume} accent={accent} lineHeight={contentLineHeight} />

        <DragDropProvider
          resume={resume}
          theme={theme}
          onMoveSection={useAppStore((s) => s.moveSection)}
          onMoveWithinSection={useAppStore((s) => s.moveBlockInSection)}
          onMoveToSection={useAppStore((s) => s.moveBlockToSection)}
          renderSectionOverlay={(sectionId: string) => {
            const section = resume.sections.find((item) => item.id === sectionId)
            if (!section) return null
            return (
              <div className="rounded border border-slate-200 bg-white p-3 shadow">
                <h2 className="text-base font-semibold">{section.title}</h2>
              </div>
            )
          }}
        >
          <main className="relative" style={{ marginTop: `${16 * theme.spacingScale}px` }}>
            {resume.sections.map((section) => (
              <SortableSectionWrapper key={section.id} sectionId={section.id}>
                {(sectionDragProps) => (
                  <DenseSection
                    section={section}
                    accent={accent}
                    spacingScale={theme.spacingScale}
                    lineHeight={contentLineHeight}
                    dragHandleAttributes={sectionDragProps.attributes}
                    dragHandleListeners={sectionDragProps.listeners}
                    dragHandleRef={sectionDragProps.ref}
                  />
                )}
              </SortableSectionWrapper>
            ))}
          </main>
        </DragDropProvider>
      </div>
    </div>
  )
}

function DenseHeader(props: { readonly resume: ResumeData; readonly accent: string; readonly lineHeight: number }): ReactElement {
  const { resume, accent, lineHeight } = props
  const baseInfo = resume.baseInfo ?? null
  const jobIntention = resume.jobIntention ?? null
  const isJobIntentionVisible = resume.jobIntentionVisible ?? Boolean(jobIntention)
  const showHeaderJobIntention = isHeaderJobIntentionVisible(resume)
  const [showModal, setShowModal] = useState(false)
  const [showJobModal, setShowJobModal] = useState(false)
  const [avatarHovered, setAvatarHovered] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const updateBaseInfo = useAppStore((state) => state.updateBaseInfo)
  const updateJobIntention = useAppStore((state) => state.updateJobIntention)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCropSave = useCallback((croppedDataUrl: string): void => {
    updateBaseInfo({ ...baseInfo, avatarUrl: croppedDataUrl, showAvatar: true } as BaseInfo, resume.name)
    setCropImageSrc(null)
  }, [baseInfo, resume.name, updateBaseInfo])

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (): void => setCropImageSrc(reader.result as string)
    reader.readAsDataURL(file)
    event.target.value = ''
  }, [])

  const customFields = baseInfo?.customFields ?? []
  const workYears = customFields.find((field) => field.label.includes('工作') || field.label.includes('经验'))?.value
  const expectedSalary = showHeaderJobIntention
    ? jobIntention?.salary || customFields.find((field) => field.label.includes('薪'))?.value
    : undefined
  const intention = showHeaderJobIntention
    ? getHeaderJobIntentionText(resume) || customFields.find((field) => field.label.includes('意向') || field.label.includes('岗位'))?.value
    : undefined
  const jobFields = [
    jobIntention?.position ? { label: '意向岗位', value: jobIntention.position } : null,
    jobIntention?.salary ? { label: '期望薪资', value: jobIntention.salary } : null,
    jobIntention?.city ? { label: '意向城市', value: jobIntention.city } : null,
    jobIntention?.type ? { label: '求职类型', value: jobIntention.type } : null,
    jobIntention?.industry ? { label: '期望行业', value: jobIntention.industry } : null,
    jobIntention?.currentStatus ? { label: '当前状态', value: jobIntention.currentStatus } : null,
    ...(jobIntention?.customFields ?? []),
  ].filter((field): field is { label: string; value: string } => Boolean(field?.value))
  const visibleCustomFields = customFields.filter((field) => field.value)
  const profileLine = [
    baseInfo?.gender,
    baseInfo?.age ? `年龄：${baseInfo.age}` : undefined,
    baseInfo?.currentLocation || baseInfo?.location,
  ].filter(Boolean)
  const intentionLine = [
    workYears,
    intention ? `求职意向：${intention}` : undefined,
    expectedSalary ? `期望薪资：${expectedSalary}` : undefined,
  ].filter(Boolean)

  return (
    <>
      <header className="group/header relative min-h-[92px] pr-[126px]">
        <span
          aria-hidden
          className="absolute h-[9px] w-[9px] rounded-full"
          style={{ left: -40, top: 8, backgroundColor: accent }}
        />
        <button
          type="button"
          className="block text-left print:cursor-default"
          onClick={() => setShowModal(true)}
        >
          <h1 className="mb-2 text-[2em] font-extrabold leading-none tracking-normal" style={{ color: INK }}>
            {resume.name}
          </h1>
          <div className="grid gap-1 text-[0.88em]" style={{ color: INK, lineHeight }}>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {profileLine.map((item, index) => (
                <MetaFragment key={String(item)} showDivider={index > 0}>{item}</MetaFragment>
              ))}
              {baseInfo?.phone ? (
                <span className="inline-flex items-center gap-1">
                  <Phone size={12} color="#aab1b8" />
                  {baseInfo.phone}
                </span>
              ) : null}
              {baseInfo?.email ? (
                <span className="inline-flex items-center gap-1 break-all">
                  <Mail size={12} color="#aab1b8" />
                  {baseInfo.email}
                </span>
              ) : null}
            </div>
            {intentionLine.length > 0 ? (
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                {intentionLine.map((item, index) => (
                  <MetaFragment key={String(item)} showDivider={index > 0}>{item}</MetaFragment>
                ))}
              </div>
            ) : null}
          </div>
        </button>

        {isJobIntentionVisible && jobFields.length > 0 ? (
          <button
            type="button"
            className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-left text-[0.86em] print:cursor-default"
            style={{ color: INK, lineHeight }}
            onClick={() => setShowJobModal(true)}
          >
            {jobFields.map((field) => (
              <span key={`${field.label}-${field.value}`} className="inline-flex max-w-full gap-1">
                <span className="shrink-0">{field.label}：</span>
                <strong className="break-words font-medium">{field.value}</strong>
              </span>
            ))}
          </button>
        ) : null}

        {visibleCustomFields.length > 0 ? (
          <button
            type="button"
            className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-left text-[0.84em] print:cursor-default"
            style={{ color: MUTED, lineHeight }}
            onClick={() => setShowModal(true)}
          >
            {visibleCustomFields.map((field) => (
              <span key={`${field.label}-${field.value}`} className="inline-flex max-w-full gap-1">
                <span className="shrink-0">{field.label}：</span>
                <span className="break-words">{field.value}</span>
              </span>
            ))}
          </button>
        ) : null}

        {baseInfo?.showAvatar !== false ? (
          <div
            className="absolute right-0 top-0 h-[87px] w-[87px] overflow-hidden rounded-[9px] bg-slate-100"
            onMouseEnter={() => setAvatarHovered(true)}
            onMouseLeave={() => setAvatarHovered(false)}
          >
            {baseInfo?.avatarUrl ? (
              <img src={baseInfo.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <AvatarPlaceholder />
            )}
            {avatarHovered ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 print:hidden">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded bg-white/95 px-2 py-1 text-[11px] font-medium text-slate-800"
                  onClick={(event) => {
                    event.stopPropagation()
                    fileInputRef.current?.click()
                  }}
                >
                  <Upload size={12} />
                  本地上传
                </button>
                <button
                  type="button"
                  className="rounded border border-white/70 px-2 py-0.5 text-[11px] text-white"
                  onClick={(event) => {
                    event.stopPropagation()
                    setShowModal(true)
                  }}
                >
                  编辑
                </button>
              </div>
            ) : null}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
        ) : null}
      </header>

      {showModal ? (
        <BaseInfoModal baseInfo={baseInfo} name={resume.name} onClose={() => setShowModal(false)} onSave={updateBaseInfo} />
      ) : null}
      {showJobModal ? (
        <JobIntentionModal jobIntention={jobIntention} onClose={() => setShowJobModal(false)} onSave={updateJobIntention} />
      ) : null}
      {cropImageSrc ? (
        <AvatarCropModal imageSrc={cropImageSrc} onSave={handleCropSave} onClose={() => setCropImageSrc(null)} />
      ) : null}
    </>
  )
}

function MetaFragment(props: { readonly children: ReactNode; readonly showDivider: boolean }): ReactElement {
  return (
    <span className="inline-flex items-center gap-2">
      {props.showDivider ? <span>|</span> : null}
      <span>{props.children}</span>
    </span>
  )
}

function AvatarPlaceholder(): ReactElement {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#eef0f2] text-slate-300">
      <svg viewBox="0 0 64 80" fill="currentColor" width="52" height="64" aria-hidden="true">
        <circle cx="32" cy="23" r="14" />
        <path d="M8 75c0-14 10.8-25 24-25s24 11 24 25v5H8v-5z" />
      </svg>
    </div>
  )
}

interface DenseSectionProps {
  readonly section: Section
  readonly accent: string
  readonly spacingScale: number
  readonly lineHeight: number
  readonly dragHandleAttributes?: unknown
  readonly dragHandleListeners?: unknown
  readonly dragHandleRef?: (element: HTMLElement | null) => void
}

function DenseSection(props: DenseSectionProps): ReactElement {
  const { section, accent, spacingScale, lineHeight, dragHandleAttributes, dragHandleListeners, dragHandleRef } = props
  const blockIds = section.blocks.map((block) => block.id)
  const addBlock = useAppStore((state) => state.addBlockByType)
  const deleteSection = useAppStore((state) => state.deleteSection)
  const updateSectionTitle = useAppStore((state) => state.updateSectionTitle)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [hovered, setHovered] = useState(false)
  const { setNodeRef } = useDroppable({ id: `${DndIds.SECTION_DROP_ID_PREFIX}${section.id}` })
  const textOnly = isTextOnlySection(section)

  return (
    <section
      className="group/section relative"
      style={{ marginBottom: `${18 * spacingScale}px` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        aria-hidden
        className="absolute h-[9px] w-[9px] rounded-full"
        style={{ left: -40, top: 6, backgroundColor: accent }}
      />
      <div className="relative mb-2 flex items-start justify-between gap-3">
        <EditableSectionTitle
          sectionId={section.id}
          title={section.title}
          canEdit={isCustomSection(section.title)}
          onChange={(title) => updateSectionTitle(section.id, title)}
        />
        <div
          className="flex items-center gap-1 rounded border border-slate-200 bg-white px-1 py-0.5 shadow-sm transition-opacity print:hidden"
          style={{ opacity: hovered ? 1 : 0, pointerEvents: hovered ? 'auto' : 'none' }}
        >
          {!textOnly ? (
            <button type="button" className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100" title="添加" onClick={() => addBlock(section.id)}>
              <PlusCircle size={14} />
            </button>
          ) : null}
          <button type="button" className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-red-50 hover:text-red-600" title="删除" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 size={14} />
          </button>
          {dragHandleRef ? (
            <button
              type="button"
              ref={dragHandleRef as (element: HTMLButtonElement | null) => void}
              {...(dragHandleAttributes as Record<string, unknown>)}
              {...(dragHandleListeners as Record<string, unknown>)}
              className="flex h-6 w-6 cursor-grab items-center justify-center rounded text-slate-500 hover:bg-slate-100 active:cursor-grabbing"
              title="拖动"
            >
              <GripVertical size={14} />
            </button>
          ) : null}
        </div>
      </div>

      <SortableContext items={blockIds} strategy={rectSortingStrategy}>
        <div ref={setNodeRef} className="flex flex-col">
          {section.blocks.map((block, index) => (
            <DenseBlock
              key={block.id}
              block={block}
              sectionId={section.id}
              index={index}
              total={section.blocks.length}
              spacingScale={spacingScale}
              lineHeight={lineHeight}
            />
          ))}
        </div>
      </SortableContext>

      <DeleteSectionDialog
        open={showDeleteDialog}
        sectionTitle={section.title}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => {
          deleteSection(section.id)
          setShowDeleteDialog(false)
        }}
      />
    </section>
  )
}

function EditableSectionTitle(props: {
  readonly sectionId: string
  readonly title: string
  readonly canEdit: boolean
  readonly onChange: (value: string) => void
}): ReactElement {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(props.title)

  function commit(): void {
    const trimmed = value.trim()
    if (trimmed && trimmed !== props.title) {
      props.onChange(trimmed)
    } else {
      setValue(props.title)
    }
    setIsEditing(false)
  }

  if (!props.canEdit) {
    return <h2 className="m-0 text-[1.28em] font-medium leading-tight text-black">{props.title}</h2>
  }

  if (isEditing) {
    return (
      <input
        className="m-0 max-w-[220px] bg-blue-50 text-[1.28em] font-medium leading-tight text-black outline-none ring-1 ring-blue-500"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit()
          if (event.key === 'Escape') {
            setValue(props.title)
            setIsEditing(false)
          }
        }}
        autoFocus
      />
    )
  }

  return (
    <h2
      className="m-0 cursor-text text-[1.28em] font-medium leading-tight text-black hover:bg-slate-50"
      onClick={() => {
        setValue(props.title)
        setIsEditing(true)
      }}
    >
      {props.title}
    </h2>
  )
}

function DenseBlock(props: {
  readonly block: ResumeBlock
  readonly sectionId: string
  readonly index: number
  readonly total: number
  readonly spacingScale: number
  readonly lineHeight: number
}): ReactElement {
  const { block, sectionId, index, total, spacingScale, lineHeight } = props
  const addBlock = useAppStore((state) => state.addBlockByType)
  const deleteBlock = useAppStore((state) => state.deleteBlock)
  const moveBlockUp = useAppStore((state) => state.moveBlockUp)
  const moveBlockDown = useAppStore((state) => state.moveBlockDown)
  const [isEditing, setIsEditing] = useState(false)
  const { openPolish, openGenerate } = useAiSection()
  const moduleType = blockTypeToModuleType(block.type)
  const bottom = index < total - 1 ? `${12 * spacingScale}px` : 0

  return (
    <div style={{ marginBottom: bottom }}>
      <BlockWrapper
        blockType={blockLabel(block.type)}
        onAdd={block.type !== 'text' ? (): void => addBlock(sectionId) : undefined}
        onPolish={moduleType ? (): void => openPolish(block.id, extractBlockContentHtml(block), moduleType) : undefined}
        onGenerate={moduleType ? (): void => openGenerate(block.id, moduleType, block) : undefined}
        onDelete={(): void => deleteBlock(sectionId, block.id)}
        onMoveUp={index > 0 ? (): void => moveBlockUp(sectionId, block.id) : undefined}
        onMoveDown={index < total - 1 ? (): void => moveBlockDown(sectionId, block.id) : undefined}
        showDragHandle={false}
        disableHover={isEditing}
      >
        <BlockContent block={block} lineHeight={lineHeight} onEditingChange={setIsEditing} />
      </BlockWrapper>
    </div>
  )
}

function BlockContent(props: { readonly block: ResumeBlock; readonly lineHeight: number; readonly onEditingChange: (editing: boolean) => void }): ReactElement {
  const { block, lineHeight, onEditingChange } = props
  const strongFieldClass = 'font-semibold !leading-[inherit]'

  if (block.type === 'experience') {
    return (
      <article>
        <DenseBlockHead lineHeight={lineHeight} date={<DateRange blockId={block.id} startDate={block.startDate} endDate={block.endDate} />}>
          <EditableFieldWrapper blockId={block.id} fieldName="company" value={block.company} onUpdate={() => {}} className={strongFieldClass} onEditingChange={onEditingChange} />
          <span>|</span>
          <EditableFieldWrapper blockId={block.id} fieldName="position" value={block.position} onUpdate={() => {}} className={strongFieldClass} onEditingChange={onEditingChange} />
        </DenseBlockHead>
        <DenseRichText blockId={block.id} field="contentHtml" lineHeight={lineHeight} onEditingChange={onEditingChange} />
      </article>
    )
  }

  if (block.type === 'project') {
    return (
      <article>
        <DenseBlockHead lineHeight={lineHeight} date={<DateRange blockId={block.id} startDate={block.startDate} endDate={block.endDate} />}>
          <EditableFieldWrapper blockId={block.id} fieldName="name" value={block.name} onUpdate={() => {}} className={strongFieldClass} onEditingChange={onEditingChange} />
          {block.role ? <span>|</span> : null}
          {block.role ? <EditableFieldWrapper blockId={block.id} fieldName="role" value={block.role} onUpdate={() => {}} className={strongFieldClass} onEditingChange={onEditingChange} /> : null}
        </DenseBlockHead>
        <DenseRichText blockId={block.id} field="contentHtml" lineHeight={lineHeight} onEditingChange={onEditingChange} />
      </article>
    )
  }

  if (block.type === 'education') {
    return (
      <article>
        <DenseBlockHead lineHeight={lineHeight} date={<DateRange blockId={block.id} startDate={block.startDate} endDate={block.endDate} />}>
          <EditableFieldWrapper blockId={block.id} fieldName="school" value={block.school} onUpdate={() => {}} className={strongFieldClass} onEditingChange={onEditingChange} />
          {block.degree ? <span>|</span> : null}
          {block.degree ? <EditableFieldWrapper blockId={block.id} fieldName="degree" value={block.degree} onUpdate={() => {}} className={strongFieldClass} onEditingChange={onEditingChange} /> : null}
          {block.major ? <span>|</span> : null}
          {block.major ? <EditableFieldWrapper blockId={block.id} fieldName="major" value={block.major} onUpdate={() => {}} className={strongFieldClass} onEditingChange={onEditingChange} /> : null}
        </DenseBlockHead>
        {block.courseHtml ? <DenseRichText blockId={block.id} field="courseHtml" lineHeight={lineHeight} onEditingChange={onEditingChange} /> : null}
      </article>
    )
  }

  if (block.type === 'campus') {
    return (
      <article>
        <DenseBlockHead lineHeight={lineHeight} date={<DateRange blockId={block.id} startDate={block.startDate} endDate={block.endDate} />}>
          <EditableFieldWrapper blockId={block.id} fieldName="organization" value={block.organization} onUpdate={() => {}} className={strongFieldClass} onEditingChange={onEditingChange} />
          <span>|</span>
          <EditableFieldWrapper blockId={block.id} fieldName="position" value={block.position} onUpdate={() => {}} className={strongFieldClass} onEditingChange={onEditingChange} />
        </DenseBlockHead>
        <DenseRichText blockId={block.id} field="contentHtml" lineHeight={lineHeight} onEditingChange={onEditingChange} />
      </article>
    )
  }

  if (block.type === 'text') {
    return <DenseRichText blockId={block.id} field="html" lineHeight={lineHeight} onEditingChange={onEditingChange} />
  }

  if (block.type === 'list') {
    return (
      <ul className="dense-body-text m-0 list-none p-0 text-[0.9em]" style={{ color: MUTED, lineHeight }}>
        {block.items.map((item) => (
          <li key={item.id} dangerouslySetInnerHTML={{ __html: item.html }} />
        ))}
      </ul>
    )
  }

  return <></>
}

function DenseBlockHead(props: { readonly children: ReactNode; readonly date: ReactNode; readonly lineHeight: number }): ReactElement {
  return (
    <div className="mb-1 grid grid-cols-[1fr_auto] items-baseline gap-x-4 text-[1em]" style={{ lineHeight: props.lineHeight }}>
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1">{props.children}</div>
      <div className="whitespace-nowrap text-right text-[0.9em] font-normal" style={{ color: MUTED }}>
        {props.date}
      </div>
    </div>
  )
}

function DateRange(props: { readonly blockId: string; readonly startDate: string; readonly endDate: string }): ReactElement {
  return (
    <span className="inline-flex items-center gap-0.5">
      <EditableDateField blockId={props.blockId} fieldName="startDate" value={props.startDate} />
      <span>-</span>
      <EditableDateField blockId={props.blockId} fieldName="endDate" value={props.endDate} />
    </span>
  )
}

function DenseRichText(props: {
  readonly blockId: string
  readonly field: 'contentHtml' | 'courseHtml' | 'html'
  readonly lineHeight: number
  readonly onEditingChange: (editing: boolean) => void
}): ReactElement {
  return (
    <div className="dense-body-text" style={{ lineHeight: props.lineHeight }}>
      <EditableBlockWrapper
        blockId={props.blockId}
        contentField={props.field}
        contentSize="xs"
        className="text-[0.9em] text-[#222] [&_li]:!leading-[inherit] [&_p]:!leading-[inherit]"
        editingStyle={{ lineHeight: props.lineHeight }}
        onEditingChange={props.onEditingChange}
      />
    </div>
  )
}
