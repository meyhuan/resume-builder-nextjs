import type { ReactElement } from 'react'
import type { TextBlock } from '@/entities/blocks/text-block'
import EditableBlockWrapper from '@/editor/editable-block-wrapper'
import type { BaseRendererProps } from './types'

export interface TextRendererProps extends BaseRendererProps {
  readonly block: TextBlock
}

/**
 * 文本块渲染器 - 支持多种视觉风格
 */
export default function TextRenderer(props: TextRendererProps): ReactElement {
  const { block, variant } = props

  if (variant === 'creative') {
    return (
      <div className="bg-white rounded-2xl shadow-md p-5">
        <EditableBlockWrapper blockId={block.id} contentField="html" contentSize="sm" />
      </div>
    )
  }

  if (variant === 'professional') {
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

  // Simple & Elegant - 默认样式
  return (
    <div>
      <EditableBlockWrapper blockId={block.id} contentField="html" contentSize="sm" />
    </div>
  )
}
