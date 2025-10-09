/**
 * Professional Template - 专业商务风格简历模板
 * 特点：传统商务风格、清晰层次、正式感
 */
import { useState, type ReactElement, type ReactNode } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import SectionHeader from '@/components/sections/section-header'
import DeleteSectionDialog from '@/components/sections/delete-section-dialog'
import BlockWrapper from '@/components/blocks/block-wrapper'
import SortableSectionWrapper from '@/components/sections/sortable-section-wrapper'
import { getSectionIcon } from '@/utils/get-section-icon'
import DragDropProvider from '@/dnd/drag-drop-provider'
import { DndIds } from '@/dnd/ids'
import { useAppStore } from '@/state/store'
import { BlockRenderer as SharedBlockRenderer } from '@/templates/components/block-renderers'
import { BaseInfoSection, JobIntentionSection } from '@/templates/components/sections'

interface ProfessionalTemplateProps {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
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
}): ReactElement {
  const { block, sectionId, blockIndex, totalBlocks, themeColor } = props
  const addBlock = useAppStore((s) => s.addBlockByType)
  const deleteBlock = useAppStore((s) => s.deleteBlock)
  const moveBlockUp = useAppStore((s) => s.moveBlockUp)
  const moveBlockDown = useAppStore((s) => s.moveBlockDown)
  const [isEditing, setIsEditing] = useState(false)

  function handleMoveUp(): void {
    moveBlockUp(sectionId, block.id)
  }

  function handleMoveDown(): void {
    moveBlockDown(sectionId, block.id)
  }

  function handlePolish(): void {
    console.log('Polish', block.id)
  }

  let blockTypeLabel = '内容'
  if (block.type === 'experience') blockTypeLabel = '工作经历'
  if (block.type === 'project') blockTypeLabel = '项目经历'
  if (block.type === 'education') blockTypeLabel = '教育经历'
  if (block.type === 'campus') blockTypeLabel = '校园经历'

  return (
    <BlockWrapper
      blockType={blockTypeLabel}
      onAdd={() => addBlock(sectionId)}
      onPolish={handlePolish}
      onDelete={() => deleteBlock(sectionId, block.id)}
      onMoveUp={blockIndex > 0 ? handleMoveUp : undefined}
      onMoveDown={blockIndex < totalBlocks - 1 ? handleMoveDown : undefined}
      showDragHandle={false}
      disableHover={isEditing}
    >
      <SharedBlockRenderer
        block={block}
        variant="professional"
        themeColor={themeColor}
        onEditingChange={setIsEditing}
      />
    </BlockWrapper>
  )
}

export default function ProfessionalTemplate(props: ProfessionalTemplateProps): ReactElement {
  const { resume, theme } = props

  return (
    <div
      className="resume-container bg-white text-black mx-auto rounded-lg overflow-hidden shadow-lg"
      style={{
        color: theme.textColor,
        fontFamily: theme.fontFamily,
        fontSize: `${theme.fontSize}px`,
        lineHeight: theme.lineHeight,
        maxWidth: '210mm',
      }}
    >
      {/* 顶部主题色条 */}
      <div className="h-3" style={{ backgroundColor: theme.primaryColor }} />

      <div className="p-8">
        {/* 头部信息 */}
        <BaseInfoSection
          name={resume.name}
          baseInfo={resume.baseInfo ?? null}
          themeColor={theme.primaryColor}
          variant="professional"
        />

        {/* 求职意向 */}
        <JobIntentionSection
          jobIntention={resume.jobIntention ?? null}
          themeColor={theme.primaryColor}
          variant="professional"
        />

        {/* 拖拽容器 */}
        <DragDropProvider
          resume={resume}
          theme={theme}
          onMoveSection={useAppStore((s) => s.moveSection)}
          onMoveWithinSection={useAppStore((s) => s.moveBlockInSection)}
          onMoveToSection={useAppStore((s) => s.moveBlockToSection)}
        >
          <main className="mt-6" style={{ display: 'flex', flexDirection: 'column', gap: `${24 * theme.spacingScale}px` }}>
            {resume.sections.map((section) => (
              <SortableSectionWrapper key={section.id} sectionId={section.id}>
                {(sectionDragProps) => (
                  <SectionView
                    sectionId={section.id}
                    title={section.title}
                    columns={section.columns}
                    themeColor={theme.primaryColor}
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
                        themeColor={theme.primaryColor}
                      />
                    ))}
                  </SectionView>
                )}
              </SortableSectionWrapper>
            ))}
          </main>
        </DragDropProvider>
      </div>
    </div>
  )
}

interface SectionViewProps {
  readonly sectionId: string
  readonly title: string
  readonly columns: number
  readonly themeColor: string
  readonly blockIds: string[]
  readonly children: ReactNode
  readonly dragHandleAttributes?: unknown
  readonly dragHandleListeners?: unknown
  readonly dragHandleRef?: (element: HTMLElement | null) => void
}

