/**
 * Template Loader - Dynamic template loading with code splitting.
 * Each template is bundled as an independent chunk, loaded on demand.
 */
import { lazy, type ComponentType } from 'react'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'

export interface TemplateProps {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
  /** Section IDs placed in the sidebar (used by two-column templates). */
  readonly sidebarSectionIds?: readonly string[]
  /** Notify parent when sidebar assignment changes (for persistence). */
  readonly onSidebarSectionIdsChange?: (ids: readonly string[]) => void
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
 * Template Registry
 * Uses dynamic imports; each template is auto-split into an independent chunk by Vite.
 */
export const TEMPLATE_REGISTRY: Record<string, TemplateConfig> = {
  simple: {
    id: 'simple',
    name: 'Simple',
    description: 'Clean and versatile, suitable for all scenarios',
    preview: '/thumbnails/template_simple.webp',
    tags: ['General', 'Clean'],
    component: lazy(() => import('@/templates/simple')),
  },
  elegant: {
    id: 'elegant',
    name: 'Elegant',
    description: 'Dark header with gold accents, formal and sophisticated',
    preview: '/thumbnails/template_elegant.webp',
    tags: ['Formal', 'Sophisticated', 'Elegant', 'Gold'],
    component: lazy(() => import('@/templates/elegant')),
  },
  warm: {
    id: 'warm',
    name: 'Two-Column',
    description: 'Two-column layout with left sidebar and right main content',
    preview: '/thumbnails/template_warm.webp',
    tags: ['General', 'Two-Column', 'Warm', 'Sidebar'],
    component: lazy(() => import('@/templates/warm')),
  },
  timeline: {
    id: 'timeline',
    name: 'Timeline',
    description: 'Left dates + right content, classic timeline style',
    preview: '/thumbnails/template_timeline.webp',
    tags: ['General', 'Timeline', 'Classic', 'Clean'],
    component: lazy(() => import('@/templates/timeline')),
  },
}

/**
 * Get all available templates.
 */
export function getAllTemplates(): TemplateConfig[] {
  return Object.values(TEMPLATE_REGISTRY)
}

/**
 * Get a template by ID.
 */
export function getTemplate(id: string): TemplateConfig | undefined {
  return TEMPLATE_REGISTRY[id]
}

/**
 * Search templates by tag.
 */
export function searchTemplatesByTag(tag: string): TemplateConfig[] {
  return getAllTemplates().filter((t) => t.tags?.includes(tag))
}
