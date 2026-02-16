/**
 * Professional 模板样式配置
 * 
 * 专业商务风格 - 传统商务风格、清晰层次、正式感
 */

import type { TemplateStylesConfig } from '@/templates/components/v2/types'

export const PROFESSIONAL_TEMPLATE_STYLES: TemplateStylesConfig = {
  name: 'professional',
  description: '专业商务风格 - 传统商务风格、清晰层次、正式感',
  
  baseInfo: {
    container: 'relative group cursor-pointer',
    header: 'text-center pb-4 border-b-2',
    avatar: {
      showFallbackText: false,
    },
    name: {
      className: 'text-3xl font-bold mb-2',
      fontSize: '3xl',
      fontWeight: 'bold',
    },
    title: {
      className: 'text-base text-gray-600 mb-3',
      fontSize: '1em',
    },
    infoLayout: {
      type: 'horizontal',
      gap: '6',
      className: 'flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-gray-700',
    },
    fieldItem: 'flex items-center gap-1.5',
    fieldIcon: {
      size: 14,
      className: '',
    },
    editButton: 'absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-gray-400 hover:text-gray-600 z-10',
  },
  
  jobIntention: {
    container: 'mb-5 relative group cursor-pointer print:cursor-default',
    header: 'flex items-center justify-center gap-2 mb-3 pb-3 border-b-2 relative',
    title: {
      className: 'text-base font-bold',
      fontSize: '1em',
      fontWeight: 'bold',
    },
    fieldsLayout: {
      type: 'horizontal',
      gap: '6',
      className: 'flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-700',
    },
    fieldItem: 'hover:bg-gray-50 rounded px-2 py-1 transition-colors relative',
    fieldLabel: 'text-gray-500',
    fieldValue: 'text-gray-900',
    icon: {
      size: 18,
    },
    editButton: 'absolute right-0 opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-gray-400 hover:text-gray-600',
  },

  sectionHeader: {
    fontSize: '1.125em',
    fontWeight: 'bold',
    containerClassName: 'mb-3',
    icon: {
      size: 18,
    },
  },
  
  blockRenderer: {
    container: 'relative pl-4 border-l-2 border-gray-200',
    layout: 'timeline',
    spacing: 'mb-0',
    border: 'border-l-2 border-gray-200',
    shadow: '',
    hover: '',
    header: 'flex justify-between items-start mb-1',
    title: {
      className: 'text-base font-semibold',
      fontSize: '1em',
      fontWeight: '600',
    },
    subtitle: {
      className: 'text-sm text-gray-600 mt-0.5',
      fontSize: '0.875em',
    },
    dateRange: {
      className: 'text-xs text-gray-500 text-right ml-4 shrink-0',
    },
    content: 'mt-2',
  },
}
