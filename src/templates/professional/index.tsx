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
import { BaseInfoSection, JobIntentionSection, BlockRenderer, SectionContainer } from '@/templates/components/v2'
import { PROFESSIONAL_TEMPLATE_STYLES } from './styles'

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
      <BlockRenderer
        block={block}
        themeColor={themeColor}
        styles={PROFESSIONAL_TEMPLATE_STYLES.blockRenderer}
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
          styles={PROFESSIONAL_TEMPLATE_STYLES.baseInfo}
        />

        {/* 求职意向 */}
        <JobIntentionSection
          jobIntention={resume.jobIntention ?? null}
          themeColor={theme.primaryColor}
          styles={PROFESSIONAL_TEMPLATE_STYLES.jobIntention}
        />

        {/* 拖拽容器 */}
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
              <SectionContainer themeColor={theme.primaryColor}>
                <div className="mb-4">
                  <SectionHeader
                    sectionId={section.id}
                    title={section.title}
                    icon={getSectionIcon(section.title) ? <span style={{ color: theme.primaryColor }}>{getSectionIcon(section.title)}</span> : undefined}
                    themeColor={theme.primaryColor}
                  />
                </div>
                <div className="space-y-3">
                  {section.blocks.map((block) => (
                    <BlockRenderer
                      key={block.id}
                      block={block}
                      themeColor={theme.primaryColor}
                      styles={PROFESSIONAL_TEMPLATE_STYLES.blockRenderer}
                    />
                  ))}
                </div>
              </SectionContainer>
            )
          }}
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
    <SectionContainer themeColor={themeColor}>
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
    </SectionContainer>
  )
}
