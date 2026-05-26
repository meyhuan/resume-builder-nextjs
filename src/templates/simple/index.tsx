"use client"
import { useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
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
import { BaseInfoSection, JobIntentionSection, BlockRenderer, SectionContainer } from '@/templates/components/v2'
import type { SectionHeaderStyles } from '@/templates/components/v2/types'
import { SIMPLE_TEMPLATE_STYLES } from './styles'

/** Check if every block in a section is a TextBlock. */
function isTextOnlySection(section: Section): boolean {
  return section.blocks.length > 0 && section.blocks.every((b) => b.type === 'text')
}

interface SimpleTemplateProps {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
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
  spacingScale: number;
}): ReactElement {
  const { block, sectionId, blockIndex, totalBlocks, themeColor, spacingScale } = props
  const addBlock = useAppStore((s) => s.addBlockByType)
  const deleteBlock = useAppStore((s) => s.deleteBlock)
  const moveBlockUp = useAppStore((s) => s.moveBlockUp)
  const moveBlockDown = useAppStore((s) => s.moveBlockDown)
  const [isEditing, setIsEditing] = useState(false)
  const { openPolish, openGenerate } = useAiSection()
  const moduleType = blockTypeToModuleType(block.type)
  
  function handleMoveUp(): void {
    moveBlockUp(sectionId, block.id)
  }
  
  function handleMoveDown(): void {
    moveBlockDown(sectionId, block.id)
  }
  
  function handlePolish(): void {
    if (!moduleType) return
    const content = extractBlockContentHtml(block)
    openPolish(block.id, content, moduleType)
  }
  
  function handleGenerate(): void {
    if (!moduleType) return
    openGenerate(block.id, moduleType, block)
  }
  
  let blockTypeLabel = '内容'
  if (block.type === 'experience') blockTypeLabel = '工作经历'
  if (block.type === 'project') blockTypeLabel = '项目经历'
  if (block.type === 'education') blockTypeLabel = '教育经历'
  if (block.type === 'campus') blockTypeLabel = '校园经历'
  
  return (
    <div style={{ marginBottom: blockIndex < totalBlocks - 1 ? `${13 * spacingScale}px` : '0' }}>
      <BlockWrapper
        blockType={blockTypeLabel}
        onAdd={block.type !== 'text' ? (): void => addBlock(sectionId) : undefined}
        onPolish={moduleType ? handlePolish : undefined}
        onGenerate={moduleType ? handleGenerate : undefined}
        onDelete={(): void => deleteBlock(sectionId, block.id)}
        onMoveUp={blockIndex > 0 ? handleMoveUp : undefined}
        onMoveDown={blockIndex < totalBlocks - 1 ? handleMoveDown : undefined}
        showDragHandle={false}
        disableHover={isEditing}
      >
        <BlockRenderer
          block={block}
          themeColor={themeColor}
          styles={SIMPLE_TEMPLATE_STYLES.blockRenderer}
          onEditingChange={setIsEditing}
        />
      </BlockWrapper>
    </div>
  )
}

