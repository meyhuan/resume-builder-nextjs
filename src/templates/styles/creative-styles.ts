/**
 * Creative 模板样式配置
 * 
 * 创意风格 - 卡片设计、圆角阴影、活泼配色
 */

import type { TemplateStylesConfig } from '@/templates/components/v2/types'

export const CREATIVE_TEMPLATE_STYLES: TemplateStylesConfig = {
  name: 'creative',
  description: '创意风格 - 不对称布局、卡片设计、圆角阴影、活泼配色',
  
  baseInfo: {
    container: 'relative group cursor-pointer',
    header: 'bg-white rounded-2xl shadow-lg p-6 relative overflow-hidden',
    avatar: {
      size: 'w-24 h-24',
      shape: 'circle',
      containerClassName: 'w-24 h-24 rounded-2xl overflow-hidden shadow-lg',
      imageClassName: 'w-full h-full object-cover',
      fallbackClassName: 'w-full h-full flex items-center justify-center text-white text-3xl font-bold',
      showFallbackText: true,
    },
    name: {
      className: 'text-3xl font-bold mb-2',
      fontSize: '3xl',
      fontWeight: 'bold',
    },
    title: {
      className: 'text-base text-gray-600 mb-3 font-medium',
      fontSize: '1em',
    },
    infoLayout: {
      type: 'horizontal',
      gap: '5',
      className: 'flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600',
    },
    fieldItem: 'flex items-center gap-1.5',
    fieldIcon: {
      size: 16,
      className: '',
    },
    editButton: 'absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-gray-400 hover:text-gray-600 z-10',
  },
  
  jobIntention: {
    container: 'mb-6 relative group cursor-pointer print:cursor-default',
    header: 'bg-white rounded-2xl shadow-lg p-5 relative overflow-hidden',
    title: {
      className: 'text-base font-bold',
      fontSize: '1em',
      fontWeight: 'bold',
    },
    fieldsLayout: {
      type: 'horizontal',
      gap: '3',
      className: 'flex flex-wrap gap-3 ml-4',
    },
    fieldItem: 'px-3 py-1.5 rounded-full transition-all relative',
    fieldLabel: 'text-xs text-gray-500',
    fieldValue: 'text-sm font-medium',
    icon: {
      size: 20,
      className: '',
    },
    editButton: 'ml-auto opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-gray-400 hover:text-gray-600',
  },
  
  blockRenderer: {
    container: 'bg-white rounded-2xl shadow-md p-5 hover:shadow-lg transition-shadow border-l-4',
    layout: 'card',
    spacing: 'mb-4',
    border: 'border-l-4',
    shadow: 'shadow-md',
    hover: 'hover:shadow-lg',
    header: 'flex justify-between items-start mb-2',
    title: {
      className: 'text-base font-bold flex items-center gap-2',
      fontSize: '1em',
      fontWeight: 'bold',
    },
    subtitle: {
      className: 'text-sm text-gray-600 mt-1 ml-4',
      fontSize: '0.875em',
    },
    dateRange: 'text-xs px-3 py-1 rounded-full ml-4 shrink-0',
    content: 'mt-3 ml-4 bg-gray-50 rounded-lg p-3',
  },
}
