import type { ReactElement } from 'react'
import type { ExperienceBlock } from '@/entities/blocks/experience-block'
import EditableBlockWrapper from '@/editor/editable-block-wrapper'
import EditableFieldWrapper from '@/editor/editable-field-wrapper'
import EditableDateField from '@/editor/editable-date-field'
import type { BaseRendererProps } from './types'

export interface ExperienceRendererProps extends BaseRendererProps {
  readonly block: ExperienceBlock
  readonly onEditingChange?: (isEditing: boolean) => void
}

/**
 * 工作经历渲染器 - 支持多种视觉风格
 */
export default function ExperienceRenderer(props: ExperienceRendererProps): ReactElement {
  const { block, variant, themeColor, onEditingChange } = props

  if (variant === 'creative') {
    return (
      <div className="bg-white rounded-2xl shadow-md p-5 hover:shadow-lg transition-shadow border-l-4" style={{ borderColor: themeColor }}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h3 className="text-base font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: themeColor }} />
              <EditableFieldWrapper
                blockId={block.id}
                fieldName="company"
                value={block.company}
                onUpdate={(): void => {}}
                onEditingChange={onEditingChange}
                className="font-bold"
              />
            </h3>
            <p className="text-sm text-gray-600 mt-1 ml-4">
              <EditableFieldWrapper blockId={block.id} fieldName="position" value={block.position} onUpdate={(): void => {}} />
              {block.industry ? (
                <span className="text-gray-400">
                  {' · '}
                  <EditableFieldWrapper blockId={block.id} fieldName="industry" value={block.industry} onUpdate={(): void => {}} />
                </span>
              ) : null}
            </p>
          </div>
          <div
            className="text-xs px-3 py-1 rounded-full ml-4 shrink-0"
            style={{ backgroundColor: `${themeColor}15`, color: themeColor }}
          >
            <EditableDateField blockId={block.id} fieldName="startDate" value={block.startDate} />
            {' - '}
            <EditableDateField blockId={block.id} fieldName="endDate" value={block.endDate} />
          </div>
        </div>
        <div className="mt-3 ml-4 bg-gray-50 rounded-lg p-3">
          <EditableBlockWrapper blockId={block.id} contentField="contentHtml" contentSize="xs" />
        </div>
      </div>
    )
  }

  if (variant === 'professional') {
    return (
      <div className="relative pl-4 border-l-2 border-gray-200">
        <div className="flex justify-between items-start mb-1">
          <div className="flex-1">
            <h3 className="text-base font-semibold">
              <EditableFieldWrapper
                blockId={block.id}
                fieldName="company"
                value={block.company}
                onUpdate={(): void => {}}
                onEditingChange={onEditingChange}
                className="font-semibold"
              />
            </h3>
            <p className="text-sm text-gray-600 mt-0.5">
              <EditableFieldWrapper
                blockId={block.id}
                fieldName="position"
                value={block.position}
                onUpdate={(): void => {}}
              />
              {block.industry ? (
                <>
                  {' | '}
                  <EditableFieldWrapper
                    blockId={block.id}
                    fieldName="industry"
                    value={block.industry}
                    onUpdate={(): void => {}}
                  />
                </>
              ) : null}
            </p>
          </div>
          <div className="text-xs text-gray-500 text-right ml-4 shrink-0">
            <EditableDateField blockId={block.id} fieldName="startDate" value={block.startDate} />
            {' - '}
            <EditableDateField blockId={block.id} fieldName="endDate" value={block.endDate} />
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

  // Simple & Elegant - 默认样式
  return (
    <div className="mb-3">
      <div className="flex justify-between items-start mb-1">
        <div className="flex-1">
          <h3 className="text-base font-semibold" style={{ color: themeColor }}>
            <EditableFieldWrapper
              blockId={block.id}
              fieldName="company"
              value={block.company}
              onUpdate={(): void => {}}
              onEditingChange={onEditingChange}
              className="font-semibold"
            />
          </h3>
          <p className="text-sm text-gray-600 mt-0.5">
            <EditableFieldWrapper
              blockId={block.id}
              fieldName="position"
              value={block.position}
              onUpdate={(): void => {}}
            />
            {block.industry ? (
              <span className="text-gray-400">
                {' · '}
                <EditableFieldWrapper
                  blockId={block.id}
                  fieldName="industry"
                  value={block.industry}
                  onUpdate={(): void => {}}
                />
              </span>
            ) : null}
          </p>
        </div>
        <div className="text-xs text-gray-500 text-right ml-4 shrink-0">
          <EditableDateField blockId={block.id} fieldName="startDate" value={block.startDate} />
          {' - '}
          <EditableDateField blockId={block.id} fieldName="endDate" value={block.endDate} />
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
