/**
 * Simple 模板样式配置
 * 
 * 这个文件定义了 Simple 模板的所有样式
 * 修改此文件可以改变模板外观，无需修改共用组件
 */

import type { TemplateStylesConfig } from '@/templates/components/v2/types'

export const SIMPLE_TEMPLATE_STYLES: TemplateStylesConfig = {
  name: 'simple',
  description: '简约风格 - 传统布局，清晰层次',
  
  baseInfo: {
    container: 'mb-5 flex items-start gap-4 relative group cursor-pointer print:cursor-default',
    header: 'flex-1 min-w-0',
    avatar: {
      size: 'w-12 h-16',
      shape: 'rounded',
      containerClassName: 'w-12 h-16 rounded bg-cyan-500 overflow-hidden shrink-0',
      imageClassName: 'w-full h-full object-cover',
      showFallbackText: false,
    },
    name: {
      className: 'font-bold mb-0.5',
      fontSize: '1.5em',
      fontWeight: 'bold',
    },
    title: {
      className: 'text-gray-600',
      fontSize: '0.85em',
    },
    infoLayout: {
      type: 'grid',
      columns: 2,
      gap: '4',
      className: 'grid grid-cols-2 gap-y-1 gap-x-6',
    },
    fieldItem: 'flex items-center gap-1.5 text-gray-700 relative group/field hover:bg-gray-50 rounded px-1 py-0.5 transition-colors',
    fieldIcon: {
      size: 16,
      className: 'text-gray-500',
    },
    editButton: 'absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-gray-400 hover:text-gray-600',
  },
  
  jobIntention: {
    container: 'mb-5 relative group cursor-pointer print:cursor-default',
    header: 'flex items-center gap-2 mb-3 relative',
    title: {
      className: 'text-base font-bold',
      fontSize: '1em',
      fontWeight: 'bold',
    },
    fieldsLayout: {
      type: 'grid',
      columns: 2,
      gap: '4',
      className: 'grid grid-cols-2 gap-y-2 gap-x-6 text-sm',
    },
    fieldItem: 'hover:bg-gray-50 rounded px-2 py-1 transition-colors relative',
    fieldLabel: 'text-gray-600',
    fieldValue: 'text-gray-900',
    icon: {
      size: 20,
      className: 'text-primary',
    },
    editButton: 'ml-auto opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-gray-400 hover:text-gray-600',
  },
  
  blockRenderer: {
    container: 'relative',
    layout: 'default',
    spacing: 'mb-4',
    border: '',
    shadow: '',
    hover: 'hover:shadow-sm',
    header: 'flex justify-between items-start mb-2',
    title: {
      className: 'text-base font-semibold',
      fontSize: '1em',
      fontWeight: '600',
    },
    subtitle: {
      className: 'text-sm text-gray-600 mt-0.5',
      fontSize: '0.875em',
    },
    dateRange: 'text-xs text-gray-500 ml-4 shrink-0',
    content: 'mt-2',
  },
}
