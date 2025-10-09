/**
 * Block Renderers - 可复用的简历块渲染器
 * 
 * 每个 renderer 支持多种视觉风格（simple, creative, professional, elegant）
 */

export { default as BlockRenderer } from './block-renderer'
export { default as ExperienceRenderer } from './experience-renderer'
export { default as ProjectRenderer } from './project-renderer'
export { default as EducationRenderer } from './education-renderer'
export { default as CampusRenderer } from './campus-renderer'
export { default as TextRenderer } from './text-renderer'

export type { TemplateVariant, BaseRendererProps } from './types'
export type { BlockRendererProps } from './block-renderer'
export type { ExperienceRendererProps } from './experience-renderer'
export type { ProjectRendererProps } from './project-renderer'
export type { EducationRendererProps } from './education-renderer'
export type { CampusRendererProps } from './campus-renderer'
export type { TextRendererProps } from './text-renderer'