// ProfessionalJobIntentionSection removed - now using shared JobIntentionSection component

function DELETED_ProfessionalJobIntentionSection_DO_NOT_USE(props: any): ReactElement | null {
  const { jobIntention, themeColor } = props
  const [showModal, setShowModal] = useState(false)
  const [hoveredField, setHoveredField] = useState<string | null>(null)
  const updateJobIntention = useAppStore((s) => s.updateJobIntention)

  if (!jobIntention) return null

  function handleDeleteField(field: string): void {
    if (!jobIntention) return
    const updated = { ...jobIntention }
    if (field === 'position') updated.position = undefined
    if (field === 'city') updated.city = undefined
    if (field === 'salary') updated.salary = undefined
    if (field === 'type') updated.type = undefined
    if (field === 'industry') updated.industry = undefined
    if (field === 'currentStatus') updated.currentStatus = undefined
    updateJobIntention(updated)
  }

  return (
    <>
      <section className="mb-5 relative group cursor-pointer print:cursor-default" onClick={() => setShowModal(true)}>
        <div className="flex items-center justify-center gap-2 mb-3 pb-3 border-b-2 relative" style={{ borderColor: themeColor }}>
          <Briefcase size={18} color={themeColor} strokeWidth={2} />
          <h2 className="text-base font-bold" style={{ color: themeColor }}>求职意向</h2>
          <button
            type="button"
            className="absolute right-0 opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-gray-400 hover:text-gray-600"
            onClick={(e) => {
              e.stopPropagation()
              setShowModal(true)
            }}
          >
            <Pencil size={18} />
          </button>
        </div>

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-700">
          {jobIntention.position ? (
            <div
              className="hover:bg-gray-50 rounded px-2 py-1 transition-colors relative"
              onMouseEnter={() => setHoveredField('position')}
              onMouseLeave={() => setHoveredField(null)}
            >
              <span className="text-gray-500">意向岗位：</span>
              <span>{jobIntention.position}</span>
              {hoveredField === 'position' ? (
                <button
                  type="button"
                  className="ml-2 print:hidden text-red-500 hover:text-red-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteField('position')
                  }}
                >
                  <XCircle size={14} />
                </button>
              ) : null}
            </div>
          ) : null}
          {jobIntention.city ? (
            <div
              className="hover:bg-gray-50 rounded px-2 py-1 transition-colors relative"
              onMouseEnter={() => setHoveredField('city')}
              onMouseLeave={() => setHoveredField(null)}
            >
              <span className="text-gray-500">意向城市：</span>
              <span>{jobIntention.city}</span>
              {hoveredField === 'city' ? (
                <button
                  type="button"
                  className="ml-2 print:hidden text-red-500 hover:text-red-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteField('city')
                  }}
                >
                  <XCircle size={14} />
                </button>
              ) : null}
            </div>
          ) : null}
          {jobIntention.salary ? (
            <div
              className="hover:bg-gray-50 rounded px-2 py-1 transition-colors relative"
              onMouseEnter={() => setHoveredField('salary')}
              onMouseLeave={() => setHoveredField(null)}
            >
              <span className="text-gray-500">期望薪资：</span>
              <span>{jobIntention.salary}</span>
              {hoveredField === 'salary' ? (
                <button
                  type="button"
                  className="ml-2 print:hidden text-red-500 hover:text-red-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteField('salary')
                  }}
                >
                  <XCircle size={14} />
                </button>
              ) : null}
            </div>
          ) : null}
          {jobIntention.type ? (
            <div
              className="hover:bg-gray-50 rounded px-2 py-1 transition-colors relative"
              onMouseEnter={() => setHoveredField('type')}
              onMouseLeave={() => setHoveredField(null)}
            >
              <span className="text-gray-500">求职类型：</span>
              <span>{jobIntention.type}</span>
              {hoveredField === 'type' ? (
                <button
                  type="button"
                  className="ml-2 print:hidden text-red-500 hover:text-red-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteField('type')
                  }}
                >
                  <XCircle size={14} />
                </button>
              ) : null}
            </div>
          ) : null}
          {jobIntention.industry ? (
            <div
              className="hover:bg-gray-50 rounded px-2 py-1 transition-colors relative"
              onMouseEnter={() => setHoveredField('industry')}
              onMouseLeave={() => setHoveredField(null)}
            >
              <span className="text-gray-500">期望行业：</span>
              <span>{jobIntention.industry}</span>
              {hoveredField === 'industry' ? (
                <button
                  type="button"
                  className="ml-2 print:hidden text-red-500 hover:text-red-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteField('industry')
                  }}
                >
                  <XCircle size={14} />
                </button>
              ) : null}
            </div>
          ) : null}
          {jobIntention.currentStatus ? (
            <div
              className="hover:bg-gray-50 rounded px-2 py-1 transition-colors relative"
              onMouseEnter={() => setHoveredField('currentStatus')}
              onMouseLeave={() => setHoveredField(null)}
            >
              <span className="text-gray-500">当前状态：</span>
              <span>{jobIntention.currentStatus}</span>
              {hoveredField === 'currentStatus' ? (
                <button
                  type="button"
                  className="ml-2 print:hidden text-red-500 hover:text-red-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteField('currentStatus')
                  }}
                >
                  <XCircle size={14} />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {showModal ? (
        <JobIntentionModal
          jobIntention={jobIntention}
          onClose={() => setShowModal(false)}
          onSave={updateJobIntention}
        />
      ) : null}
    </>
  )
}