export default function SimpleTemplate(props: SimpleTemplateProps): ReactElement {
  const { resume, theme } = props
  const isJobIntentionVisible: boolean = resume.jobIntentionVisible ?? Boolean(resume.jobIntention)
  const headerBaseInfo = resume.jobIntention?.position
    ? { ...(resume.baseInfo ?? {}), title: resume.jobIntention.position }
    : (resume.baseInfo ?? null)
  const pagePadding: string = `${theme.pagePaddingVertical}mm ${theme.pagePaddingHorizontal}mm`
  const baseInfoStyles = SIMPLE_TEMPLATE_STYLES.baseInfo ?? {}
  const jobIntentionStyles = SIMPLE_TEMPLATE_STYLES.jobIntention ?? {}
  const sectionHeaderStyles = SIMPLE_TEMPLATE_STYLES.sectionHeader ?? {}
  const styles = {
    ...SIMPLE_TEMPLATE_STYLES,
    baseInfo: {
      ...baseInfoStyles,
      name: {
        ...baseInfoStyles.name,
        color: theme.primaryColor,
      },
    },
    jobIntention: {
      ...jobIntentionStyles,
      title: {
        ...jobIntentionStyles.title,
        color: theme.primaryColor,
      },
      icon: {
        ...jobIntentionStyles.icon,
        color: theme.primaryColor,
      },
    },
    sectionHeader: {
      ...sectionHeaderStyles,
      color: theme.primaryColor,
      icon: {
        ...sectionHeaderStyles.icon,
        color: theme.primaryColor,
      },
    },
  }

  return (
    <div
      className="resume-container bg-white text-black mx-auto rounded"
      data-page-padding-vertical={theme.pagePaddingVertical}
      style={{
        color: theme.textColor,
        fontFamily: theme.fontFamily,
        fontSize: `${theme.fontSize}px`,
        lineHeight: theme.lineHeight,
        padding: pagePadding,
      }}
    >
      <div style={{ marginBottom: `${18 * theme.spacingScale}px` }}>
        <BaseInfoSection
          name={resume.name}
          baseInfo={headerBaseInfo}
          themeColor={theme.primaryColor}
          styles={styles.baseInfo}
        />
      </div>

      {isJobIntentionVisible ? (
        <div style={{ marginBottom: `${18 * theme.spacingScale}px` }}>
          <JobIntentionSection
            jobIntention={resume.jobIntention ?? null}
            themeColor={theme.primaryColor}
            styles={styles.jobIntention}
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
            <SectionContainer themeColor={theme.primaryColor}>
              <SectionHeader
                sectionId={section.id}
                title={section.title}
                icon={getSectionIcon(section.title) || undefined}
                themeColor={theme.primaryColor}
                styles={styles.sectionHeader}
              />
              <div className="space-y-3">
                {section.blocks.map((block) => (
                  <BlockRenderer
                    key={block.id}
                    block={block}
                    themeColor={theme.primaryColor}
                    styles={styles.blockRenderer}
                  />
                ))}
              </div>
            </SectionContainer>
          )
        }}
      >
        <main className="flex flex-col relative" style={{ gap: `${18 * theme.spacingScale}px` }}>
          {resume.sections.map((section) => (
            <SortableSectionWrapper key={section.id} sectionId={section.id}>
              {(sectionDragProps) => (
                <SectionView
                  section={section}
                  themeColor={theme.primaryColor}
                  dragHandleAttributes={sectionDragProps.attributes}
                  dragHandleListeners={sectionDragProps.listeners}
                  dragHandleRef={sectionDragProps.ref}
                  sectionHeaderStyles={styles.sectionHeader}
                >
                  {section.blocks.map((block, index) => (
                    <BlockRendererWrapper 
                      key={block.id}
                      block={block} 
                      sectionId={section.id}
                      blockIndex={index}
                      totalBlocks={section.blocks.length}
                      themeColor={theme.primaryColor}
                      spacingScale={theme.spacingScale}
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
  readonly section: Section
  readonly themeColor: string
  readonly children: ReactNode
  readonly dragHandleAttributes?: unknown
  readonly dragHandleListeners?: unknown
  readonly dragHandleRef?: (element: HTMLElement | null) => void
  readonly sectionHeaderStyles: SectionHeaderStyles
}

function SectionView(props: SectionViewProps): ReactElement {
  const { section, themeColor, children, dragHandleAttributes, dragHandleListeners, dragHandleRef, sectionHeaderStyles } = props
  const { id: sectionId, title, columns, blocks } = section
  const blockIds = blocks.map((b) => b.id)
  const isTextOnly = isTextOnlySection(section)
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
        icon={icon || undefined}
        themeColor={themeColor}
        styles={sectionHeaderStyles}
        onTitleChange={isCustomSection(title) ? (newTitle: string) => updateSectionTitle(sectionId, newTitle) : undefined}
        onAdd={isTextOnly ? undefined : (): void => addBlock(sectionId)}
        onDelete={handleDeleteSection}
        dragHandleAttributes={dragHandleAttributes}
        dragHandleListeners={dragHandleListeners}
        dragHandleRef={dragHandleRef}
      />
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
        onConfirm={confirmDelete}
      />
    </SectionContainer>
  )
}
