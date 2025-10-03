/**
 * Professional Template - 专业商务风格简历模板
 * 特点：传统商务风格、清晰层次、正式感
 */
import { useState, type ReactElement, type ReactNode } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import type { BaseInfo } from '@/entities/user/base-info'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import EditableBlockWrapper from '@/editor/editable-block-wrapper'
import EditableFieldWrapper from '@/editor/editable-field-wrapper'
import BaseInfoModal from '@/components/modals/base-info-modal'
import SectionHeader from '@/components/sections/section-header'
import BlockWrapper from '@/components/blocks/block-wrapper'
import SortableSectionWrapper from '@/components/sections/sortable-section-wrapper'
import JobIntentionView from '@/components/resume/job-intention-view'
import { getSectionIcon } from '@/utils/get-section-icon'
import DragDropProvider from '@/dnd/drag-drop-provider'
import { DndIds } from '@/dnd/ids'
import { useAppStore } from '@/state/store'

interface ProfessionalTemplateProps {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
}

function BlockRenderer(props: {
  block: ResumeBlock
  sectionId: string
  blockIndex: number
  totalBlocks: number
}): ReactElement {
  const { block, sectionId, blockIndex, totalBlocks } = props
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
    if (block.type === 'experience') {
      return (
        <div className="relative pl-4 border-l-2 border-gray-200">
          <div className="flex justify-between items-start mb-1">
            <div className="flex-1">
              <h3 className="text-base font-semibold">
                <EditableFieldWrapper
                  blockId={block.id}
                  fieldName="company"
                  value={block.company}
                  onUpdate={() => {}}
                  className="font-semibold"
                />
              </h3>
              <p className="text-sm text-gray-600 mt-0.5">
                <EditableFieldWrapper
                  blockId={block.id}
                  fieldName="position"
                  value={block.position}
                  onUpdate={() => {}}
                />
                {block.industry ? (
                  <>
                    {' | '}
                    <EditableFieldWrapper
                      blockId={block.id}
                      fieldName="industry"
                      value={block.industry}
                      onUpdate={() => {}}
                    />
                  </>
                ) : null}
              </p>
            </div>
            <div className="text-xs text-gray-500 text-right ml-4 shrink-0">
              <EditableFieldWrapper
                blockId={block.id}
                fieldName="startDate"
                value={block.startDate}
                onUpdate={() => {}}
              />
              {' - '}
              <EditableFieldWrapper
                blockId={block.id}
                fieldName="endDate"
                value={block.endDate}
                onUpdate={() => {}}
              />
            </div>
          </div>
          <div className="mt-2">
            <EditableBlockWrapper
              blockId={block.id}
              contentField="contentHtml"
              contentSize="xs"
            />
          </div>
        </div>
      )
    }

    if (block.type === 'project') {
      return (
        <div className="relative pl-4 border-l-2 border-gray-200">
          <div className="flex justify-between items-start mb-1">
            <div className="flex-1">
              <h3 className="text-base font-semibold">
                <EditableFieldWrapper
                  blockId={block.id}
                  fieldName="name"
                  value={block.name}
                  onUpdate={() => {}}
                  className="font-semibold"
                />
              </h3>
              {block.role ? (
                <p className="text-sm text-gray-600 mt-0.5">
                  <EditableFieldWrapper
                    blockId={block.id}
                    fieldName="role"
                    value={block.role}
                    onUpdate={() => {}}
                  />
                </p>
              ) : null}
            </div>
            <div className="text-xs text-gray-500 text-right ml-4 shrink-0">
              <EditableFieldWrapper
                blockId={block.id}
                fieldName="startDate"
                value={block.startDate}
                onUpdate={() => {}}
              />
              {' - '}
              <EditableFieldWrapper
                blockId={block.id}
                fieldName="endDate"
                value={block.endDate}
                onUpdate={() => {}}
              />
            </div>
          </div>
          <div className="mt-2">
            <EditableBlockWrapper
              blockId={block.id}
              contentField="contentHtml"
              contentSize="xs"
            />
          </div>
        </div>
      )
    }

    if (block.type === 'education') {
      return (
        <div className="relative pl-4 border-l-2 border-gray-200">
          <div className="flex justify-between items-start mb-1">
            <div className="flex-1">
              <h3 className="text-base font-semibold">
                <EditableFieldWrapper
                  blockId={block.id}
                  fieldName="school"
                  value={block.school}
                  onUpdate={() => {}}
                  className="font-semibold"
                />
              </h3>
              <p className="text-sm text-gray-600 mt-0.5">
                <EditableFieldWrapper
                  blockId={block.id}
                  fieldName="major"
                  value={block.major}
                  onUpdate={() => {}}
                />
                {' | '}
                <EditableFieldWrapper
                  blockId={block.id}
                  fieldName="degree"
                  value={block.degree}
                  onUpdate={() => {}}
                />
              </p>
            </div>
            <div className="text-xs text-gray-500 text-right ml-4 shrink-0">
              <EditableFieldWrapper
                blockId={block.id}
                fieldName="startDate"
                value={block.startDate}
                onUpdate={() => {}}
              />
              {' - '}
              <EditableFieldWrapper
                blockId={block.id}
                fieldName="endDate"
                value={block.endDate}
                onUpdate={() => {}}
              />
            </div>
          </div>
          {block.courseHtml ? (
            <div className="mt-2">
              <EditableBlockWrapper
                blockId={block.id}
                contentField="courseHtml"
                contentSize="xs"
              />
            </div>
          ) : null}
        </div>
      )
    }

    if (block.type === 'campus') {
      return (
        <div className="relative pl-4 border-l-2 border-gray-200">
          <div className="flex justify-between items-start mb-1">
            <div className="flex-1">
              <h3 className="text-base font-semibold">
                <EditableFieldWrapper
                  blockId={block.id}
                  fieldName="organization"
                  value={block.organization}
                  onUpdate={() => {}}
                  className="font-semibold"
                />
              </h3>
              <p className="text-sm text-gray-600 mt-0.5">
                <EditableFieldWrapper
                  blockId={block.id}
                  fieldName="position"
                  value={block.position}
                  onUpdate={() => {}}
                />
              </p>
            </div>
            <div className="text-xs text-gray-500 text-right ml-4 shrink-0">
              <EditableFieldWrapper
                blockId={block.id}
                fieldName="startDate"
                value={block.startDate}
                onUpdate={() => {}}
              />
              {' - '}
              <EditableFieldWrapper
                blockId={block.id}
                fieldName="endDate"
                value={block.endDate}
                onUpdate={() => {}}
              />
            </div>
          </div>
          <div className="mt-2">
            <EditableBlockWrapper
              blockId={block.id}
              contentField="contentHtml"
              contentSize="xs"
            />
          </div>
        </div>
      )
    }

    if (block.type === 'text') {
      return (
        <div>
          <EditableBlockWrapper
            blockId={block.id}
            contentField="html"
            contentSize="sm"
          />
        </div>
      )
    }

    return <div className="text-gray-500 text-sm">Unsupported block type</div>
  })()

  return (
    <BlockWrapper
      blockType={blockTypeLabel}
      onAdd={() => addBlock(sectionId)}
      onPolish={handlePolish}
      onDelete={() => deleteBlock(sectionId, block.id)}
      onMoveUp={blockIndex > 0 ? handleMoveUp : undefined}
      onMoveDown={blockIndex < totalBlocks - 1 ? handleMoveDown : undefined}
      showDragHandle={false}
    >
      {content}
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
        <ProfessionalHeader
          name={resume.name}
          baseInfo={resume.baseInfo ?? null}
          themeColor={theme.primaryColor}
        />

        {/* 求职意向 */}
        <JobIntentionView jobIntention={resume.jobIntention ?? null} themeColor={theme.primaryColor} />

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
                      <BlockRenderer
                        key={block.id}
                        block={block}
                        sectionId={section.id}
                        blockIndex={index}
                        totalBlocks={section.blocks.length}
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
  const { setNodeRef } = useDroppable({ id: `${DndIds.SECTION_DROP_ID_PREFIX}${sectionId}` })
  const icon = getSectionIcon(title)

  return (
    <section className="resume-section">
      <div className="mb-4">
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
        <div className="h-0.5 mt-2" style={{ backgroundColor: themeColor }} />
      </div>
      <SortableContext items={blockIds} strategy={rectSortingStrategy}>
        <div ref={setNodeRef} className="space-y-4">
          {children}
        </div>
      </SortableContext>
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.77.63 2.6a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.48-1.15a2 2 0 0 1 2.11-.45c.83.3 1.7.51 2.6.63A2 2 0 0 1 22 16.92z" />
                </svg>
                <span>{baseInfo.phone}</span>
              </div>
            ) : null}

            {baseInfo?.email ? (
              <div className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
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
