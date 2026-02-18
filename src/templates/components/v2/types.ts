/**
 * V2 Template Component Types - Style-Driven Architecture
 * 
 * 完全解耦的样式配置系统，支持无限模板扩展
 * 新增模板无需修改共用组件代码
 */

import type { ReactElement } from 'react'
import type { BaseInfo } from '@/entities/user/base-info'
import type { JobIntention } from '@/entities/user/job-intention'
import type { ResumeBlock } from '@/entities/blocks/resume-block'

/**
 * 头像样式配置
 */
export interface AvatarStyles {
  readonly size?: string
  readonly shape?: 'square' | 'rounded' | 'circle' | string
  readonly className?: string
  readonly containerClassName?: string
  readonly imageClassName?: string
  readonly fallbackClassName?: string
  readonly showFallbackText?: boolean
}

/**
 * 文本字段样式配置
 */
export interface TextFieldStyles {
  readonly className?: string
  readonly labelClassName?: string
  readonly valueClassName?: string
  readonly containerClassName?: string
  readonly fontSize?: string
  readonly fontWeight?: string
  readonly lineHeight?: string
  readonly color?: string
}

/**
 * 布局配置
 */
export type LayoutType = 'horizontal' | 'vertical' | 'grid' | 'flex'

export interface LayoutStyles {
  readonly type?: LayoutType
  readonly className?: string
  readonly gap?: string
  readonly columns?: number
  readonly gridTemplateColumns?: string
}

/**
 * BaseInfoSection 样式配置
 */
export interface BaseInfoSectionStyles {
  readonly container?: string
  readonly header?: string
  readonly avatar?: AvatarStyles
  readonly nameRow?: { className?: string }
  readonly name?: TextFieldStyles
  readonly title?: TextFieldStyles
  readonly infoLayout?: LayoutStyles
  readonly fieldItem?: string
  readonly fieldIcon?: {
    size?: string | number
    className?: string
  }
  readonly editButton?: string
  readonly modal?: string
}

/**
 * JobIntentionSection 样式配置
 */
export interface JobIntentionSectionStyles {
  readonly container?: string
  readonly header?: string
  readonly title?: TextFieldStyles
  readonly fieldsLayout?: LayoutStyles
  readonly fieldItem?: string
  readonly fieldLabel?: string
  readonly fieldValue?: string
  readonly editButton?: string
  readonly icon?: {
    size?: string | number
    className?: string
    color?: string
  }
}

/**
 * BlockRenderer 样式配置
 */
export interface BlockRendererStyles {
  readonly container?: string
  readonly header?: string
  readonly title?: TextFieldStyles
  readonly subtitle?: TextFieldStyles
  readonly dateRange?: TextFieldStyles
  readonly content?: string
  readonly layout?: 'default' | 'card' | 'timeline' | 'minimal' | string
  readonly spacing?: string
  readonly border?: string
  readonly shadow?: string
  readonly hover?: string
}

/**
 * 自定义渲染函数类型
 */
export interface BaseInfoRenderProps {
  readonly name: string
  readonly baseInfo: BaseInfo | null
  readonly themeColor: string
  readonly onEdit: () => void
}

export interface JobIntentionRenderProps {
  readonly jobIntention: JobIntention
  readonly themeColor: string
  readonly onEdit: () => void
  readonly onDeleteField: (field: string) => void
}

export interface BlockRenderProps {
  readonly block: ResumeBlock
  readonly themeColor: string
  readonly isEditing: boolean
  readonly onEditingChange: (isEditing: boolean) => void
}

/**
 * 插槽渲染函数类型
 */
export interface BaseInfoSlots {
  readonly avatar?: (baseInfo: BaseInfo | null, themeColor: string) => ReactElement
  readonly name?: (name: string, themeColor: string) => ReactElement
  readonly title?: (title: string | undefined) => ReactElement
  readonly fields?: (baseInfo: BaseInfo | null, themeColor: string) => ReactElement
  readonly editButton?: (onClick: () => void) => ReactElement
}

export interface JobIntentionSlots {
  readonly header?: (title: string, themeColor: string) => ReactElement
  readonly field?: (label: string, value: string, themeColor: string) => ReactElement
  readonly editButton?: (onClick: () => void) => ReactElement
}

export interface BlockSlots {
  readonly header?: (block: ResumeBlock, themeColor: string) => ReactElement
  readonly content?: (block: ResumeBlock) => ReactElement
  readonly footer?: (block: ResumeBlock) => ReactElement
}

export interface SectionHeaderStyles extends TextFieldStyles {
  readonly icon?: {
    readonly size?: string | number
    readonly className?: string
    readonly color?: string
  }
}

/**
 * 完整的样式配置包
 */
export interface TemplateStylesConfig {
  readonly name: string
  readonly description?: string
  readonly baseInfo?: BaseInfoSectionStyles
  readonly jobIntention?: JobIntentionSectionStyles
  readonly sectionHeader?: SectionHeaderStyles
  readonly blockRenderer?: BlockRendererStyles
}
