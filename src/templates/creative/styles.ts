/**
 * Creative 模板样式配置
 * 
 * 对应 "左侧头像+时间轴式" 的布局风格
 */

import type { TemplateStylesConfig } from '@/templates/components/v2/types'

export const CREATIVE_TEMPLATE_STYLES: TemplateStylesConfig = {
  name: 'creative',
  description: '清新简约 - 强调时间线，左图右文',
  
  baseInfo: {
    container: 'mb-8 flex items-center gap-8',
    header: 'flex-1 min-w-0',
    avatar: {
      size: 'w-32 h-32', // 128px
      shape: 'square', // 图片看起来是圆角矩形或正方形
      containerClassName: 'w-32 h-32 rounded-lg bg-gray-200 overflow-hidden shrink-0 shadow-sm border-2 border-white',
      imageClassName: 'w-full h-full object-cover',
      showFallbackText: true,
    },
    name: {
      className: 'font-bold mb-4 tracking-wide text-gray-900',
      fontSize: '2.25em', // 36px
      fontWeight: '800',
    },
    title: {
      className: 'text-gray-600 mb-4 font-medium',
      fontSize: '1em',
    },
    infoLayout: {
      type: 'flex',
      gap: '4',
      className: 'flex flex-wrap gap-x-8 gap-y-2',
    },
    fieldItem: 'flex items-center gap-2 text-gray-600 text-sm hover:text-gray-900 transition-colors',
    fieldIcon: {
      size: 16,
      className: 'text-gray-400',
    },
  },
  
  jobIntention: {
    container: 'mb-8 p-1 border border-transparent rounded-lg relative group cursor-pointer',
    header: 'flex items-center gap-2 mb-4 px-2 py-1 rounded border border-transparent',
    title: {
      className: 'text-lg font-bold text-gray-900',
      fontSize: '1.125em',
      fontWeight: '700',
    },
    fieldsLayout: {
      type: 'flex',
      gap: '4',
      className: 'flex flex-wrap gap-x-8 gap-y-2 text-sm text-gray-600',
    },
    fieldItem: 'flex items-center gap-2',
    icon: {
      size: 18,
    },
  },

  sectionHeader: {
    fontSize: '1.125em',
    fontWeight: 'bold',
    containerClassName: 'mb-4',
    icon: {
      size: 18,
    },
  },
  
  blockRenderer: {
    container: 'relative',
    layout: 'custom', // 使用自定义 Header
    spacing: 'mb-6',
    header: 'mb-2',
    title: {
      className: 'text-base font-bold text-gray-900 text-right', // 标题在右侧
      fontSize: '1em',
      fontWeight: '700',
    },
    subtitle: {
      className: 'text-sm text-gray-700 font-medium',
      fontSize: '0.9em',
    },
    dateRange: {
      className: 'text-sm font-bold text-gray-900',
    },
    content: 'mt-2 text-sm text-gray-600 leading-relaxed text-justify',
  },
}
