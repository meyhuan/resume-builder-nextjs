import { useState } from 'react'
import type { ReactElement } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import type { Section } from '@/entities/resume/section'
import DeleteSectionDialog from '@/components/sections/delete-section-dialog'
import { SectionContainer } from '@/templates/components/v2'
import type { BlockRendererStyles } from '@/templates/components/v2'
import { isCustomSection } from '@/entities/blocks/block-factory'
import { useAppStore } from '@/state/store'
import { DndIds } from '@/dnd/ids'
import { KernelSectionHeader } from './section-headers'
import { KernelBlockRow } from './block-views'
import { isTextOnlySection } from './shared'
import type { SectionHeaderSpec, BlockSpec } from './types'

export interface KernelSectionViewProps {
  readonly section: Section
  readonly themeColor: string
  readonly spacingScale: number
  readonly sectionHeaderSpec: SectionHeaderSpec
  readonly blockSpec: BlockSpec
  readonly rendererStyles?: BlockRendererStyles
  readonly dragHandleAttributes?: unknown
  readonly dragHandleListeners?: unknown
  readonly dragHandleRef?: (el: HTMLElement | null) => void
}

/**
 * A kernel-driven section view: header + blocks + drop target + delete dialog.
 * All DnD IDs follow the existing DndIds convention.
 */
export function KernelSectionView(props: KernelSectionViewProps): ReactElement {
  const {
    section,
    themeColor,
    spacingScale,
    sectionHeaderSpec,
    blockSpec,
    rendererStyles,
    dragHandleAttributes,
    dragHandleListeners,
    dragHandleRef,
  } = props
  const { id: sectionId, title, columns, blocks } = section
  const blockIds = blocks.map((b) => b.id)
  const isTextOnly = isTextOnlySection(section)
  const addBlock = useAppStore((s) => s.addBlockByType)
  const deleteSection = useAppStore((s) => s.deleteSection)
  const updateSectionTitle = useAppStore((s) => s.updateSectionTitle)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const { setNodeRef } = useDroppable({ id: `${DndIds.SECTION_DROP_ID_PREFIX}${sectionId}` })

  return (
    <SectionContainer themeColor={themeColor}>
      <KernelSectionHeader
        title={title}
        themeColor={themeColor}
        spec={sectionHeaderSpec}
        onTitleChange={isCustomSection(title) ? (t: string) => updateSectionTitle(sectionId, t) : undefined}
        onAdd={isTextOnly ? undefined : (): void => addBlock(sectionId)}
        onDelete={(): void => setShowDeleteDialog(true)}
        dragHandleAttributes={dragHandleAttributes}
        dragHandleListeners={dragHandleListeners}
        dragHandleRef={dragHandleRef}
      />
      <SortableContext items={blockIds} strategy={rectSortingStrategy}>
        <div ref={setNodeRef} className={columns === 2 ? 'grid grid-cols-2 gap-4' : 'flex flex-col'}>
          {blocks.map((block, index) => (
            <KernelBlockRow
              key={block.id}
              block={block}
              sectionId={sectionId}
              blockIndex={index}
              totalBlocks={blocks.length}
              themeColor={themeColor}
              spacingScale={spacingScale}
              blockSpec={isTextOnly ? { variant: 'default' } : blockSpec}
              rendererStyles={rendererStyles}
            />
          ))}
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
