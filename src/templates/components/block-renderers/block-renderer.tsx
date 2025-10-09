import type { ReactElement } from 'react'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import type { TemplateVariant } from './types'
import ExperienceRenderer from './experience-renderer'
import ProjectRenderer from './project-renderer'
import EducationRenderer from './education-renderer'
import CampusRenderer from './campus-renderer'
import TextRenderer from './text-renderer'

export interface BlockRendererProps {
  readonly block: ResumeBlock
  readonly variant: TemplateVariant
  readonly themeColor: string
  readonly onEditingChange?: (isEditing: boolean) => void
}

/**
 * 通用 Block 渲染器
 * 根据 block 类型自动选择对应的渲染器
 */
export default function BlockRenderer(props: BlockRendererProps): ReactElement {
  const { block, variant, themeColor, onEditingChange } = props

  switch (block.type) {
    case 'experience':
      return (
        <ExperienceRenderer
          block={block}
          variant={variant}
          themeColor={themeColor}
          onEditingChange={onEditingChange}
        />
      )
    case 'project':
      return (
        <ProjectRenderer
          block={block}
          variant={variant}
          themeColor={themeColor}
          onEditingChange={onEditingChange}
        />
      )
    case 'education':
      return (
        <EducationRenderer
          block={block}
          variant={variant}
          themeColor={themeColor}
          onEditingChange={onEditingChange}
        />
      )
    case 'campus':
      return (
        <CampusRenderer
          block={block}
          variant={variant}
          themeColor={themeColor}
          onEditingChange={onEditingChange}
        />
      )
    case 'text':
      return (
        <TextRenderer
          block={block}
          variant={variant}
          themeColor={themeColor}
        />
      )
    default:
      return (
        <div className="text-gray-500" style={{ fontSize: '0.875em' }}>
          Unsupported block type
        </div>
      )
  }
}
