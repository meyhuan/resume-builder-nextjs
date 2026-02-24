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
import EditableDateField from '@/editor/editable-date-field'
import { getSectionIcon } from '@/utils/get-section-icon'
import { isCustomSection } from '@/entities/blocks/block-factory'
import { useAppStore } from '@/state/store'
import DragDropProvider from '@/dnd/drag-drop-provider'
import { DndIds } from '@/dnd/ids'
import { BaseInfoSection, JobIntentionSection, BlockRenderer, SectionContainer } from '@/templates/components/v2'
import { TIMELINE_TEMPLATE_STYLES } from './styles'

import EditableFieldWrapper from '@/editor/editable-field-wrapper'

/** Check if every block in a section is a TextBlock. */
function isTextOnlySection(section: Section): boolean {
  return section.blocks.length > 0 && section.blocks.every((b) => b.type === 'text')
}

/** Resolve a human-readable label from block type. */
function getBlockTypeLabel(type: string): string {
  if (type === 'experience') return '工作经历'
  if (type === 'project') return '项目经历'
  if (type === 'education') return '教育经历'
  if (type === 'campus') return '校园经历'
  return '内容'
}

// ---------------------------------------------------------------------------
// Block Renderer Wrapper — adds action buttons + drag
// ---------------------------------------------------------------------------

interface BlockRendererWrapperProps {
  readonly block: ResumeBlock
  readonly sectionId: string
  readonly blockIndex: number
  readonly totalBlocks: number
  readonly themeColor: string
  readonly spacingScale: number
}

