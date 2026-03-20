/**
 * Timeline template style configuration.
 *
 * Timeline style: left dates + right content, vertical line through,
 * gray-toned clean layout, classic timeline design.
 */

import type { TemplateStylesConfig } from '@/templates/components/v2/types'

export const TIMELINE_TEMPLATE_STYLES: TemplateStylesConfig = {
  name: 'timeline',
  description: 'Timeline style - left dates + right content, vertical line through',

  baseInfo: {
    container: 'pb-5 flex items-start gap-6 relative group cursor-pointer print:cursor-default',
    header: 'flex-1 min-w-0',
    nameRow: {
      className: 'flex items-baseline gap-4',
    },
    avatar: {
      size: 'w-[100px] h-[120px]',
      shape: 'rounded',
      containerClassName: 'w-[100px] h-[120px] rounded bg-gray-100 overflow-hidden shrink-0',
      imageClassName: 'w-full h-full object-cover',
      showFallbackText: false,
    },
    name: {
      className: 'font-bold tracking-wide',
      fontSize: '2em',
      fontWeight: 'bold',
      color: '#1a1a1a',
    },
    title: {
      className: 'text-gray-500',
      fontSize: '1em',
    },
    infoLayout: {
      type: 'flex',
      columns: 3,
      gap: '4',
      className: 'flex flex-wrap gap-y-2 gap-x-8',
    },
    fieldItem:
      'flex items-center gap-2 text-gray-600 relative group/field hover:bg-gray-50 rounded pl-1 pr-5 py-0.5 transition-colors whitespace-nowrap text-[1em]',
    fieldIcon: {
      size: '1.14em',
      className: 'text-gray-400',
    },
    editButton:
      'absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-gray-400 hover:text-gray-600',
  },

  jobIntention: {
    container: 'py-0 relative group cursor-pointer print:cursor-default',
    layout: 'ribbon',
    headerClassName: 'mb-4 mt-2',
    header: 'flex items-center gap-2 pb-1 relative',
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
    fieldValue: 'text-gray-900',
    icon: {
      size: '1.5em',
    },
    editButton:
      'ml-auto opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-gray-400 hover:text-gray-600',
  },

  sectionHeader: {
    fontSize: '1.285em',
    fontWeight: 'bold',
    containerClassName: 'mb-4',
    icon: {
      size: '1.5em',
    },
  },

  blockRenderer: {
    container: 'relative',
    layout: 'timeline',
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
      className: 'hidden',
      fontSize: '0',
    },
    dateRange: {
      fontSize: '1.07em',
      fontWeight: 'bold',
      className: 'hidden',
    },
    content: 'text-[1em] text-gray-500 text-justify',
  },
}
