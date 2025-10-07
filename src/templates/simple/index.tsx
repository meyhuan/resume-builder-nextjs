import { useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import type { BaseInfo } from '@/entities/user/base-info'
import EditableTextBlock from '@/editor/editable-text-block'
import ExperienceBlockView from '@/components/blocks/experience-block-view'
import ProjectBlockView from '@/components/blocks/project-block-view'
import EducationBlockView from '@/components/blocks/education-block-view'
import CampusBlockView from '@/components/blocks/campus-block-view'
import BaseInfoModal from '@/components/modals/base-info-modal'
import JobIntentionView from '@/components/resume/job-intention-view'
import SectionHeader from '@/components/sections/section-header'
import BlockWrapper from '@/components/blocks/block-wrapper'
import SortableSectionWrapper from '@/components/sections/sortable-section-wrapper'
import { getSectionIcon } from '@/utils/get-section-icon'
import { useAppStore } from '@/state/store'
import DragDropProvider from '@/dnd/drag-drop-provider'
import { DndIds } from '@/dnd/ids'

interface SimpleTemplateProps {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
}

function BlockRenderer(props: { 
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
    // TODO: implement AI polish logic
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
        return <EditableTextBlock blockId={block.id} onEditingChange={setIsEditing} />
      case 'experience':
        return <ExperienceBlockView block={block} themeColor={themeColor} onEditingChange={setIsEditing} />
      case 'project':
        return <ProjectBlockView block={block} themeColor={themeColor} onEditingChange={setIsEditing} />
      case 'education':
        return <EducationBlockView block={block} themeColor={themeColor} onEditingChange={setIsEditing} />
      case 'campus':
        return <CampusBlockView block={block} themeColor={themeColor} onEditingChange={setIsEditing} />
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
      disableHover={isEditing}
    >
      {content}
    </BlockWrapper>
  )
}

export default function SimpleTemplate(props: SimpleTemplateProps): ReactElement {
  const { resume, theme } = props

  return (
    <div
      className="resume-container bg-white text-black mx-auto p-8 rounded shadow-sm"
      style={{
        color: theme.textColor,
        fontFamily: theme.fontFamily,
        fontSize: `${theme.fontSize}px`,
        lineHeight: theme.lineHeight,
      }}
    >
      <HeaderBaseInfo
        name={resume.name}
        baseInfo={resume.baseInfo ?? null}
        themeColor={theme.primaryColor}
      />

      <JobIntentionView
        jobIntention={resume.jobIntention ?? null}
        themeColor={theme.primaryColor}
      />

      <DragDropProvider
        resume={resume}
        theme={theme}
        onMoveSection={useAppStore((s) => s.moveSection)}
        onMoveWithinSection={useAppStore((s) => s.moveBlockInSection)}
        onMoveToSection={useAppStore((s) => s.moveBlockToSection)}
      >
        <main className="flex flex-col relative" style={{ gap: `${24 * theme.spacingScale}px` }}>
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
                    <BlockRenderer 
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

interface HeaderBaseInfoProps {
  readonly name: string
  readonly baseInfo: BaseInfo | null
  readonly themeColor: string
}

function HeaderBaseInfo(props: HeaderBaseInfoProps): ReactElement {
  const { name, baseInfo, themeColor } = props
  const [showModal, setShowModal] = useState(false)
  const [hoveredField, setHoveredField] = useState<string | null>(null)
  const updateBaseInfo = useAppStore((s) => s.updateBaseInfo)

  function handleDeleteField(field: string): void {
    if (!baseInfo) return
    const updated = { ...baseInfo }
    if (field === 'phone') updated.phone = undefined
    if (field === 'email') updated.email = undefined
    if (field === 'gender') updated.gender = undefined
    if (field === 'age') updated.age = undefined
    if (field === 'nation') updated.nation = undefined
    if (field === 'household') updated.household = undefined
    if (field === 'currentLocation') updated.currentLocation = undefined
    if (field === 'workStartTime') updated.workStartTime = undefined
    if (field === 'politicalStatus') updated.politicalStatus = undefined
    if (field === 'height') updated.height = undefined
    if (field === 'weight') updated.weight = undefined
    updateBaseInfo(updated, name)
  }

  return (
    <>
      <header 
        className="mb-5 flex items-start gap-4 relative group cursor-pointer print:cursor-default" 
        onClick={(): void => setShowModal(true)}
      >
        <button
          type="button"
          className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-gray-400 hover:text-gray-600"
          onClick={(e): void => {
            e.stopPropagation()
            setShowModal(true)
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="w-12 h-16 rounded bg-cyan-500 overflow-hidden shrink-0">
          {baseInfo?.avatarUrl ? (
            <img src={baseInfo.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
          ) : null}
        </div>
        <div className="flex-1 min-w-0">
          <div className="mb-2">
            <h1 className="font-bold mb-0.5" style={{ color: themeColor, fontSize: '1.5em' }}>{name}</h1>
            {baseInfo?.title ? <div className="text-gray-600" style={{ fontSize: '0.85em' }}>{baseInfo.title}</div> : null}
          </div>
          <div className="grid grid-cols-2 gap-y-1 gap-x-6" style={{ fontSize: '0.85em' }}>
            {baseInfo?.phone ? (
              <div 
                className="flex items-center gap-1.5 text-gray-700 relative group/field hover:bg-gray-50 rounded px-1 py-0.5 transition-colors"
                onMouseEnter={(): void => setHoveredField('phone')}
                onMouseLeave={(): void => setHoveredField(null)}
              >
                <IconPhone />
                <span className="text-gray-500">电话：</span>
                <span>{baseInfo.phone}</span>
                {hoveredField === 'phone' ? (
                  <button
                    type="button"
                    className="ml-auto print:hidden text-red-500 hover:text-red-700"
                    onClick={(e): void => {
                      e.stopPropagation()
                      handleDeleteField('phone')
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.1"/>
                      <path d="M15 9l-6 6m0-6l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                ) : null}
              </div>
            ) : null}
            {baseInfo?.email ? (
              <div 
                className="flex items-center gap-1.5 text-gray-700 relative group/field hover:bg-gray-50 rounded px-1 py-0.5 transition-colors"
                onMouseEnter={(): void => setHoveredField('email')}
                onMouseLeave={(): void => setHoveredField(null)}
              >
                <IconMail />
                <span className="text-gray-500">邮箱：</span>
                <span>{baseInfo.email}</span>
                {hoveredField === 'email' ? (
                  <button
                    type="button"
                    className="ml-auto print:hidden text-red-500 hover:text-red-700"
                    onClick={(e): void => {
                      e.stopPropagation()
                      handleDeleteField('email')
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.1"/>
                      <path d="M15 9l-6 6m0-6l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                ) : null}
              </div>
            ) : null}
            {baseInfo?.gender ? (
              <div 
                className="flex items-center gap-1.5 text-gray-700 relative group/field hover:bg-gray-50 rounded px-1 py-0.5 transition-colors"
                onMouseEnter={(): void => setHoveredField('gender')}
                onMouseLeave={(): void => setHoveredField(null)}
              >
                <IconGender />
                <span className="text-gray-500">性别：</span>
                <span>{baseInfo.gender}</span>
                {hoveredField === 'gender' ? (
                  <button
                    type="button"
                    className="ml-auto print:hidden text-red-500 hover:text-red-700"
                    onClick={(e): void => {
                      e.stopPropagation()
                      handleDeleteField('gender')
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.1"/>
                      <path d="M15 9l-6 6m0-6l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                ) : null}
              </div>
            ) : null}
            {typeof baseInfo?.age === 'number' ? (
              <div 
                className="flex items-center gap-1.5 text-gray-700 relative group/field hover:bg-gray-50 rounded px-1 py-0.5 transition-colors"
                onMouseEnter={(): void => setHoveredField('age')}
                onMouseLeave={(): void => setHoveredField(null)}
              >
                <IconAge />
                <span className="text-gray-500">年龄：</span>
                <span>{baseInfo.age}</span>
                {hoveredField === 'age' ? (
                  <button
                    type="button"
                    className="ml-auto print:hidden text-red-500 hover:text-red-700"
                    onClick={(e): void => {
                      e.stopPropagation()
                      handleDeleteField('age')
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.1"/>
                      <path d="M15 9l-6 6m0-6l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                ) : null}
              </div>
            ) : null}
            {baseInfo?.nation ? (
              <div 
                className="flex items-center gap-1.5 text-gray-700 relative group/field hover:bg-gray-50 rounded px-1 py-0.5 transition-colors"
                onMouseEnter={(): void => setHoveredField('nation')}
                onMouseLeave={(): void => setHoveredField(null)}
              >
                <span className="text-gray-500">民族：</span>
                <span>{baseInfo.nation}</span>
                {hoveredField === 'nation' ? (
                  <button
                    type="button"
                    className="ml-auto print:hidden text-red-500 hover:text-red-700"
                    onClick={(e): void => {
                      e.stopPropagation()
                      handleDeleteField('nation')
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.1"/>
                      <path d="M15 9l-6 6m0-6l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                ) : null}
              </div>
            ) : null}
            {baseInfo?.household ? (
              <div 
                className="flex items-center gap-1.5 text-gray-700 relative group/field hover:bg-gray-50 rounded px-1 py-0.5 transition-colors"
                onMouseEnter={(): void => setHoveredField('household')}
                onMouseLeave={(): void => setHoveredField(null)}
              >
                <span className="text-gray-500">户籍：</span>
                <span>{baseInfo.household}</span>
                {hoveredField === 'household' ? (
                  <button
                    type="button"
                    className="ml-auto print:hidden text-red-500 hover:text-red-700"
                    onClick={(e): void => {
                      e.stopPropagation()
                      handleDeleteField('household')
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.1"/>
                      <path d="M15 9l-6 6m0-6l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                ) : null}
              </div>
            ) : null}
            {baseInfo?.currentLocation ? (
              <div 
                className="flex items-center gap-1.5 text-gray-700 relative group/field hover:bg-gray-50 rounded px-1 py-0.5 transition-colors"
                onMouseEnter={(): void => setHoveredField('currentLocation')}
                onMouseLeave={(): void => setHoveredField(null)}
              >
                <span className="text-gray-500">现所在地：</span>
                <span>{baseInfo.currentLocation}</span>
                {hoveredField === 'currentLocation' ? (
                  <button
                    type="button"
                    className="ml-auto print:hidden text-red-500 hover:text-red-700"
                    onClick={(e): void => {
                      e.stopPropagation()
                      handleDeleteField('currentLocation')
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.1"/>
                      <path d="M15 9l-6 6m0-6l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                ) : null}
              </div>
            ) : null}
            {baseInfo?.workStartTime ? (
              <div 
                className="flex items-center gap-1.5 text-gray-700 relative group/field hover:bg-gray-50 rounded px-1 py-0.5 transition-colors"
                onMouseEnter={(): void => setHoveredField('workStartTime')}
                onMouseLeave={(): void => setHoveredField(null)}
              >
                <span className="text-gray-500">工作时间：</span>
                <span>{baseInfo.workStartTime}</span>
                {hoveredField === 'workStartTime' ? (
                  <button
                    type="button"
                    className="ml-auto print:hidden text-red-500 hover:text-red-700"
                    onClick={(e): void => {
                      e.stopPropagation()
                      handleDeleteField('workStartTime')
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.1"/>
                      <path d="M15 9l-6 6m0-6l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                ) : null}
              </div>
            ) : null}
            {baseInfo?.politicalStatus ? (
              <div 
                className="flex items-center gap-1.5 text-gray-700 relative group/field hover:bg-gray-50 rounded px-1 py-0.5 transition-colors"
                onMouseEnter={(): void => setHoveredField('politicalStatus')}
                onMouseLeave={(): void => setHoveredField(null)}
              >
                <span className="text-gray-500">政治面貌：</span>
                <span>{baseInfo.politicalStatus}</span>
                {hoveredField === 'politicalStatus' ? (
                  <button
                    type="button"
                    className="ml-auto print:hidden text-red-500 hover:text-red-700"
                    onClick={(e): void => {
                      e.stopPropagation()
                      handleDeleteField('politicalStatus')
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.1"/>
                      <path d="M15 9l-6 6m0-6l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                ) : null}
              </div>
            ) : null}
            {baseInfo?.height ? (
              <div 
                className="flex items-center gap-1.5 text-gray-700 relative group/field hover:bg-gray-50 rounded px-1 py-0.5 transition-colors"
                onMouseEnter={(): void => setHoveredField('height')}
                onMouseLeave={(): void => setHoveredField(null)}
              >
                <span className="text-gray-500">身高：</span>
                <span>{baseInfo.height}cm</span>
                {hoveredField === 'height' ? (
                  <button
                    type="button"
                    className="ml-auto print:hidden text-red-500 hover:text-red-700"
                    onClick={(e): void => {
                      e.stopPropagation()
                      handleDeleteField('height')
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.1"/>
                      <path d="M15 9l-6 6m0-6l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                ) : null}
              </div>
            ) : null}
            {baseInfo?.weight ? (
              <div 
                className="flex items-center gap-1.5 text-gray-700 relative group/field hover:bg-gray-50 rounded px-1 py-0.5 transition-colors"
                onMouseEnter={(): void => setHoveredField('weight')}
                onMouseLeave={(): void => setHoveredField(null)}
              >
                <span className="text-gray-500">体重：</span>
                <span>{baseInfo.weight}kg</span>
                {hoveredField === 'weight' ? (
                  <button
                    type="button"
                    className="ml-auto print:hidden text-red-500 hover:text-red-700"
                    onClick={(e): void => {
                      e.stopPropagation()
                      handleDeleteField('weight')
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.1"/>
                      <path d="M15 9l-6 6m0-6l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {showModal ? (
        <BaseInfoModal
          baseInfo={baseInfo}
          name={name}
          onClose={(): void => setShowModal(false)}
          onSave={updateBaseInfo}
        />
      ) : null}
    </>
  )
}

function IconPhone(): ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.77.63 2.6a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.48-1.15a2 2 0 0 1 2.11-.45c.83.3 1.7.51 2.6.63A2 2 0 0 1 22 16.92z"/>
    </svg>
  )
}

function IconMail(): ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  )
}

function IconGender(): ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4"/>
      <path d="M15 9l6-6"/>
      <polyline points="21 3 15 3 15 9"/>
    </svg>
  )
}

function IconAge(): ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
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
  const { setNodeRef } = useDroppable({ id: `${DndIds.SECTION_DROP_ID_PREFIX}${sectionId}` })
  const icon = getSectionIcon(title)
  
  return (
    <section className="resume-section mb-5">
      <SectionHeader
        sectionId={sectionId}
        title={title}
        icon={icon ? <span style={{ color: themeColor }}>{icon}</span> : undefined}
        themeColor={themeColor}
        onAdd={(): void => addBlock(sectionId)}
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
    </section>
  )
}