function BlockRendererWrapper(props: BlockRendererWrapperProps): ReactElement {
  const { block, sectionId, blockIndex, totalBlocks, themeColor, spacingScale } = props
  const addBlock = useAppStore((s) => s.addBlockByType)
  const deleteBlock = useAppStore((s) => s.deleteBlock)
  const moveBlockUp = useAppStore((s) => s.moveBlockUp)
  const moveBlockDown = useAppStore((s) => s.moveBlockDown)
  const [isEditing, setIsEditing] = useState(false)
  const blockTypeLabel = getBlockTypeLabel(block.type)
  return (
    <div style={{ marginBottom: blockIndex < totalBlocks - 1 ? `${16 * spacingScale}px` : '0' }}>
      <BlockWrapper
        blockType={blockTypeLabel}
        onAdd={block.type !== 'text' ? (): void => addBlock(sectionId) : undefined}
        onPolish={(): void => { console.log('Polish', block.id) }}
        onDelete={(): void => deleteBlock(sectionId, block.id)}
        onMoveUp={blockIndex > 0 ? (): void => moveBlockUp(sectionId, block.id) : undefined}
        onMoveDown={blockIndex < totalBlocks - 1 ? (): void => moveBlockDown(sectionId, block.id) : undefined}
        showDragHandle={false}
        disableHover={isEditing}
      >
        <BlockRenderer
          block={block}
          themeColor={themeColor}
          styles={TIMELINE_TEMPLATE_STYLES.blockRenderer}
          onEditingChange={setIsEditing}
        />
      </BlockWrapper>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Timeline Block Row — date/sublabel on left, content on right with line
// ---------------------------------------------------------------------------

interface TimelineBlockRowProps {
  readonly block: ResumeBlock
  readonly sectionId: string
  readonly blockIndex: number
  readonly totalBlocks: number
  readonly themeColor: string
  readonly spacingScale: number
  readonly isLast: boolean
}

function TimelineBlockRow(props: TimelineBlockRowProps): ReactElement {
  const { block, sectionId, blockIndex, totalBlocks, themeColor, spacingScale } = props
  const setResume = useAppStore((s) => s.setResume)

  function updateBlockField(fieldName: string, value: string): void {
    setResume((draft) => {
      for (const section of draft.sections) {
        if (section.id === sectionId) {
          const b = section.blocks.find((b) => b.id === block.id)
          if (b) {
            // @ts-expect-error - dynamic field update
            b[fieldName] = value
          }
          return
        }
      }
    })
  }
  
  return (
    <div className="flex gap-0">
      {/* Left column — date and sublabel */}
      <div className="w-[175px] shrink-0 pt-[2px] pr-5 text-right">
        {'startDate' in block && (
          <div className="text-[0.95em] font-semibold text-gray-700 leading-snug whitespace-nowrap flex justify-end items-center gap-x-1">
            <EditableDateField blockId={block.id} fieldName="startDate" value={block.startDate as string} />
            <span>-</span>
            <EditableDateField blockId={block.id} fieldName="endDate" value={block.endDate as string} />
          </div>
        )}
        <div className="text-[0.85em] text-gray-500 mt-1 w-full text-right break-words leading-relaxed">
          {block.type === 'experience' && (
            <EditableFieldWrapper
              blockId={block.id}
              fieldName="position"
              value={block.position}
              onUpdate={(val) => updateBlockField('position', val)}
              placeholder="职位名称"
            />
          )}
          {block.type === 'project' && (
            <EditableFieldWrapper
              blockId={block.id}
              fieldName="role"
              value={block.role}
              onUpdate={(val) => updateBlockField('role', val)}
              placeholder="担任角色"
            />
          )}
          {block.type === 'education' && (
            <>
              <EditableFieldWrapper
                blockId={block.id}
                fieldName="major"
                value={block.major}
                onUpdate={(val) => updateBlockField('major', val)}
                placeholder="专业"
              />
              <span className="mx-1">/</span>
              <EditableFieldWrapper
                blockId={block.id}
                fieldName="degree"
                value={block.degree}
                onUpdate={(val) => updateBlockField('degree', val)}
                placeholder="学历"
              />
            </>
          )}
          {block.type === 'campus' && (
            <EditableFieldWrapper
              blockId={block.id}
              fieldName="position"
              value={block.position}
              onUpdate={(val) => updateBlockField('position', val)}
              placeholder="职务名称"
            />
          )}
        </div>
      </div>
      {/* Timeline axis */}
      <div className="relative flex flex-col items-center w-[20px] shrink-0">
        {/* Dot */}
        <div
          className="w-[8px] h-[8px] rounded-full mt-[6px] z-10 shrink-0"
          style={{ backgroundColor: themeColor }}
        />
        {/* Vertical line */}
        <div
          className="flex-1 w-[1.5px]"
          style={{ backgroundColor: `${themeColor}30` }}
        />
      </div>
      {/* Right column — block content */}
      <div className="flex-1 min-w-0 pl-4 pb-1">
        <BlockRendererWrapper
          block={block}
          sectionId={sectionId}
          blockIndex={blockIndex}
          totalBlocks={totalBlocks}
          themeColor={themeColor}
          spacingScale={spacingScale}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section View — section header + timeline rows
// ---------------------------------------------------------------------------

interface SectionViewProps {
  readonly section: Section
  readonly themeColor: string
  readonly spacingScale: number
  readonly children?: ReactNode
  readonly dragHandleAttributes?: unknown
  readonly dragHandleListeners?: unknown
  readonly dragHandleRef?: (element: HTMLElement | null) => void
}

function SectionView(props: SectionViewProps): ReactElement {
  const { section, themeColor, spacingScale, dragHandleAttributes, dragHandleListeners, dragHandleRef } = props
  const { id: sectionId, title, blocks } = section
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
      <SectionHeader
        sectionId={sectionId}
        title={title}
        icon={icon || undefined}
        themeColor={themeColor}
        styles={TIMELINE_TEMPLATE_STYLES.sectionHeader}
        layout="ribbon"
        onTitleChange={isCustomSection(title) ? (newTitle: string) => updateSectionTitle(sectionId, newTitle) : undefined}
        onAdd={isTextOnly ? undefined : (): void => addBlock(sectionId)}
        onDelete={(): void => setShowDeleteDialog(true)}
        dragHandleAttributes={dragHandleAttributes}
        dragHandleListeners={dragHandleListeners}
        dragHandleRef={dragHandleRef}
      />
      <SortableContext items={blockIds} strategy={rectSortingStrategy}>
        <div ref={setNodeRef} className="flex flex-col">
          {isTextOnly ? (
            /* Text-only sections render without timeline axis */
            blocks.map((block, index) => (
              <BlockRendererWrapper
                key={block.id}
                block={block}
                sectionId={sectionId}
                blockIndex={index}
                totalBlocks={blocks.length}
                themeColor={themeColor}
                spacingScale={spacingScale}
              />
            ))
          ) : (
            /* Structured blocks render with timeline axis */
            blocks.map((block, index) => (
              <TimelineBlockRow
                key={block.id}
                block={block}
                sectionId={sectionId}
                blockIndex={index}
                totalBlocks={blocks.length}
                themeColor={themeColor}
                spacingScale={spacingScale}
                isLast={index === blocks.length - 1}
              />
            ))
          )}
        </div>
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

// ---------------------------------------------------------------------------
// Main Template
// ---------------------------------------------------------------------------

interface TimelineTemplateProps {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
}

export default function TimelineTemplate(props: TimelineTemplateProps): ReactElement {
  const { resume, theme } = props
  return (
    <div
      className="resume-container bg-white text-black mx-auto rounded shadow-sm"
      style={{
        color: theme.textColor,
        fontFamily: theme.fontFamily,
        fontSize: `${theme.fontSize}px`,
        lineHeight: theme.lineHeight,
        padding: '22mm 15mm',
      }}
    >
      <div style={{ marginBottom: `${24 * theme.spacingScale}px` }}>
        <BaseInfoSection
          name={resume.name}
          baseInfo={resume.baseInfo ?? null}
          themeColor={theme.primaryColor}
          styles={TIMELINE_TEMPLATE_STYLES.baseInfo}
        />
      </div>
      <div style={{ marginBottom: `${24 * theme.spacingScale}px` }}>
        <JobIntentionSection
          jobIntention={resume.jobIntention ?? null}
          themeColor={theme.primaryColor}
          styles={TIMELINE_TEMPLATE_STYLES.jobIntention}
        />
      </div>
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
                styles={TIMELINE_TEMPLATE_STYLES.sectionHeader}
                layout="ribbon"
              />
              <div className="space-y-3">
                {section.blocks.map((block) => (
                  <BlockRenderer
                    key={block.id}
                    block={block}
                    themeColor={theme.primaryColor}
                    styles={{
                      ...TIMELINE_TEMPLATE_STYLES.blockRenderer,
                      subtitle: { className: 'hidden', fontSize: '0' },
                      dateRange: { className: 'hidden', fontSize: '0' },
                    }}
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
                <SectionView
                  section={section}
                  themeColor={theme.primaryColor}
                  spacingScale={theme.spacingScale}
                  dragHandleAttributes={sectionDragProps.attributes}
                  dragHandleListeners={sectionDragProps.listeners}
                  dragHandleRef={sectionDragProps.ref}
                />
              )}
            </SortableSectionWrapper>
          ))}
        </main>
      </DragDropProvider>
    </div>
  )
}
