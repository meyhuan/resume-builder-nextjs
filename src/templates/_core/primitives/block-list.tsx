import type { ReactElement, ReactNode } from 'react'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import type { Section } from '@/entities/resume/section'
import { KernelBlockRow } from '@/templates/_kernel/block-views'
import type { BlockSpec } from '@/templates/_kernel/types'
import type { BlockRendererStyles } from '@/templates/components/v2'
import { isTextOnlySection } from '@/templates/_kernel/shared'
import type { EditableSection } from '../hooks/use-editable-section'

/**
 * Renders the sortable list of blocks for a section.
 *
 * Templates call this *inside* their bespoke section JSX, passing the
 * `EditableSection` from `useEditableSection` and a `blockVariant` that
 * decides block chrome (default / timeline / compact).
 *
 * For power users who want to fully custom-render each block, pass
 * `renderBlock` to replace the default row layout.
 */
export interface BlockListProps {
  readonly section: EditableSection
  readonly themeColor: string
  readonly spacingScale?: number
  /** Block variant. Defaults to `default`. */
  readonly blockVariant?: BlockSpec
  /** Optional grid gap override (px). */
  readonly className?: string
  readonly rendererStyles?: BlockRendererStyles
  readonly renderBlock?: (args: {
    readonly block: Section['blocks'][number]
    readonly index: number
    readonly total: number
  }) => ReactNode
}

export function BlockList(props: BlockListProps): ReactElement {
  const {
    section: editable, themeColor,
    spacingScale = 1,
    blockVariant = { variant: 'default' } as BlockSpec,
    className, rendererStyles, renderBlock,
  } = props
  const { section, dropRef } = editable
  const { id: sectionId, blocks, columns } = section
  const blockIds: string[] = blocks.map((b) => b.id)
  const textOnly: boolean = isTextOnlySection(section)

  return (
    <SortableContext items={blockIds} strategy={rectSortingStrategy}>
      <div
        ref={dropRef}
        className={className ?? (columns === 2 ? 'grid grid-cols-2 gap-4' : 'flex flex-col')}
      >
        {blocks.map((block, index) => (
          renderBlock
            ? <div key={block.id}>{renderBlock({ block, index, total: blocks.length })}</div>
            : (
              <KernelBlockRow
                key={block.id}
                block={block}
                sectionId={sectionId}
                blockIndex={index}
                totalBlocks={blocks.length}
                themeColor={themeColor}
                spacingScale={spacingScale}
                blockSpec={textOnly ? { variant: 'default' } : blockVariant}
                rendererStyles={rendererStyles}
              />
            )
        ))}
      </div>
    </SortableContext>
  )
}