function SectionView(props: SectionViewProps): ReactElement {
  const { sectionId, title, themeColor, blockIds, children, dragHandleAttributes, dragHandleListeners, dragHandleRef } = props
  const addBlock = useAppStore((s) => s.addBlockByType)
  const deleteSection = useAppStore((s) => s.deleteSection)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const { setNodeRef } = useDroppable({ id: `${DndIds.SECTION_DROP_ID_PREFIX}${sectionId}` })
  const icon = getSectionIcon(title)

  const handleDeleteSection = (): void => {
    setShowDeleteDialog(true)
  }

  const confirmDelete = (): void => {
    deleteSection(sectionId)
    setShowDeleteDialog(false)
  }

  return (
    <section className="resume-section">
      <div className="mb-4">
        <SectionHeader
          sectionId={sectionId}
          title={title}
          icon={icon ? <span style={{ color: themeColor }}>{icon}</span> : undefined}
          themeColor={themeColor}
          onAdd={() => addBlock(sectionId)}
          onDelete={handleDeleteSection}
          dragHandleAttributes={dragHandleAttributes}
          dragHandleListeners={dragHandleListeners}
          dragHandleRef={dragHandleRef}
        />
        <div className="h-0.5 mt-2" style={{ backgroundColor: themeColor }} />
      </div>
      <SortableContext items={blockIds} strategy={rectSortingStrategy}>
        <div ref={setNodeRef} className="space-y-4">
          {children}
        </div>
      </SortableContext>
      
      <DeleteSectionDialog
        open={showDeleteDialog}
        sectionTitle={title}
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmDelete}
      />
    </section>
  )
}

interface ProfessionalHeaderProps {
  readonly name: string
  readonly baseInfo: BaseInfo | null
  readonly themeColor: string
}

function ProfessionalHeader(props: ProfessionalHeaderProps): ReactElement {
  const { name, baseInfo, themeColor } = props
  const [showModal, setShowModal] = useState(false)
  const updateBaseInfo = useAppStore((s) => s.updateBaseInfo)

  return (
    <>
      <header className="relative group cursor-pointer" onClick={() => setShowModal(true)}>
        <button
          type="button"
          className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-gray-400 hover:text-gray-600 z-10"
          onClick={(e) => {
            e.stopPropagation()
            setShowModal(true)
          }}
        >
          <Pencil size={18} />
        </button>

        <div className="text-center pb-4 border-b-2" style={{ borderColor: themeColor }}>
          <h1 className="text-3xl font-bold mb-2" style={{ color: themeColor }}>
            {name}
          </h1>

          {baseInfo?.title ? (
            <div className="text-base text-gray-600 mb-3">{baseInfo.title}</div>
          ) : null}

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-gray-700">
            {baseInfo?.phone ? (
              <div className="flex items-center gap-1.5">
                <Phone size={14} strokeWidth={2} />
                <span>{baseInfo.phone}</span>
              </div>
            ) : null}

            {baseInfo?.email ? (
              <div className="flex items-center gap-1.5">
                <Mail size={14} strokeWidth={2} />
                <span>{baseInfo.email}</span>
              </div>
            ) : null}

            {baseInfo?.gender ? (
              <div>
                <span className="text-gray-500">性别：</span>
                {baseInfo.gender}
              </div>
            ) : null}

            {typeof baseInfo?.age === 'number' ? (
              <div>
                <span className="text-gray-500">年龄：</span>
                {baseInfo.age}
              </div>
            ) : null}

            {baseInfo?.currentLocation ? (
              <div className="flex items-center gap-1.5">
                <MapPin size={14} strokeWidth={2} />
                <span>{baseInfo.currentLocation}</span>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {showModal ? (
        <BaseInfoModal baseInfo={baseInfo} name={name} onClose={() => setShowModal(false)} onSave={updateBaseInfo} />
      ) : null}
    </>
  )
}
