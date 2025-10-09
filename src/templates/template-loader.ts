/**
 * Template Loader - 动态加载模板，支持代码分割
 * 每个模板会被打包成独立的chunk，按需加载
 */
import { lazy, type ComponentType } from 'react'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'

export interface TemplateProps {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
}

export interface TemplateConfig {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly preview?: string
  readonly author?: string
  readonly tags?: string[]
  readonly component: ComponentType<TemplateProps>
}

/**
 * 模板注册表
 * 使用动态import，每个模板会被Vite自动分割成独立chunk
 */
export const TEMPLATE_REGISTRY: Record<string, TemplateConfig> = {
  simple: {
    id: 'simple',
    name: '简约',
    description: '简洁大方，适合所有场景',
    tags: ['通用', '简洁'],
    component: lazy(() => import('@/templates/simple')),
  },
  professional: {
    id: 'professional',
    name: '专业商务',
    description: '传统商务风格，适合金融、法律等正式行业',
    tags: ['商务', '正式', '传统'],
    component: lazy(() => import('@/templates/professional')),
  },
  creative: {
    id: 'creative',
    name: '创意风格',
    description: '卡片式现代设计，适合互联网、设计类岗位',
    tags: ['创意', '设计', '互联网'],
    component: lazy(() => import('@/templates/creative')),
  },
  elegant: {
    id: 'elegant',
    name: '优雅简约',
    description: '优雅简约设计，清晰层次，适合各类专业人士',
    tags: ['优雅', '简约', '通用'],
    component: lazy(() => import('@/templates/elegant')),
  },
  'clean-professional': {
    id: 'clean-professional',
    name: '清爽专业',
    description: '大头像、信息密集布局、圆形图标，适合应届生和信息丰富的简历',
    tags: ['清爽', '专业', '应届生', '信息密集'],
    component: lazy(() => import('@/templates/clean-professional')),
  },
}

/**
 * 获取所有模板列表
 */
export function getAllTemplates(): TemplateConfig[] {
  return Object.values(TEMPLATE_REGISTRY)
}

/**
 * 根据ID获取模板
 */
export function getTemplate(id: string): TemplateConfig | undefined {
  return TEMPLATE_REGISTRY[id]
}

/**
 * 根据标签搜索模板
 */
export function searchTemplatesByTag(tag: string): TemplateConfig[] {
  return getAllTemplates().filter((t) => t.tags?.includes(tag))
}
