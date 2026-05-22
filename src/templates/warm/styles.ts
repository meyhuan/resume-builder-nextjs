/**
 * Warm 模板样式配置
 *
 * 淡黄色双列布局，左侧边栏 + 右侧主内容
 * 修改此文件可以改变模板外观，无需修改共用组件
 */

import type { TemplateStylesConfig } from '@/templates/components/v2/types'

/** Default golden yellow accent when primaryColor is the dark default. */
export const ACCENT_YELLOW = '#ffd738'
/** Dark default primaryColor that triggers the yellow fallback. */
export const DEFAULT_DARK = '#111827'

/** Resolve accent color: use amber fallback when primaryColor is the dark default. */
export function resolveAccent(primaryColor: string): string {
  return primaryColor === DEFAULT_DARK ? ACCENT_YELLOW : primaryColor
}

/** Convert hex color to rgba string with given alpha. */
export function hexToRgba(hex: string, alpha: number): string {
  const normalized = normalizeHex(hex)
  const r = parseInt(normalized.slice(1, 3), 16)
  const g = parseInt(normalized.slice(3, 5), 16)
  const b = parseInt(normalized.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Darken a hex color by a factor (0-1, where 0 = black, 1 = original). */
export function darkenHex(hex: string, factor: number): string {
  const normalized = normalizeHex(hex)
  const r = Math.round(parseInt(normalized.slice(1, 3), 16) * factor)
  const g = Math.round(parseInt(normalized.slice(3, 5), 16) * factor)
  const b = Math.round(parseInt(normalized.slice(5, 7), 16) * factor)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function normalizeHex(color: string): string {
  const trimmed = color.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, r, g, b] = trimmed
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return ACCENT_YELLOW
}

export const WARM_TEMPLATE_STYLES: TemplateStylesConfig = {
  name: 'warm',
  description: '淡黄通用简历模板 - 双列布局，左侧边栏',

  baseInfo: {
    container: 'flex flex-col items-center gap-3 relative group cursor-pointer print:cursor-default',
    header: 'w-full',
    nameRow: {
      className: 'flex flex-col items-start gap-1',
    },
    avatar: {
      size: 'w-[130px] h-[150px]',
      shape: 'rounded-b-[65px]',
      containerClassName: 'w-[130px] h-[150px] rounded-b-[65px] bg-white overflow-hidden',
      imageClassName: 'w-full h-full object-cover',
      showFallbackText: false,
    },
    name: {
      className: 'font-bold tracking-wide',
      fontSize: '1.875em',
      fontWeight: 'bold',
      color: '#333',
    },
    title: {
      className: 'text-gray-500',
      fontSize: '0.9em',
    },
    infoLayout: {
      type: 'vertical',
      className: 'flex flex-col gap-5 w-full',
    },
    fieldItem: 'flex items-center gap-3 text-gray-600 relative group/field text-[0.875em]',
    fieldIcon: {
      size: '0.75em',
      className: 'text-white',
    },
    editButton: 'absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-gray-400 hover:text-gray-600',
  },

  jobIntention: {
    container: 'py-2 relative group cursor-pointer print:cursor-default',
    header: 'flex items-center gap-2 pb-1 relative',
    title: {
      className: 'font-bold',
      fontSize: '1.15em',
      fontWeight: 'bold',
    },
    fieldsLayout: {
      type: 'vertical',
      className: 'flex flex-col gap-2 text-[0.8125em]',
    },
    fieldItem: 'mb-2',
    fieldLabel: 'text-gray-500',
    fieldValue: 'text-gray-800',
    icon: {
      size: '1.3em',
    },
    editButton: 'ml-auto opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-gray-400 hover:text-gray-600',
  },

  sectionHeader: {
    fontSize: '1.125em',
    fontWeight: 'bold',
    containerClassName: 'w-full',
    icon: {
      size: '0',
      className: 'hidden',
    },
  },

  blockRenderer: {
    container: 'relative',
    layout: 'default',
    spacing: '',
    border: '',
    shadow: '',
    hover: '',
    header: 'flex justify-between items-start',
    title: {
      className: 'font-bold',
      fontSize: '1.07em',
      fontWeight: 'bold',
      color: '#333',
    },
    subtitle: {
      className: 'font-bold',
      fontSize: '1em',
      color: '#333',
    },
    dateRange: {
      fontSize: '1.07em',
      fontWeight: 'bold',
      className: 'text-gray-800 shrink-0',
    },
    content: 'text-[1em] text-gray-500 text-justify leading-relaxed',
  },
}
