/**
 * Creative Template - 创意风格简历模板
 * 特点：不对称布局、卡片设计、圆角阴影、活泼配色
 */
import { useState, type ReactElement, type ReactNode } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import SectionHeader from '@/components/sections/section-header'
import BlockWrapper from '@/components/blocks/block-wrapper'
import SortableSectionWrapper from '@/components/sections/sortable-section-wrapper'
import { getSectionIcon } from '@/utils/get-section-icon'
import DragDropProvider from '@/dnd/drag-drop-provider'
import { DndIds } from '@/dnd/ids'
import { useAppStore } from '@/state/store'
import { BlockRenderer as SharedBlockRenderer } from '@/templates/components/block-renderers'
import { BaseInfoSection, JobIntentionSection } from '@/templates/components/sections'

interface CreativeTemplateProps {
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
        variant="creative"
        themeColor={themeColor}
        onEditingChange={setIsEditing}
      />
    </BlockWrapper>
  )
}

export default function CreativeTemplate(props: CreativeTemplateProps): ReactElement {
  const { resume, theme } = props

  return (
    <div
      className="resume-container bg-gradient-to-br from-gray-50 to-gray-100 text-black mx-auto p-8 rounded-2xl shadow-xl"
      style={{
        color: theme.textColor,
        fontFamily: theme.fontFamily,
        fontSize: `${theme.fontSize}px`,
        lineHeight: theme.lineHeight,
        maxWidth: '210mm',
      }}
    >
      {/* 创意头部 */}
      <BaseInfoSection
        name={resume.name}
        baseInfo={resume.baseInfo ?? null}
        themeColor={theme.primaryColor}
        variant="creative"
      />

      {/* 求职意向 */}
      <JobIntentionSection
        jobIntention={resume.jobIntention ?? null}
        themeColor={theme.primaryColor}
        variant="creative"
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
  const { setNodeRef } = useDroppable({ id: `${DndIds.SECTION_DROP_ID_PREFIX}${sectionId}` })
  const icon = getSectionIcon(title)

  return (
    <section className="resume-section">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-2 h-8 rounded-full shrink-0" style={{ background: `linear-gradient(to bottom, ${themeColor}, ${themeColor}99)` }} />
        <div className="flex-1">
          <SectionHeader
            sectionId={sectionId}
            title={title}
            icon={icon ? <span style={{ color: themeColor }}>{icon}</span> : undefined}
            themeColor={themeColor}
            onAdd={() => addBlock(sectionId)}
            dragHandleAttributes={dragHandleAttributes}
            dragHandleListeners={dragHandleListeners}
            dragHandleRef={dragHandleRef}
          />
        </div>
      </div>
      <SortableContext items={blockIds} strategy={rectSortingStrategy}>
        <div ref={setNodeRef} className="space-y-4">
          {children}
        </div>
      </SortableContext>
    </section>
  )
}
