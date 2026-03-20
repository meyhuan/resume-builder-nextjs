/**
 * V2 Template Components - Style-Driven Architecture
 * 
 * Fully decoupled component system supporting unlimited template extensions.
 */

// Component exports
export { default as BaseInfoSection } from './base-info-section'
export { default as JobIntentionSection } from './job-intention-section'
export { default as BlockRenderer } from './block-renderer'
export { default as SectionContainer } from './section-container'

// Type exports
export type {
  // Style configuration types
  BaseInfoSectionStyles,
  JobIntentionSectionStyles,
  BlockRendererStyles,
  TemplateStylesConfig,
  AvatarStyles,
  TextFieldStyles,
  LayoutStyles,
  LayoutType,
  
  // Render function types
  BaseInfoRenderProps,
  JobIntentionRenderProps,
  BlockRenderProps,
  
  // Slot types
  BaseInfoSlots,
  JobIntentionSlots,
  BlockSlots,
} from './types'

// Props type exports
export type { BaseInfoSectionProps } from './base-info-section'
export type { JobIntentionSectionProps } from './job-intention-section'
export type { BlockRendererProps } from './block-renderer'
