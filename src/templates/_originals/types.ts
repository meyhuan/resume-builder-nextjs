import type { ResumeData } from '@/entities/resume/resume-data'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import { RESUME_FONT_STACKS } from '@/entities/theme/font-stacks'

export type VariantId =
  | 'xinghe'
  | 'lifeng'
  | 'qingsui'
  | 'yuanshan'
  | 'hengjian'
  | 'yiyetong'
  | 'lanfa'
  | 'lanying'
  | 'qiance'
  | 'heijiao'
  | 'shanglan'
  | 'jinhang'
  | 'jijian'
  | 'lanzix'

export interface OriginalTemplateProps {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
  readonly variant: VariantId
  readonly sidebarSectionIds?: readonly string[]
  readonly onSidebarSectionIdsChange?: (ids: readonly string[]) => void
}

export interface VariantConfig {
  readonly id: VariantId
  readonly accent: string
  readonly secondary: string
  readonly ink: string
  readonly muted: string
  readonly bleed: boolean
  readonly layout?: 'single' | 'campus' | 'dark-sidebar' | 'soft-sidebar' | 'portfolio' | 'education-timeline' | 'tech-minimal' | 'stack-projects' | 'official-brief' | 'marketing-banner' | 'planner-profile' | 'fresh-sidebar' | 'purple-corner' | 'legal-blue' | 'teacher-black' | 'bank-gold' | 'minimal-black'
  readonly density?: 'normal' | 'compact' | 'ultra'
  readonly sectionStyle?: 'line' | 'pill' | 'numbered' | 'formal' | 'minimal'
  readonly metrics?: 'growth' | 'executive' | 'campus' | 'media' | 'none'
  readonly heroTone?: 'plain' | 'soft' | 'gradient' | 'blueprint'
  readonly formal?: boolean
  readonly serif?: boolean
}

export const SANS = RESUME_FONT_STACKS.sans
export const SERIF = RESUME_FONT_STACKS.serif
