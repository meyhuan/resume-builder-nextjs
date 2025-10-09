/**
 * Clean Professional 模板样式配置
 * 
 * 清爽专业风格 - 大头像、横向信息、圆形图标、卡片布局
 * 参考图片：简洁清爽，信息密集，蓝色主题
 */

import type { TemplateStylesConfig } from '@/templates/components/v2/types'

export const CLEAN_PROFESSIONAL_STYLES: TemplateStylesConfig = {
  name: 'clean-professional',
  description: '清爽专业风格 - 大头像、横向信息密集布局、圆形图标',
  
  baseInfo: {
    // 整体布局：左侧大头像 + 右侧信息
    container: 'mb-8 flex items-start gap-6 relative group cursor-pointer print:cursor-default bg-white p-6 rounded-lg',
    header: 'flex-1 min-w-0',
    
    // 大头像配置
    avatar: {
      size: 'w-28 h-36',
      shape: 'rounded',
      containerClassName: 'w-28 h-36 rounded-lg overflow-hidden shrink-0 shadow-md border border-gray-200',
      imageClassName: 'w-full h-full object-cover',
      showFallbackText: false,
    },
    
    // 姓名样式：大而醒目
    name: {
      className: 'text-3xl font-bold mb-4 text-gray-900',
      fontSize: '2rem',
      fontWeight: 'bold',
    },
    
    // 职位标题
    title: {
      className: 'text-lg text-gray-700 mb-3 font-medium',
      fontSize: '1.125rem',
    },
    
    // 信息布局：横向密集排列
    infoLayout: {
      type: 'grid',
      columns: 3,
      gap: '2',
      className: 'grid grid-cols-3 gap-x-4 gap-y-2',
    },
    
    // 字段样式：紧凑简洁
    fieldItem: 'flex items-center gap-1.5 text-sm text-gray-700',
    
    // 图标样式
    fieldIcon: {
      size: 14,
      className: 'text-blue-600 shrink-0',
    },
    
    // 编辑按钮
    editButton: 'absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-gray-400 hover:text-blue-600',
  },
  
  jobIntention: {
    // 不显示求职意向区块（图片中没有）
    container: 'hidden',
  },
  
  blockRenderer: {
    // 卡片式布局，浅灰背景，添加 hover 效果
    container: 'bg-gray-50 rounded-lg p-5 relative transition-all duration-150 hover:bg-gray-100 hover:shadow-sm',
    layout: 'card',
    spacing: 'mb-4',
    border: '',
    shadow: '',
    hover: 'hover:bg-gray-100',
    
    // 头部信息：时间在右侧
    header: 'flex justify-between items-start mb-3',
    
    // 标题样式
    title: {
      className: 'text-base font-semibold text-gray-900',
      fontSize: '1rem',
      fontWeight: '600',
    },
    
    // 副标题样式
    subtitle: {
      className: 'text-sm text-gray-600 mt-1',
      fontSize: '0.875rem',
    },
    
    // 日期范围：右对齐，蓝色
    dateRange: 'text-sm text-blue-600 font-medium shrink-0',
    
    // 内容区域
    content: 'mt-3 text-sm text-gray-700 leading-relaxed',
  },
}

/**
 * 自定义配置：区块标题带圆形图标
 * 这个配置用于 Section 标题的特殊样式
 */
export const CLEAN_PROFESSIONAL_SECTION_STYLES = {
  // Section 标题样式
  sectionHeader: {
    container: 'flex items-center gap-3 mb-4 relative',
    icon: {
      size: 'w-10 h-10',
      className: 'w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0',
      iconSize: 20,
    },
    title: {
      className: 'text-lg font-bold text-gray-900',
      fontSize: '1.125rem',
    },
    underline: 'absolute bottom-0 left-0 right-0 h-px bg-gray-200',
  },
}
