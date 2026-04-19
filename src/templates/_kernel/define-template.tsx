import type { ReactElement } from 'react'
import { TemplateRuntime } from './runtime'
import type { TemplateProps } from './runtime'
import type { KernelTemplateConfig } from './types'

/**
 * Factory that converts a declarative template config into a ready-to-use
 * React component that can be registered in `template-loader.ts`.
 *
 * @example
 * ```ts
 * export default defineTemplate({
 *   id: 'ribbon-teal',
 *   name: '青绿旗帜',
 *   description: '单栏 · 青绿色旗帜分节',
 *   layout: 'single-column',
 *   header: { variant: 'avatar-left-inline', avatarShape: 'circle' },
 *   sectionHeader: { variant: 'ribbon-banner', from: '#5eb9b5', to: '#c8e9e7' },
 *   block: { variant: 'default' },
 * })
 * ```
 */
export function defineTemplate(
  config: KernelTemplateConfig,
): (props: TemplateProps) => ReactElement {
  function KernelTemplate(props: TemplateProps): ReactElement {
    return <TemplateRuntime config={config} {...props} />
  }
  KernelTemplate.displayName = `KernelTemplate(${config.id})`
  return KernelTemplate
}

export type { KernelTemplateConfig } from './types'
export type { TemplateProps } from './runtime'
