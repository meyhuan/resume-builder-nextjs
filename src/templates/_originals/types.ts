import type { ResumeData } from '@/entities/resume/resume-data'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'

export type VariantId =
  | 'xinghe'
  | 'lifeng'
  | 'qingsui'
  | 'yuanshan'
  | 'hengjian'
  | 'yiyetong'

export interface OriginalTemplateProps {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
  readonly variant: VariantId
}

export interface VariantConfig {
  readonly id: VariantId
  readonly accent: string
  readonly secondary: string
  readonly ink: string
  readonly muted: string
  readonly bleed: boolean
  readonly layout?: 'single' | 'campus' | 'dark-sidebar' | 'soft-sidebar' | 'portfolio' | 'education-timeline' | 'tech-minimal' | 'stack-projects' | 'official-brief'
  readonly density?: 'normal' | 'compact' | 'ultra'
  readonly sectionStyle?: 'line' | 'pill' | 'numbered' | 'formal' | 'minimal'
  readonly metrics?: 'growth' | 'executive' | 'campus' | 'media' | 'none'
  readonly heroTone?: 'plain' | 'soft' | 'gradient' | 'blueprint'
  readonly formal?: boolean
  readonly serif?: boolean
}

export const SANS = '"Inter", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif'
export const SERIF = 'Georgia, "Noto Serif SC", "Noto Sans SC", "Microsoft YaHei", serif'
