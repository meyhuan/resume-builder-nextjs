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
import { DndIds } from '@/dnd/ids'
import { JobIntentionSection, BlockRenderer, SectionContainer } from '@/templates/components/v2'
import BaseInfoModal from '@/components/modals/base-info-modal'
import AvatarCropModal from '@/components/modals/avatar-crop-modal'
import { IconPhone, IconMail, IconGender, IconAge, IconLocation } from '@/components/sections/baseinfo-icons'
import TwoColumnDndProvider, {
  ColumnDroppable,
  CrossColumnPlaceholder,
  COLUMN_LEFT_ID,
  COLUMN_RIGHT_ID,
  isTextOnlySection,
} from './two-column-dnd-provider'
import { WARM_TEMPLATE_STYLES, resolveAccent, hexToRgba, darkenHex } from './styles'

interface WarmTemplateProps {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
  readonly sidebarSectionIds?: readonly string[]
  readonly onSidebarSectionIdsChange?: (ids: readonly string[]) => void
}

/** Default sidebar sections by title keywords. */
const LEFT_TITLE_KEYWORDS = ['自我', '评价', 'self']

function shouldDefaultToLeft(section: Section): boolean {
  const t = section.title.toLowerCase()
  return isTextOnlySection(section) && LEFT_TITLE_KEYWORDS.some((kw) => t.includes(kw))
}

/** Field definition for base-info rendering. */
interface FieldDef {
  readonly key: string
  readonly label: string
  readonly value: string
  readonly icon: ReactElement
}

function buildFieldDefs(baseInfo: BaseInfo | null): FieldDef[] {
  if (!baseInfo) return []
  const defs: FieldDef[] = []
  if (baseInfo.phone) {
    defs.push({ key: 'phone', label: '电话', value: baseInfo.phone, icon: <IconPhone /> })
  }
  if (baseInfo.email) {
    defs.push({ key: 'email', label: '邮箱', value: baseInfo.email, icon: <IconMail /> })
  }
  if (baseInfo.gender) {
    defs.push({ key: 'gender', label: '性别', value: baseInfo.gender, icon: <IconGender /> })
  }
  if (baseInfo.age !== undefined && baseInfo.age !== null) {
    defs.push({ key: 'age', label: '年龄', value: String(baseInfo.age), icon: <IconAge /> })
  }
  if (baseInfo.currentLocation) {
    defs.push({ key: 'currentLocation', label: '现居', value: baseInfo.currentLocation, icon: <IconLocation /> })
  }
  return defs
}

/**
 * Left sidebar header: avatar + name + contact fields.
 */
