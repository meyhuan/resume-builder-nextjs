/**
 * Block Renderer 类型定义
 */

export type TemplateVariant = 'simple' | 'creative' | 'professional' | 'elegant'

export interface BaseRendererProps {
  readonly themeColor: string
  readonly variant: TemplateVariant
}
