/**
 * V2 Template Components - Style-Driven Architecture
 * 
 * Fully decoupled component system supporting unlimited template extensions.
 */

// Component exports
export { default as BaseInfoSection } from './base-info-section'
export { default as BlockRenderer } from './block-renderer'
export { default as SectionContainer } from './section-container'

// Type exports
export type {
  // Style configuration types
  BaseInfoSectionStyles,
  BlockRendererStyles,
  TemplateStylesConfig,
  AvatarStyles,
  TextFieldStyles,
  LayoutStyles,
  LayoutType,
  
  // Render function types
  BaseInfoRenderProps,
  BlockRenderProps,
  
  // Slot types
  BaseInfoSlots,
  BlockSlots,
} from './types'

// Props type exports
export type { BaseInfoSectionProps } from './base-info-section'
export type { BlockRendererProps } from './block-renderer'
