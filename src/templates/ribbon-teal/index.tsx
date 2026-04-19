import { defineTemplate } from '@/templates/_kernel/define-template'

/**
 * Ribbon-Teal Template — Image 2 reproduction.
 *
 * Single-column layout with:
 * - Avatar + name + inline "|" separated contact rows in the header.
 * - Teal gradient ribbon banners as section headers (with angled tail).
 * - Default block layout.
 */
export default defineTemplate({
  id: 'ribbon-teal',
  name: '青绿旗帜',
  description: '青绿色旗帜分节标题 · 圆形头像 · 通用单栏',
  preview: '/thumbnails/template_ribbon_teal.webp',
  tags: ['通用', '青绿', '旗帜', '单栏'],
  layout: 'single-column',
  page: {
    backgroundColor: '#ffffff',
  },
  accents: {
    primary: '#3aa89f',
  },
  header: {
    variant: 'avatar-left-inline',
    avatarShape: 'circle',
    avatarSize: { width: 96, height: 96 },
    separator: '|',
    fieldsPerRow: 5,
  },
  jobIntention: {
    placement: 'header-row',
  },
  sectionHeader: {
    variant: 'ribbon-banner',
    from: '#3aa89f',
    to: '#b8e0db',
    angleTail: true,
    height: 30,
  },
  block: {
    variant: 'default',
  },
})
