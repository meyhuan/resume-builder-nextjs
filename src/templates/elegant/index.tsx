import { useState, useRef, useCallback, cloneElement } from 'react'
import type { ReactElement, ReactNode, ChangeEvent } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { Pencil, XCircle } from 'lucide-react'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import type { BaseInfo } from '@/entities/user/base-info'
import type { Section } from '@/entities/resume/section'
import SectionHeader from '@/components/sections/section-header'
import DeleteSectionDialog from '@/components/sections/delete-section-dialog'
import BlockWrapper from '@/components/blocks/block-wrapper'
import SortableSectionWrapper from '@/components/sections/sortable-section-wrapper'
import { getSectionIcon } from '@/utils/get-section-icon'
import { isCustomSection } from '@/entities/blocks/block-factory'
import { useAppStore } from '@/state/store'
import { useAiSection } from '@/components/ai-section/ai-section-provider'
import { blockTypeToModuleType, extractBlockContentHtml } from '@/components/ai-section/block-module-utils'
import DragDropProvider from '@/dnd/drag-drop-provider'
import { DndIds } from '@/dnd/ids'
import { JobIntentionSection, BlockRenderer, SectionContainer } from '@/templates/components/v2'
import BaseInfoModal from '@/components/modals/base-info-modal'
import AvatarCropModal from '@/components/modals/avatar-crop-modal'
import { IconPhone, IconMail, IconGender, IconAge, IconLocation, IconWorkYear, IconInfo } from '@/components/sections/baseinfo-icons'
import { ELEGANT_TEMPLATE_STYLES, HEADER_BG, ACCENT_GOLD } from './styles'

/** Check if every block in a section is a TextBlock. */
function isTextOnlySection(section: Section): boolean {
  return section.blocks.length > 0 && section.blocks.every((b) => b.type === 'text')
}

interface ElegantTemplateProps {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
}

/** Field definition for base-info rendering. */
interface FieldDef {
  readonly key: string
  readonly label: string
  readonly value: string
  readonly icon: ReactElement
}

/**
 * Build displayable fields from BaseInfo.
 */
function buildFieldDefs(baseInfo: BaseInfo | null): FieldDef[] {
  if (!baseInfo) return []
  const defs: FieldDef[] = []
  if (baseInfo.gender) {
    defs.push({ key: 'gender', label: '性别', value: baseInfo.gender, icon: <IconGender /> })
  }
  if (baseInfo.age !== undefined && baseInfo.age !== null) {
    defs.push({ key: 'age', label: '年龄', value: String(baseInfo.age), icon: <IconAge /> })
  }
  if (baseInfo.phone) {
    defs.push({ key: 'phone', label: '电话', value: baseInfo.phone, icon: <IconPhone /> })
  }
  if (baseInfo.email) {
    defs.push({ key: 'email', label: '邮箱', value: baseInfo.email, icon: <IconMail /> })
  }
  if (baseInfo.currentLocation) {
    defs.push({ key: 'currentLocation', label: '现居', value: baseInfo.currentLocation, icon: <IconLocation /> })
  }
  if (baseInfo.nation) {
    defs.push({ key: 'nation', label: '民族', value: baseInfo.nation, icon: <IconInfo /> })
  }
  if (baseInfo.household) {
    defs.push({ key: 'household', label: '户籍', value: baseInfo.household, icon: <IconInfo /> })
  }
  if (baseInfo.workStartTime) {
    defs.push({ key: 'workStartTime', label: '工作时间', value: baseInfo.workStartTime, icon: <IconWorkYear /> })
  }
  if (baseInfo.politicalStatus) {
    defs.push({ key: 'politicalStatus', label: '政治面貌', value: baseInfo.politicalStatus, icon: <IconInfo /> })
  }
  if (baseInfo.height) {
    defs.push({ key: 'height', label: '身高', value: `${baseInfo.height}cm`, icon: <IconInfo /> })
  }
  if (baseInfo.weight) {
    defs.push({ key: 'weight', label: '体重', value: `${baseInfo.weight}kg`, icon: <IconInfo /> })
  }
  if (baseInfo.customFields) {
    for (const cf of baseInfo.customFields) {
      if (cf.label && cf.value) {
        defs.push({ key: `custom_${cf.label}`, label: cf.label, value: cf.value, icon: <IconInfo /> })
      }
    }
  }
  return defs
}

/**
 * Custom dark header for the Elegant template.
 */
