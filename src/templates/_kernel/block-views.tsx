import { useState } from 'react'
import type { ReactElement } from 'react'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import BlockWrapper from '@/components/blocks/block-wrapper'
import { useAppStore } from '@/state/store'
import { useAiSection } from '@/components/ai-section/ai-section-provider'
import { blockTypeToModuleType, extractBlockContentHtml } from '@/components/ai-section/block-module-utils'
import EditableDateField from '@/editor/editable-date-field'
import EditableFieldWrapper from '@/editor/editable-field-wrapper'
import { BlockRenderer } from '@/templates/components/v2'
import type { BlockRendererStyles } from '@/templates/components/v2'
import { hasMeaningfulText } from '@/lib/resume-placeholders'
import type { BlockSpec } from './types'
import { getBlockTypeLabel } from './shared'

export interface KernelBlockRowProps {
  readonly block: ResumeBlock
  readonly sectionId: string
  readonly blockIndex: number
  readonly totalBlocks: number
  readonly themeColor: string
  readonly spacingScale: number
  readonly blockSpec: BlockSpec
  readonly rendererStyles?: BlockRendererStyles
}

/** Render a single block row according to the configured block variant. */
export function KernelBlockRow(props: KernelBlockRowProps): ReactElement {
  const { blockSpec } = props
  if (blockSpec.variant === 'timeline-left-date') {
    return <TimelineLeftDateRow {...props} blockSpec={blockSpec} />
  }
  return <DefaultBlockRow {...props} />
}

// ---------------------------------------------------------------------------
// Shared: wraps BlockRenderer with hover actions
// ---------------------------------------------------------------------------

function BlockActionWrapper(props: KernelBlockRowProps): ReactElement {
  const { block, sectionId, blockIndex, totalBlocks, themeColor, rendererStyles } = props
  const addBlock = useAppStore((s) => s.addBlockByType)
  const deleteBlock = useAppStore((s) => s.deleteBlock)
  const moveBlockUp = useAppStore((s) => s.moveBlockUp)
  const moveBlockDown = useAppStore((s) => s.moveBlockDown)
  const [isEditing, setIsEditing] = useState(false)
  const { openPolish, openGenerate } = useAiSection()
  const moduleType = blockTypeToModuleType(block.type)
  const label = getBlockTypeLabel(block.type)
  return (
    <BlockWrapper
      blockType={label}
      onAdd={block.type !== 'text' ? (): void => addBlock(sectionId) : undefined}
      onPolish={moduleType ? (): void => openPolish(block.id, extractBlockContentHtml(block), moduleType) : undefined}
      onGenerate={moduleType ? (): void => openGenerate(block.id, moduleType, block) : undefined}
      onDelete={(): void => deleteBlock(sectionId, block.id)}
      onMoveUp={blockIndex > 0 ? (): void => moveBlockUp(sectionId, block.id) : undefined}
      onMoveDown={blockIndex < totalBlocks - 1 ? (): void => moveBlockDown(sectionId, block.id) : undefined}
      showDragHandle={false}
      disableHover={isEditing}
    >
      <BlockRenderer
        block={block}
        themeColor={themeColor}
        styles={rendererStyles}
        onEditingChange={setIsEditing}
      />
    </BlockWrapper>
  )
}

// ---------------------------------------------------------------------------
// Default block row
// ---------------------------------------------------------------------------

function DefaultBlockRow(props: KernelBlockRowProps): ReactElement {
  const { blockIndex, totalBlocks, spacingScale } = props
  return (
    <div style={{ marginBottom: blockIndex < totalBlocks - 1 ? `${16 * spacingScale}px` : '0' }}>
      <BlockActionWrapper {...props} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Timeline left-date block row
// ---------------------------------------------------------------------------

function TimelineLeftDateRow(
  props: KernelBlockRowProps & { blockSpec: Extract<BlockSpec, { variant: 'timeline-left-date' }> }
): ReactElement {
  const { block, sectionId, themeColor, blockSpec } = props
  const setResume = useAppStore((s) => s.setResume)
  const dateWidth = blockSpec.dateWidth ?? 140
  const dotColor = blockSpec.dotColor ?? themeColor
  const axisColor = blockSpec.axisColor ?? `${themeColor}30`
  const hasStartDate = 'startDate' in block && hasMeaningfulText(block.startDate)
  const hasEndDate = 'endDate' in block && hasMeaningfulText(block.endDate)
  const hasAnyDate = hasStartDate || hasEndDate
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)

  function updateBlockField(fieldName: string, value: string): void {
    setResume((draft) => {
      for (const section of draft.sections) {
        if (section.id === sectionId) {
          const b = section.blocks.find((bb) => bb.id === block.id)
          if (b) {
            // @ts-expect-error dynamic field update
            b[fieldName] = value
          }
          return
        }
      }
    })
  }

  return (
    <div className="flex gap-0">
      <div className="shrink-0 pt-[2px] pr-5 text-right" style={{ width: dateWidth }}>
        {'startDate' in block && (
          <div className={`text-[0.95em] font-semibold text-gray-700 leading-snug whitespace-nowrap justify-end items-center gap-x-1 ${hasAnyDate || datePopoverOpen ? 'flex' : 'hidden group-hover/block:flex group-hover/section:flex group-hover/section-edit:flex print:hidden'}`}>
            <EditableDateField
              blockId={block.id}
              fieldName="startDate"
              value={block.startDate as string}
              emptyMode={hasAnyDate ? 'hidden' : 'placeholder'}
              onOpenChange={setDatePopoverOpen}
            />
            {hasAnyDate ? (hasStartDate && hasEndDate ? <span>-</span> : null) : <span>-</span>}
            <EditableDateField
              blockId={block.id}
              fieldName="endDate"
              value={block.endDate as string}
              emptyMode={hasAnyDate ? 'hidden' : 'placeholder'}
              onOpenChange={setDatePopoverOpen}
            />
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
            <span className={`${hasMeaningfulText(block.major) || hasMeaningfulText(block.degree) ? '' : 'hidden group-hover/block:inline-flex group-hover/section:inline-flex group-hover/section-edit:inline-flex print:hidden'}`}>
              <EditableFieldWrapper
                blockId={block.id}
                fieldName="major"
                value={block.major}
                onUpdate={(val) => updateBlockField('major', val)}
                placeholder="专业"
                emptyMode={hasMeaningfulText(block.major) || hasMeaningfulText(block.degree) ? 'hidden' : 'placeholder'}
              />
              <span className="mx-1">/</span>
              <EditableFieldWrapper
                blockId={block.id}
                fieldName="degree"
                value={block.degree}
                onUpdate={(val) => updateBlockField('degree', val)}
                placeholder="学历"
                emptyMode={hasMeaningfulText(block.major) || hasMeaningfulText(block.degree) ? 'hidden' : 'placeholder'}
              />
            </span>
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
      <div className="relative flex flex-col items-center w-[20px] shrink-0">
        <div className="w-[8px] h-[8px] rounded-full mt-[6px] z-10 shrink-0" style={{ backgroundColor: dotColor }} />
        <div className="flex-1 w-[1.5px]" style={{ backgroundColor: axisColor }} />
      </div>
      <div className="flex-1 min-w-0 pl-4 pb-1">
        <BlockActionWrapper {...props} />
      </div>
    </div>
  )
}
