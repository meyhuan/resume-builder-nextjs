/**
 * V2 Template Component Types - Style-Driven Architecture
 * 
 * Fully decoupled style configuration system supporting unlimited template extensions.
 * Adding new templates requires no changes to shared component code.
 */

import type { ReactElement } from 'react'
import type { BaseInfo } from '@/entities/user/base-info'
import type { ResumeBlock } from '@/entities/blocks/resume-block'

/**
 * Avatar style configuration.
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
 * Text field style configuration.
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
 * Layout configuration.
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
 * BaseInfoSection style configuration.
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
 * BlockRenderer style configuration.
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
 * Custom render function types.
 */
export interface BaseInfoRenderProps {
  readonly name: string
  readonly baseInfo: BaseInfo | null
  readonly themeColor: string
  readonly onEdit: () => void
}

export interface BlockRenderProps {
  readonly block: ResumeBlock
  readonly themeColor: string
  readonly isEditing: boolean
  readonly onEditingChange: (isEditing: boolean) => void
}

/**
 * Slot render function types.
 */
export interface BaseInfoSlots {
  readonly avatar?: (baseInfo: BaseInfo | null, themeColor: string) => ReactElement
  readonly name?: (name: string, themeColor: string) => ReactElement
  readonly title?: (title: string | undefined) => ReactElement
  readonly fields?: (baseInfo: BaseInfo | null, themeColor: string) => ReactElement
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
 * Complete style configuration bundle.
 */
export interface TemplateStylesConfig {
  readonly name: string
  readonly description?: string
  readonly baseInfo?: BaseInfoSectionStyles
  readonly sectionHeader?: SectionHeaderStyles
  readonly blockRenderer?: BlockRendererStyles
}