function ElegantHeader(props: {
  readonly name: string
  readonly baseInfo: BaseInfo | null
  readonly themeColor: string
}): ReactElement {
  const { name, baseInfo, themeColor } = props
  const [showModal, setShowModal] = useState(false)
  const [avatarHovered, setAvatarHovered] = useState(false)
  const [hoveredField, setHoveredField] = useState<string | null>(null)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const updateBaseInfo = useAppStore((s) => s.updateBaseInfo)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const accentColor = themeColor === '#111827' ? ACCENT_GOLD : themeColor

  const handleDeleteField = useCallback((field: string): void => {
    if (!baseInfo) return
    const updated: Record<string, unknown> = { ...baseInfo }
    delete updated[field]
    updateBaseInfo(updated as BaseInfo, name)
  }, [baseInfo, name, updateBaseInfo])

  const handleLocalUpload = useCallback((): void => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>): void => {
    const file: File | undefined = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (): void => {
      setCropImageSrc(reader.result as string)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [])

  const handleCropSave = useCallback((croppedDataUrl: string): void => {
    updateBaseInfo({ ...baseInfo, avatarUrl: croppedDataUrl } as BaseInfo, name)
    setCropImageSrc(null)
  }, [baseInfo, name, updateBaseInfo])

  const fields = buildFieldDefs(baseInfo)

  return (
    <>
      <header
        className="relative group cursor-pointer print:cursor-default overflow-hidden"
        style={{ backgroundColor: HEADER_BG }}
        onClick={() => setShowModal(true)}
      >
        {/* Gold left accent stripe */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[6px]"
          style={{ backgroundColor: accentColor }}
        />

        {/* Edit pencil */}
        <button
          type="button"
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-white/50 hover:text-white z-10"
          onClick={(e) => { e.stopPropagation(); setShowModal(true) }}
        >
          <Pencil size={18} />
        </button>

        <div className="flex items-start gap-6 px-8 py-6 pl-10">
          {/* Avatar */}
          {baseInfo?.showAvatar !== false && (
          <div
            className="relative w-[110px] h-[130px] rounded overflow-hidden shrink-0"
            style={{ border: `3px solid ${accentColor}` }}
            onMouseEnter={() => setAvatarHovered(true)}
            onMouseLeave={() => setAvatarHovered(false)}
          >
            {baseInfo?.avatarUrl ? (
              <img src={baseInfo.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-500">
                <svg viewBox="0 0 64 80" fill="currentColor" width="48" height="60">
                  <circle cx="32" cy="22" r="14" />
                  <path d="M8 72c0-13.255 10.745-24 24-24s24 10.745 24 24v8H8v-8z" />
                </svg>
              </div>
            )}
            {avatarHovered && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1.5 print:hidden">
                <button
                  type="button"
                  className="px-3 py-1 text-xs font-bold text-white bg-blue-500 rounded hover:bg-blue-600 transition-colors"
                  onClick={(e) => { e.stopPropagation(); setShowModal(true) }}
                >
                  在线制作
                </button>
                <button
                  type="button"
                  className="px-3 py-1 text-xs font-bold text-white border border-white/80 rounded hover:bg-white/20 transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleLocalUpload() }}
                >
                  本地上传
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          )}

          {/* Name + info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-4 mb-1">
              <h1 className="text-white font-bold" style={{ fontSize: '2.1em' }}>
                {name}
              </h1>
              <span
                className="tracking-[0.25em] uppercase"
                style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.45)' }}
              >
                PERSONAL RESUME
              </span>
            </div>
            {/* Info fields */}
            <div className="flex flex-wrap gap-y-2 gap-x-8 mt-3">
              {fields.map((f) => (
                <div
                  key={f.key}
                  className="flex items-center gap-2 text-white/80 relative group/field hover:bg-white/10 rounded pl-1 pr-5 py-0.5 transition-colors whitespace-nowrap text-[0.92em]"
                  onMouseEnter={() => setHoveredField(f.key)}
                  onMouseLeave={() => setHoveredField(null)}
                >
                  <span className="text-white/50 shrink-0">
                    {cloneElement(f.icon as ReactElement<{ size?: string | number; className?: string }>, {
                      size: '1.1em',
                      className: 'text-white/50',
                    })}
                  </span>
                  <span className="text-white/60">{f.label}：</span>
                  <span>{f.value}</span>
                  {hoveredField === f.key && (
                    <button
                      type="button"
                      className="absolute -right-1 top-1/2 -translate-y-1/2 print:hidden text-red-400 hover:text-red-300 transition-colors shrink-0"
                      onClick={(e) => { e.stopPropagation(); handleDeleteField(f.key) }}
                    >
                      <XCircle size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {showModal && (
        <BaseInfoModal baseInfo={baseInfo} name={name} onClose={() => setShowModal(false)} onSave={updateBaseInfo} />
      )}
      {cropImageSrc && (
        <AvatarCropModal imageSrc={cropImageSrc} onSave={handleCropSave} onClose={() => setCropImageSrc(null)} />
      )}
    </>
  )
}

/**
 * Block 渲染包装器 - 添加操作按钮和拖拽功能
 */
function BlockRendererWrapper(props: {
  block: ResumeBlock
  sectionId: string
  blockIndex: number
  totalBlocks: number
  themeColor: string
  spacingScale: number
}): ReactElement {
  const { block, sectionId, blockIndex, totalBlocks, themeColor, spacingScale } = props
  const addBlock = useAppStore((s) => s.addBlockByType)
  const deleteBlock = useAppStore((s) => s.deleteBlock)
  const moveBlockUp = useAppStore((s) => s.moveBlockUp)
  const moveBlockDown = useAppStore((s) => s.moveBlockDown)
  const [isEditing, setIsEditing] = useState(false)
  const { openPolish, openGenerate } = useAiSection()
  const moduleType = blockTypeToModuleType(block.type)

  let blockTypeLabel = '内容'
  if (block.type === 'experience') blockTypeLabel = '工作经历'
  if (block.type === 'project') blockTypeLabel = '项目经历'
  if (block.type === 'education') blockTypeLabel = '教育经历'
  if (block.type === 'campus') blockTypeLabel = '校园经历'

  return (
    <div style={{ marginBottom: blockIndex < totalBlocks - 1 ? `${16 * spacingScale}px` : '0' }}>
      <BlockWrapper
        blockType={blockTypeLabel}
        onAdd={block.type !== 'text' ? (): void => addBlock(sectionId) : undefined}
        onPolish={moduleType ? (): void => openPolish(block.id, extractBlockContentHtml(block), moduleType) : undefined}
        onGenerate={moduleType ? (): void => openGenerate(block.id, moduleType, block) : undefined}
        onDelete={(): void => deleteBlock(sectionId, block.id)}
        onMoveUp={blockIndex > 0 ? (): void => moveBlockUp(sectionId, block.id) : undefined}
        onMoveDown={blockIndex < totalBlocks - 1 ? (): void => moveBlockDown(sectionId, block.id) : undefined}
        showDragHandle={false}
        disableHover={isEditing}
      >
        <BlockRenderer
          block={block}
          themeColor={themeColor}
          styles={ELEGANT_TEMPLATE_STYLES.blockRenderer}
          onEditingChange={setIsEditing}
        />
      </BlockWrapper>
    </div>
  )
}

/**
 * Elegant Template — 深色头部 + 金色点缀
 */
export default function ElegantTemplate(props: ElegantTemplateProps): ReactElement {
  const { resume, theme } = props
  const accentColor = theme.primaryColor === '#111827' ? ACCENT_GOLD : theme.primaryColor
  const isJobIntentionVisible: boolean = resume.jobIntentionVisible ?? Boolean(resume.jobIntention)
  const bodyPadding: string = `${theme.pagePaddingVertical}mm ${theme.pagePaddingHorizontal}mm`

  return (
    <div
      className="resume-container bg-white text-black mx-auto rounded overflow-hidden"
      data-page-padding-vertical={theme.pagePaddingVertical}
      data-bleed="true"
      style={{
        color: theme.textColor,
        fontFamily: theme.fontFamily,
        fontSize: `${theme.fontSize}px`,
        lineHeight: theme.lineHeight,
      }}
    >
      {/* Dark header */}
      <ElegantHeader
        name={resume.name}
        baseInfo={resume.baseInfo ?? null}
        themeColor={theme.primaryColor}
      />

      {/* Body content */}
      <div 
        className="resume-body-content" 
        style={{ 
          padding: bodyPadding,
          paddingTop: `calc(${theme.pagePaddingVertical}mm * ${theme.spacingScale})` 
        }}
      >
        {isJobIntentionVisible ? (
          <div style={{ marginBottom: `${24 * theme.spacingScale}px` }}>
            <JobIntentionSection
              jobIntention={resume.jobIntention ?? null}
              themeColor={accentColor}
              styles={ELEGANT_TEMPLATE_STYLES.jobIntention}
            />
          </div>
        ) : null}

        <DragDropProvider
          resume={resume}
          theme={theme}
          onMoveSection={useAppStore((s) => s.moveSection)}
          onMoveWithinSection={useAppStore((s) => s.moveBlockInSection)}
          onMoveToSection={useAppStore((s) => s.moveBlockToSection)}
          renderSectionOverlay={(sectionId: string) => {
            const section = resume.sections.find((s) => s.id === sectionId)
            if (!section) return null
            return (
              <SectionContainer themeColor={accentColor}>
                <SectionHeader
                  sectionId={section.id}
                  title={section.title}
                  icon={getSectionIcon(section.title) || undefined}
                  themeColor={accentColor}
                  styles={ELEGANT_TEMPLATE_STYLES.sectionHeader}
                />
                <div className="space-y-3">
                  {section.blocks.map((block) => (
                    <BlockRenderer
                      key={block.id}
                      block={block}
                      themeColor={accentColor}
                      styles={ELEGANT_TEMPLATE_STYLES.blockRenderer}
                    />
                  ))}
                </div>
              </SectionContainer>
            )
          }}
        >
          <main className="flex flex-col relative" style={{ gap: `${24 * theme.spacingScale}px` }}>
            {resume.sections.map((section) => (
              <SortableSectionWrapper key={section.id} sectionId={section.id}>
                {(sectionDragProps) => (
                  <ElegantSectionView
                    section={section}
                    themeColor={accentColor}
                    dragHandleAttributes={sectionDragProps.attributes}
                    dragHandleListeners={sectionDragProps.listeners}
                    dragHandleRef={sectionDragProps.ref}
                  >
                    {section.blocks.map((block, index) => (
                      <BlockRendererWrapper
                        key={block.id}
                        block={block}
                        sectionId={section.id}
                        blockIndex={index}
                        totalBlocks={section.blocks.length}
                        themeColor={accentColor}
                        spacingScale={theme.spacingScale}
                      />
                    ))}
                  </ElegantSectionView>
                )}
              </SortableSectionWrapper>
            ))}
          </main>
        </DragDropProvider>
      </div>
    </div>
  )
}

interface ElegantSectionViewProps {
  readonly section: Section
  readonly themeColor: string
  readonly children: ReactNode
  readonly dragHandleAttributes?: unknown
  readonly dragHandleListeners?: unknown
  readonly dragHandleRef?: (element: HTMLElement | null) => void
}

function ElegantSectionView(props: ElegantSectionViewProps): ReactElement {
  const { section, themeColor, children, dragHandleAttributes, dragHandleListeners, dragHandleRef } = props
  const { id: sectionId, title, columns, blocks } = section
  const blockIds = blocks.map((b) => b.id)
  const isTextOnly = isTextOnlySection(section)
  const addBlock = useAppStore((s) => s.addBlockByType)
  const deleteSection = useAppStore((s) => s.deleteSection)
  const updateSectionTitle = useAppStore((s) => s.updateSectionTitle)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const { setNodeRef } = useDroppable({ id: `${DndIds.SECTION_DROP_ID_PREFIX}${sectionId}` })
  const icon = getSectionIcon(title)

  return (
    <SectionContainer themeColor={themeColor}>
      {/* Section header with gold underline */}
      <div
        className="pb-2 mb-3"
        style={{ borderBottom: `2px solid ${themeColor}` }}
      >
        <SectionHeader
          sectionId={sectionId}
          title={title}
          icon={icon || undefined}
          themeColor={themeColor}
          styles={ELEGANT_TEMPLATE_STYLES.sectionHeader}
          onTitleChange={isCustomSection(title) ? (newTitle: string) => updateSectionTitle(sectionId, newTitle) : undefined}
          onAdd={isTextOnly ? undefined : (): void => addBlock(sectionId)}
          onDelete={(): void => setShowDeleteDialog(true)}
          dragHandleAttributes={dragHandleAttributes}
          dragHandleListeners={dragHandleListeners}
          dragHandleRef={dragHandleRef}
        />
      </div>
      <SortableContext items={blockIds} strategy={rectSortingStrategy}>
        {columns === 2 ? (
          <div ref={setNodeRef} className="grid grid-cols-2 gap-4">{children}</div>
        ) : (
          <div ref={setNodeRef} className="flex flex-col">{children}</div>
        )}
      </SortableContext>

      <DeleteSectionDialog
        open={showDeleteDialog}
        sectionTitle={title}
        onOpenChange={setShowDeleteDialog}
        onConfirm={(): void => { deleteSection(sectionId); setShowDeleteDialog(false) }}
      />
    </SectionContainer>
  )
}
