/**
 * Elegant 模板样式配置
 *
 * 深色头部 + 金色点缀风格，适合正式场合
 * 修改此文件可以改变模板外观，无需修改共用组件
 */

import type { TemplateStylesConfig } from '@/templates/components/v2/types'

/** Dark navy header background. */
export const HEADER_BG = '#2F3B4E'
/** Gold accent color used for borders, underlines, and stripe. */
export const ACCENT_GOLD = '#B8976A'

export const ELEGANT_TEMPLATE_STYLES: TemplateStylesConfig = {
  name: 'elegant',
  description: '深色头部 + 金色点缀，庄重大方',

  baseInfo: {
    container: 'flex items-start gap-6 relative group cursor-pointer print:cursor-default',
    header: 'flex-1 min-w-0',
    nameRow: {
      className: 'flex items-baseline gap-4',
    },
    avatar: {
      size: 'w-[110px] h-[130px]',
      shape: 'rounded',
      containerClassName: 'w-[110px] h-[130px] rounded bg-gray-200 overflow-hidden shrink-0',
      imageClassName: 'w-full h-full object-cover',
      showFallbackText: false,
    },
    name: {
      className: 'font-bold',
      fontSize: '2.1em',
      fontWeight: 'bold',
      color: '#ffffff',
    },
    title: {
      className: 'tracking-[0.25em] uppercase',
      fontSize: '0.85em',
      color: 'rgba(255,255,255,0.55)',
    },
    infoLayout: {
      type: 'flex',
      columns: 3,
      gap: '4',
      className: 'flex flex-wrap gap-y-2 gap-x-8 mt-3',
    },
    fieldItem: 'flex items-center gap-2 relative group/field hover:bg-white/10 rounded pl-1 pr-5 py-0.5 transition-colors whitespace-nowrap text-[0.92em]',
    fieldIcon: {
      size: '1.1em',
      className: 'text-white/60',
    },
    editButton: 'absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-white/50 hover:text-white z-10',
  },

  jobIntention: {
    container: 'py-3 relative group cursor-pointer print:cursor-default',
    header: 'flex items-center gap-2.5 pb-1 relative',
    title: {
      className: 'font-bold',
      fontSize: '1.285em',
      fontWeight: 'bold',
    },
    fieldsLayout: {
      type: 'grid',
      columns: 2,
      gap: '4',
      className: 'grid grid-cols-2 gap-y-2.5 gap-x-10 text-[1em]',
    },
    fieldItem: 'hover:bg-gray-50 rounded px-2 py-1 pr-6 transition-colors relative',
    fieldLabel: 'text-gray-500',
    fieldValue: 'text-gray-800',
    icon: {
      size: '1.5em',
    },
    editButton: 'ml-auto opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-gray-400 hover:text-gray-600',
  },

  sectionHeader: {
    fontSize: '1.285em',
    fontWeight: 'bold',
    containerClassName: 'pb-1',
    icon: {
      size: '1.5em',
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
      fontWeight: '700',
      color: '#333',
    },
    subtitle: {
      className: 'font-bold',
      fontSize: '1em',
      color: '#555',
    },
    dateRange: {
      fontSize: '1.07em',
      fontWeight: 'bold',
      className: 'text-gray-700 ml-4 shrink-0',
    },
    content: 'text-[1em] text-gray-500 text-justify',
  },
}