function WarmSidebarHeader(props: {
  readonly name: string
  readonly baseInfo: BaseInfo | null
  readonly accentColor: string
}): ReactElement {
  const { name, baseInfo, accentColor } = props
  const [showModal, setShowModal] = useState(false)
  const [avatarHovered, setAvatarHovered] = useState(false)
  const [hoveredField, setHoveredField] = useState<string | null>(null)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const updateBaseInfo = useAppStore((s) => s.updateBaseInfo)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      <div
        className="relative group cursor-pointer print:cursor-default mb-4"
        onClick={() => setShowModal(true)}
      >
        {/* Edit pencil */}
        <button
          type="button"
          className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-gray-400 hover:text-gray-600 z-10"
          onClick={(e) => { e.stopPropagation(); setShowModal(true) }}
        >
          <Pencil size={16} />
        </button>

        {/* Avatar */}
        <div className="flex justify-center mb-10">
          <div
            className="relative w-[130px] h-[150px] rounded-b-[65px] overflow-hidden bg-white flex items-center justify-center"
            style={{ border: `7px solid ${accentColor}` }}
            onMouseEnter={() => setAvatarHovered(true)}
            onMouseLeave={() => setAvatarHovered(false)}
          >
            {baseInfo?.avatarUrl ? (
              <img src={baseInfo.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center text-[#e6e6e6] mt-4">
                <svg viewBox="0 0 64 80" fill="currentColor" width="90" height="90">
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
              onClick={(e) => e.stopPropagation()}
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Name */}
        <h1 className="font-bold text-gray-800 mb-[35px] pl-[5px] tracking-wide" style={{ fontSize: '1.875em' }}>
          {name}
        </h1>

        {/* Contact fields */}
        <div className="flex flex-col gap-5 mb-[50px]">
          {fields.map((f) => (
            <div
              key={f.key}
              className="flex items-center gap-3 text-gray-600 relative group/field"
              onMouseEnter={() => setHoveredField(f.key)}
              onMouseLeave={() => setHoveredField(null)}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: accentColor }}
              >
                {cloneElement(f.icon as ReactElement<{ size?: string | number; className?: string }>, {
                  size: '12px',
                  className: 'text-white',
                })}
              </div>
              <span>{f.label}：{f.value}</span>
              {hoveredField === f.key && (
                <button
                  type="button"
                  className="absolute -right-1 top-1/2 -translate-y-1/2 print:hidden text-red-400 hover:text-red-600 transition-colors shrink-0"
                  onClick={(e) => { e.stopPropagation(); handleDeleteField(f.key) }}
                >
                  <XCircle size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

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
 * Block renderer wrapper with action buttons.
 */
function BlockRendererWrapper(props: {
  block: ResumeBlock
  sectionId: string
  blockIndex: number
  totalBlocks: number
  themeColor: string
}): ReactElement {
  const { block, sectionId, blockIndex, totalBlocks, themeColor } = props
  const addBlock = useAppStore((s) => s.addBlockByType)
  const deleteBlock = useAppStore((s) => s.deleteBlock)
  const moveBlockUp = useAppStore((s) => s.moveBlockUp)
  const moveBlockDown = useAppStore((s) => s.moveBlockDown)
  const [isEditing, setIsEditing] = useState(false)

  let blockTypeLabel = '内容'
  if (block.type === 'experience') blockTypeLabel = '工作经历'
  if (block.type === 'project') blockTypeLabel = '项目经历'
  if (block.type === 'education') blockTypeLabel = '教育经历'
  if (block.type === 'campus') blockTypeLabel = '校园经历'

  return (
    <div className="mb-2">
      <BlockWrapper
        blockType={blockTypeLabel}
        onAdd={block.type !== 'text' ? (): void => addBlock(sectionId) : undefined}
        onPolish={(): void => console.log('Polish', block.id)}
        onDelete={(): void => deleteBlock(sectionId, block.id)}
        onMoveUp={blockIndex > 0 ? (): void => moveBlockUp(sectionId, block.id) : undefined}
        onMoveDown={blockIndex < totalBlocks - 1 ? (): void => moveBlockDown(sectionId, block.id) : undefined}
        showDragHandle={false}
        disableHover={isEditing}
      >
        <BlockRenderer
          block={block}
          themeColor={themeColor}
          styles={WARM_TEMPLATE_STYLES.blockRenderer}
          onEditingChange={setIsEditing}
        />
      </BlockWrapper>
    </div>
  )
}

/**
 * Section view with accent left-bar and section header.
 */
function WarmSectionView(props: {
  readonly sectionId: string
  readonly title: string
  readonly columns: number
  readonly themeColor: string
  readonly blockIds: string[]
  readonly children: ReactNode
  readonly dragHandleAttributes?: unknown
  readonly dragHandleListeners?: unknown
  readonly dragHandleRef?: (element: HTMLElement | null) => void
}): ReactElement {
  const { sectionId, title, columns, themeColor, blockIds, children, dragHandleAttributes, dragHandleListeners, dragHandleRef } = props
  const addBlock = useAppStore((s) => s.addBlockByType)
  const deleteSection = useAppStore((s) => s.deleteSection)
  const updateSectionTitle = useAppStore((s) => s.updateSectionTitle)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const { setNodeRef } = useDroppable({ id: `${DndIds.SECTION_DROP_ID_PREFIX}${sectionId}` })

  return (
    <div className="mb-0">
      {/* Section header with accent left bar and gradient background */}
      <div
        className="mb-6 w-full"
        style={{
          borderLeft: `2px solid ${themeColor}`,
          paddingLeft: '15px',
          background: `linear-gradient(90deg, ${hexToRgba(themeColor, 0.08)} 0%, #ffffff 100%)`,
        }}
      >
        <SectionHeader
          sectionId={sectionId}
          title={title}
          icon={undefined}
          themeColor={darkenHex(themeColor, 0.65)}
          styles={{
            ...WARM_TEMPLATE_STYLES.sectionHeader,
            fontSize: '1.125em',
            lineHeight: '1.5',
            containerClassName: 'w-full',
          }}
          onTitleChange={isCustomSection(title) ? (newTitle: string) => updateSectionTitle(sectionId, newTitle) : undefined}
          onAdd={(): void => addBlock(sectionId)}
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
    </div>
  )
}


/**
 * Warm Template — 淡黄通用简历模板 (Two-column sidebar layout)
 */
export default function WarmTemplate(props: WarmTemplateProps): ReactElement {
  const { resume, theme, sidebarSectionIds: externalIds, onSidebarSectionIdsChange } = props
  const accentColor = resolveAccent(theme.primaryColor)

  // Compute default sidebar IDs from section data
  const defaultIds = resume.sections.filter(shouldDefaultToLeft).map((s) => s.id)

  // Local sidebar state for uncontrolled mode (no external prop)
  const [localIds, setLocalIds] = useState<readonly string[]>(defaultIds)

  // Use external prop when provided, otherwise local state
  const sidebarIds: readonly string[] = externalIds ?? localIds

  // Update both local state and notify parent
  const updateSidebar = useCallback((ids: readonly string[]) => {
    setLocalIds(ids)
    onSidebarSectionIdsChange?.(ids)
  }, [onSidebarSectionIdsChange])

  // Split sections into left and right
  const sidebarSet = new Set(sidebarIds)
  const leftSections = resume.sections.filter((s) => sidebarSet.has(s.id))
  const rightSections = resume.sections.filter((s) => !sidebarSet.has(s.id))

  const handleMoveSectionToColumn = useCallback((sectionId: string, toColumn: 'left' | 'right') => {
    if (toColumn === 'left') {
      updateSidebar([...sidebarIds, sectionId])
    } else {
      updateSidebar(sidebarIds.filter((id) => id !== sectionId))
    }
  }, [sidebarIds, updateSidebar])

  return (
    <div
      className="resume-container bg-white text-black mx-auto rounded shadow-sm overflow-hidden"
      style={{
        color: theme.textColor,
        fontFamily: theme.fontFamily,
        fontSize: `${theme.fontSize}px`,
        lineHeight: theme.lineHeight,
      }}
    >
      <TwoColumnDndProvider
        leftSections={leftSections}
        rightSections={rightSections}
        allSections={resume.sections}
        theme={theme}
        onMoveSection={useAppStore((s) => s.moveSection)}
        onMoveWithinSection={useAppStore((s) => s.moveBlockInSection)}
        onMoveToSection={useAppStore((s) => s.moveBlockToSection)}
        onMoveSectionToColumn={handleMoveSectionToColumn}
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
                styles={WARM_TEMPLATE_STYLES.sectionHeader}
              />
              <div className="space-y-3">
                {section.blocks.map((block) => (
                  <BlockRenderer
                    key={block.id}
                    block={block}
                    themeColor={accentColor}
                    styles={WARM_TEMPLATE_STYLES.blockRenderer}
                  />
                ))}
              </div>
            </SectionContainer>
          )
        }}
      >
        <div className="flex min-h-[297mm]">
          {/* Left sidebar */}
          <ColumnDroppable id={COLUMN_LEFT_ID} className="w-[32%] shrink-0 transition-shadow">
            <div
              className="h-full flex flex-col gap-[20px]"
              style={{ backgroundColor: '#f9f9f9', padding: '50px 30px' }}
            >
              {/* BaseInfo (fixed, not draggable) */}
              <WarmSidebarHeader
                name={resume.name}
                baseInfo={resume.baseInfo ?? null}
                accentColor={accentColor}
              />

              {/* JobIntention (fixed, not draggable) */}
              <div className="mb-0">
                <div
                  className="mb-6 w-full"
                  style={{
                    borderLeft: `2px solid ${accentColor}`,
                    paddingLeft: '15px',
                    background: `linear-gradient(90deg, ${hexToRgba(accentColor, 0.08)} 0%, #ffffff 100%)`,
                  }}
                >
                  <SectionHeader
                    sectionId="job-intention"
                    title="求职意向"
                    themeColor={darkenHex(accentColor, 0.65)}
                    styles={{
                      ...WARM_TEMPLATE_STYLES.sectionHeader,
                      fontSize: '1.125em',
                      lineHeight: '1.5',
                      containerClassName: 'w-full',
                    }}
                  />
                </div>
                <JobIntentionSection
                  jobIntention={resume.jobIntention ?? null}
                  themeColor="#666"
                  styles={{
                    ...WARM_TEMPLATE_STYLES.jobIntention,
                    container: 'relative',
                    header: 'hidden',
                    fieldsLayout: {
                      type: 'vertical',
                      className: 'flex flex-col gap-2',
                    },
                    fieldItem: 'mb-2 text-gray-600 leading-relaxed',
                  }}
                />
              </div>

              {/* Left sidebar sections (TextBlock sections, sortable) */}
              {leftSections.map((section) => (
                <SortableSectionWrapper key={section.id} sectionId={section.id}>
                  {(sectionDragProps) => (
                    <WarmSectionView
                      sectionId={section.id}
                      title={section.title}
                      columns={section.columns}
                      themeColor={accentColor}
                      blockIds={section.blocks.map((b) => b.id)}
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
                        />
                      ))}
                    </WarmSectionView>
                  )}
                </SortableSectionWrapper>
              ))}
              <CrossColumnPlaceholder columnId={COLUMN_LEFT_ID} />
            </div>
          </ColumnDroppable>

          {/* Right main content */}
          <ColumnDroppable id={COLUMN_RIGHT_ID} className="w-[68%] transition-shadow">
            <div style={{ minHeight: '100%', padding: '50px 40px', backgroundColor: '#ffffff' }}>
              <main className="flex flex-col relative" style={{ gap: `${24 * theme.spacingScale}px` }}>
                {rightSections.map((section) => (
                  <SortableSectionWrapper key={section.id} sectionId={section.id}>
                    {(sectionDragProps) => (
                      <WarmSectionView
                        sectionId={section.id}
                        title={section.title}
                        columns={section.columns}
                        themeColor={accentColor}
                        blockIds={section.blocks.map((b) => b.id)}
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
                          />
                        ))}
                      </WarmSectionView>
                    )}
                  </SortableSectionWrapper>
                ))}
                <CrossColumnPlaceholder columnId={COLUMN_RIGHT_ID} />
              </main>
            </div>
          </ColumnDroppable>
        </div>
      </TwoColumnDndProvider>
    </div>
  )
}
