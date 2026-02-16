import { useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
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
import { isCustomSection } from '@/entities/blocks/block-factory'
import { useAppStore } from '@/state/store'
import DragDropProvider from '@/dnd/drag-drop-provider'
import { DndIds } from '@/dnd/ids'
import { BaseInfoSection, JobIntentionSection, BlockRenderer, SectionContainer } from '@/templates/components/v2'
import EditableFieldWrapper from '@/editor/editable-field-wrapper'
import EditableDateField from '@/editor/editable-date-field'
import { CREATIVE_TEMPLATE_STYLES } from './styles'

interface CreativeTemplateProps {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
}

/**
 * Creative 风格的 Block Header 渲染
 * 特点：左侧时间，右侧机构名；第二行左侧职位
 */
function CreativeBlockHeader(props: { block: ResumeBlock; themeColor: string }): ReactElement {
  const { block } = props
  
  // 通用样式
  const rowStyle = "flex justify-between items-baseline mb-1"
  const dateStyle = "text-sm font-bold text-gray-900 shrink-0"
  const titleStyle = "text-base font-bold text-gray-900 text-right flex-1 ml-4"
  const subtitleStyle = "text-sm text-gray-600 font-medium mt-0.5"

  if (block.type === 'experience') {
    return (
      <div className="mb-2">
        <div className={rowStyle}>
          <div className={dateStyle}>
            <EditableDateField blockId={block.id} fieldName="startDate" value={block.startDate} />
            <span className="mx-1">-</span>
            <EditableDateField blockId={block.id} fieldName="endDate" value={block.endDate} />
          </div>
          <h3 className={titleStyle}>
            <EditableFieldWrapper
              blockId={block.id}
              fieldName="company"
              value={block.company}
              onUpdate={() => {}}
              className="font-bold"
            />
          </h3>
        </div>
        <div className={rowStyle}>
          <div className={subtitleStyle}>
            <EditableFieldWrapper
              blockId={block.id}
              fieldName="position"
              value={block.position}
              onUpdate={() => {}}
            />
            {block.industry && (
              <>
                <span className="mx-2">|</span>
                <EditableFieldWrapper
                  blockId={block.id}
                  fieldName="industry"
                  value={block.industry}
                  onUpdate={() => {}}
                />
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (block.type === 'education') {
    return (
      <div className="mb-2">
        <div className={rowStyle}>
          <div className={dateStyle}>
            <EditableDateField blockId={block.id} fieldName="startDate" value={block.startDate} />
            <span className="mx-1">-</span>
            <EditableDateField blockId={block.id} fieldName="endDate" value={block.endDate} />
          </div>
          <h3 className={titleStyle}>
            <EditableFieldWrapper
              blockId={block.id}
              fieldName="school"
              value={block.school}
              onUpdate={() => {}}
              className="font-bold"
            />
          </h3>
        </div>
        <div className={subtitleStyle}>
          <EditableFieldWrapper
            blockId={block.id}
            fieldName="major"
            value={block.major}
            onUpdate={() => {}}
          />
          <span className="mx-2">|</span>
          <EditableFieldWrapper
            blockId={block.id}
            fieldName="degree"
            value={block.degree}
            onUpdate={() => {}}
          />
        </div>
      </div>
    )
  }

  if (block.type === 'project') {
    return (
      <div className="mb-2">
        <div className={rowStyle}>
          <div className={dateStyle}>
            <EditableDateField blockId={block.id} fieldName="startDate" value={block.startDate} />
            <span className="mx-1">-</span>
            <EditableDateField blockId={block.id} fieldName="endDate" value={block.endDate} />
          </div>
          <h3 className={titleStyle}>
            <EditableFieldWrapper
              blockId={block.id}
              fieldName="name"
              value={block.name}
              onUpdate={() => {}}
              className="font-bold"
            />
          </h3>
        </div>
        {block.role && (
          <div className={subtitleStyle}>
            <EditableFieldWrapper
              blockId={block.id}
              fieldName="role"
              value={block.role}
              onUpdate={() => {}}
            />
          </div>
        )}
      </div>
    )
  }

  return <></>
}

/**
 * Block 渲染包装器 - 添加操作按钮和拖拽功能
 */
function BlockRendererWrapper(props: { 
  block: ResumeBlock; 
  sectionId: string; 
  blockIndex: number; 
  totalBlocks: number; 
  themeColor: string;
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
      onAdd={(): void => addBlock(sectionId)}
      onPolish={handlePolish}
      onDelete={(): void => deleteBlock(sectionId, block.id)}
      onMoveUp={blockIndex > 0 ? handleMoveUp : undefined}
      onMoveDown={blockIndex < totalBlocks - 1 ? handleMoveDown : undefined}
      showDragHandle={false}
      disableHover={isEditing}
    >
      <BlockRenderer
        block={block}
        themeColor={themeColor}
        styles={CREATIVE_TEMPLATE_STYLES.blockRenderer}
        onEditingChange={setIsEditing}
        slots={{
          header: (b, color) => <CreativeBlockHeader block={b} themeColor={color} />
        }}
      />
    </BlockWrapper>
  )
}

export default function CreativeTemplate(props: CreativeTemplateProps): ReactElement {
  const { resume, theme } = props

  return (
    <div
      className="resume-container bg-white text-black mx-auto p-10 rounded shadow-sm"
      style={{
        color: theme.textColor,
        fontFamily: theme.fontFamily,
        fontSize: `${theme.fontSize}px`,
        lineHeight: theme.lineHeight,
        maxWidth: '210mm',
        minHeight: '297mm',
      }}
    >
      <BaseInfoSection
        name={resume.name}
        baseInfo={resume.baseInfo ?? null}
        themeColor={theme.primaryColor}
        styles={CREATIVE_TEMPLATE_STYLES.baseInfo}
      />

      <JobIntentionSection
        jobIntention={resume.jobIntention ?? null}
        themeColor={theme.primaryColor}
        styles={CREATIVE_TEMPLATE_STYLES.jobIntention}
      />

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
              <SectionHeader
                sectionId={section.id}
                title={section.title}
                icon={getSectionIcon(section.title)}
                themeColor={theme.primaryColor}
                styles={CREATIVE_TEMPLATE_STYLES.sectionHeader}
              />
              <div className="space-y-3">
                {section.blocks.map((block) => (
                  <BlockRenderer
                    key={block.id}
                    block={block}
                    themeColor={theme.primaryColor}
                    styles={CREATIVE_TEMPLATE_STYLES.blockRenderer}
                  />
                ))}
              </div>
            </SectionContainer>
          )
        }}
      >
        <main className="flex flex-col relative" style={{ gap: `${28 * theme.spacingScale}px` }}>
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
  const { sectionId, title, columns, themeColor, blockIds, children, dragHandleAttributes, dragHandleListeners, dragHandleRef } = props
  const addBlock = useAppStore((s) => s.addBlockByType)
  const deleteSection = useAppStore((s) => s.deleteSection)
  const updateSectionTitle = useAppStore((s) => s.updateSectionTitle)
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
      <SectionHeader
        sectionId={sectionId}
        title={title}
        icon={icon}
        themeColor={themeColor}
        styles={CREATIVE_TEMPLATE_STYLES.sectionHeader}
        onTitleChange={isCustomSection(title) ? (newTitle: string) => updateSectionTitle(sectionId, newTitle) : undefined}
        onAdd={(): void => addBlock(sectionId)}
        onDelete={handleDeleteSection}
        dragHandleAttributes={dragHandleAttributes}
        dragHandleListeners={dragHandleListeners}
        dragHandleRef={dragHandleRef}
      />
      <SortableContext items={blockIds} strategy={rectSortingStrategy}>
        {columns === 2 ? (
          <div ref={setNodeRef} className="grid grid-cols-2 gap-6">{children}</div>
        ) : (
          <div ref={setNodeRef} className="flex flex-col">{children}</div>
        )}
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
