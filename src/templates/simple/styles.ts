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
    container: 'py-3.5 flex items-start gap-5 relative group cursor-pointer print:cursor-default',
    header: 'flex-1 min-w-0',
    nameRow: {
      className: 'flex items-baseline gap-4 mb-2',
    },
    avatar: {
      size: 'w-[88px] h-[106px]',
      shape: 'rounded',
      containerClassName: 'w-[88px] h-[106px] rounded bg-gray-100 overflow-hidden shrink-0',
      imageClassName: 'w-full h-full object-cover',
      showFallbackText: false,
    },
    name: {
      className: 'font-bold',
      fontSize: '1.86em',
      fontWeight: 'bold',
      color: '#333',
    },
    title: {
      className: 'text-gray-500',
      fontSize: '0.96em',
    },
    infoLayout: {
      type: 'flex',
      columns: 3,
      gap: '4',
      className: 'flex flex-wrap gap-y-2 gap-x-8',
    },
    fieldItem: 'flex items-center gap-1.5 text-gray-600 relative group/field hover:bg-gray-50 rounded pl-1 pr-5 py-0.5 transition-colors whitespace-nowrap text-[0.96em]',
    fieldIcon: {
      size: '1em',
      className: 'text-gray-500',
    },
    editButton: 'absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-gray-400 hover:text-gray-600',
  },
  
  jobIntention: {
    container: 'py-3 relative group cursor-pointer print:cursor-default',
    header: 'flex items-center gap-2.5 pb-0.5 relative',
    title: {
      className: 'font-bold',
      fontSize: '1.18em',
      fontWeight: 'bold',
    },
    fieldsLayout: {
      type: 'grid',
      columns: 2,
      gap: '4',
      className: 'grid grid-cols-2 gap-y-2.5 gap-x-8 text-[0.98em]',
    },
    fieldItem: 'hover:bg-gray-50 rounded px-1.5 py-0.5 pr-5 transition-colors relative',
    fieldLabel: 'text-gray-600',
    fieldValue: 'text-gray-900',
    icon: {
      size: '1.25em',
    },
    editButton: 'ml-auto opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-gray-400 hover:text-gray-600',
  },
  
  sectionHeader: {
    fontSize: '1.18em',
    fontWeight: 'bold',
    lineHeight: '1.2',
    containerClassName: 'pb-0.5',
    icon: {
      size: '1.18em',
    },
  },
  
  blockRenderer: {
    container: 'relative',
    layout: 'default',
    spacing: '',
    border: '',
    shadow: '',
    hover: '',
    header: 'flex justify-between items-start gap-3',
    title: {
      className: 'font-bold',
      fontSize: '1.03em',
      fontWeight: '700',
      color: '#333',
    },
    subtitle: {
      className: 'font-bold',
      fontSize: '0.97em',
      color: '#333',
    },
    dateRange: {
      fontSize: '0.97em',
      fontWeight: 'bold',
      className: 'text-gray-700 ml-3 shrink-0',
    },
    content: 'text-[0.98em] text-gray-600 text-justify mt-1',
  },
}
