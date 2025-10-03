/**
 * Elegant Template - 优雅简约风格简历模板
 * 特点：简约设计、侧边信息栏、清晰层次
 * 使用新的统一组件架构
 */
import { useState, type ReactElement } from 'react'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import type { BaseInfo } from '@/entities/user/base-info'
import TemplateContainer from '@/templates/components/template-container'
import TemplateSection from '@/templates/components/template-section'
import SortableSectionWrapper from '@/components/sections/sortable-section-wrapper'
import DragDropProvider from '@/dnd/drag-drop-provider'
import BlockWrapper from '@/components/blocks/block-wrapper'
import BaseInfoModal from '@/components/modals/base-info-modal'
import EditableTextBlock from '@/editor/editable-text-block'
import ExperienceBlockView from '@/components/blocks/experience-block-view'
import ProjectBlockView from '@/components/blocks/project-block-view'
import EducationBlockView from '@/components/blocks/education-block-view'
import CampusBlockView from '@/components/blocks/campus-block-view'
import JobIntentionView from '@/components/resume/job-intention-view'
import { useAppStore } from '@/state/store'

interface ElegantTemplateProps {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
}

/**
 * Block 渲染器
 */
function BlockRenderer(props: {
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

  const content = ((): ReactElement => {
    switch (block.type) {
      case 'text':
        return <EditableTextBlock blockId={block.id} />
      case 'experience':
        return <ExperienceBlockView block={block} themeColor={themeColor} />
      case 'project':
        return <ProjectBlockView block={block} themeColor={themeColor} />
      case 'education':
        return <EducationBlockView block={block} themeColor={themeColor} />
      case 'campus':
        return <CampusBlockView block={block} themeColor={themeColor} />
      default:
        return <div className="text-gray-500" style={{ fontSize: '0.875em' }}>Unsupported block type</div>
    }
  })()

  return (
    <BlockWrapper
      blockType={blockTypeLabel}
      onAdd={(): void => addBlock(sectionId)}
      onPolish={handlePolish}
      onDelete={(): void => deleteBlock(sectionId, block.id)}
      onMoveUp={blockIndex > 0 ? handleMoveUp : undefined}
      onMoveDown={blockIndex < totalBlocks - 1 ? handleMoveDown : undefined}
      showDragHandle={false}
    >
      {content}
    </BlockWrapper>
  )
}

/**
 * 头部组件 - 优雅风格
 */
function ElegantHeader(props: {
  name: string
  baseInfo: BaseInfo | null
  themeColor: string
}): ReactElement {
  const { name, baseInfo, themeColor } = props
  const [showModal, setShowModal] = useState(false)
  const updateBaseInfo = useAppStore((s) => s.updateBaseInfo)

  return (
    <>
      <header className="relative group cursor-pointer border-b pb-6 mb-6" onClick={() => setShowModal(true)}>
        <button
          type="button"
          className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-xs px-2 py-1 rounded border hover:bg-gray-50"
          onClick={(e): void => {
            e.stopPropagation()
            setShowModal(true)
          }}
        >
          编辑
        </button>

        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2" style={{ color: themeColor }}>
            {name}
          </h1>

          {baseInfo?.title ? (
            <div className="text-base text-gray-600 mb-4">{baseInfo.title}</div>
          ) : null}

          {baseInfo ? (
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-gray-700">
              {baseInfo.phone ? <span>📱 {baseInfo.phone}</span> : null}
              {baseInfo.email ? <span>✉️ {baseInfo.email}</span> : null}
              {baseInfo.age ? <span>{baseInfo.age}岁</span> : null}
              {baseInfo.gender ? <span>{baseInfo.gender}</span> : null}
              {baseInfo.currentLocation ? <span>📍 {baseInfo.currentLocation}</span> : null}
              {baseInfo.workStartTime ? <span>💼 {baseInfo.workStartTime}</span> : null}
            </div>
          ) : (
            <div className="text-sm text-gray-400">点击添加基本信息</div>
          )}
        </div>
      </header>

      {showModal ? (
        <BaseInfoModal
          name={name}
          baseInfo={baseInfo}
          onClose={() => setShowModal(false)}
          onSave={(info, newName) => {
            updateBaseInfo(info, newName)
            setShowModal(false)
          }}
        />
      ) : null}
    </>
  )
}

/**
 * Elegant 模板主组件
 */
export default function ElegantTemplate(props: ElegantTemplateProps): ReactElement {
  const { resume, theme } = props

  return (
    <TemplateContainer theme={theme} style={{ maxWidth: '210mm' }}>
      {/* 头部信息 */}
      <ElegantHeader
        name={resume.name}
        baseInfo={resume.baseInfo ?? null}
        themeColor={theme.primaryColor}
      />

      {/* 求职意向 */}
      <JobIntentionView
        jobIntention={resume.jobIntention ?? null}
        themeColor={theme.primaryColor}
      />

      {/* 拖拽容器 */}
      <DragDropProvider
        resume={resume}
        theme={theme}
        onMoveSection={useAppStore((s) => s.moveSection)}
        onMoveWithinSection={useAppStore((s) => s.moveBlockInSection)}
        onMoveToSection={useAppStore((s) => s.moveBlockToSection)}
      >
        <main style={{ display: 'flex', flexDirection: 'column', gap: `${24 * theme.spacingScale}px` }}>
          {resume.sections.map((section) => (
            <SortableSectionWrapper key={section.id} sectionId={section.id}>
              {(dragProps) => (
                <TemplateSection
                  sectionId={section.id}
                  title={section.title}
                  theme={theme}
                  blockIds={section.blocks.map((b) => b.id)}
                  decorator="none"
                  dragHandleAttributes={dragProps.attributes}
                  dragHandleListeners={dragProps.listeners}
                  dragHandleRef={dragProps.ref}
                >
                  {section.blocks.map((block, index) => (
                    <BlockRenderer
                      key={block.id}
                      block={block}
                      sectionId={section.id}
                      blockIndex={index}
                      totalBlocks={section.blocks.length}
                      themeColor={theme.primaryColor}
                    />
                  ))}
                </TemplateSection>
              )}
            </SortableSectionWrapper>
          ))}
        </main>
      </DragDropProvider>
    </TemplateContainer>
  )
}
