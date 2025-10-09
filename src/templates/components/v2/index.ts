/**
 * V2 Template Components - Style-Driven Architecture
 * 
 * 完全解耦的组件系统，支持无限模板扩展
 */

// 组件导出
export { default as BaseInfoSection } from './base-info-section'
export { default as JobIntentionSection } from './job-intention-section'
export { default as BlockRenderer } from './block-renderer'
export { default as SectionContainer } from './section-container'

// 类型导出
export type {
  // 样式配置类型
  BaseInfoSectionStyles,
  JobIntentionSectionStyles,
  BlockRendererStyles,
  SectionContainerStyles,
  TemplateStylesConfig,
  AvatarStyles,
  TextFieldStyles,
  LayoutStyles,
  LayoutType,
  
  // 渲染函数类型
  BaseInfoRenderProps,
  JobIntentionRenderProps,
  BlockRenderProps,
  
  // 插槽类型
  BaseInfoSlots,
  JobIntentionSlots,
  BlockSlots,
} from './types'

// Props 类型导出
export type { BaseInfoSectionProps } from './base-info-section'
export type { JobIntentionSectionProps } from './job-intention-section'
export type { BlockRendererProps } from './block-renderer'
