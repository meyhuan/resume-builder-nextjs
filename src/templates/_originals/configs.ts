import type { VariantConfig, VariantId } from './types'

export const CONFIG: Record<VariantId, VariantConfig> = {
  xinghe: { id: 'xinghe', accent: '#7c3aed', secondary: '#d946ef', ink: '#25185c', muted: '#475569', bleed: false },
  lifeng: { id: 'lifeng', accent: '#7c3aed', secondary: '#111827', ink: '#111827', muted: '#64748b', bleed: false, layout: 'dark-sidebar', density: 'compact' },
  qingsui: { id: 'qingsui', accent: '#0891b2', secondary: '#7c3aed', ink: '#0f172a', muted: '#475569', bleed: false, layout: 'campus', metrics: 'campus', heroTone: 'gradient' },
  yuanshan: { id: 'yuanshan', accent: '#9a6b38', secondary: '#7c5b35', ink: '#1f2937', muted: '#4b5563', bleed: false, metrics: 'executive', serif: true },
  hengjian: { id: 'hengjian', accent: '#334155', secondary: '#64748b', ink: '#0f172a', muted: '#475569', bleed: false, sectionStyle: 'formal', formal: true },
  yiyetong: { id: 'yiyetong', accent: '#475569', secondary: '#94a3b8', ink: '#111827', muted: '#475569', bleed: false, density: 'ultra', sectionStyle: 'line' },
  lanfa: { id: 'lanfa', accent: '#0b2a57', secondary: '#b8ccee', ink: '#05214b', muted: '#536b83', bleed: false, layout: 'legal-blue', density: 'compact', sectionStyle: 'formal', heroTone: 'blueprint', formal: true },
  lanying: { id: 'lanying', accent: '#3f6da3', secondary: '#16273a', ink: '#172033', muted: '#4b5563', bleed: false, layout: 'marketing-banner', density: 'compact', sectionStyle: 'pill', heroTone: 'plain' },
  qiance: { id: 'qiance', accent: '#6ea6cf', secondary: '#dfeef5', ink: '#1f2937', muted: '#64748b', bleed: false, layout: 'planner-profile', sectionStyle: 'line', heroTone: 'soft' },
  heijiao: { id: 'heijiao', accent: '#111111', secondary: '#3f3f46', ink: '#111111', muted: '#52525b', bleed: false, layout: 'teacher-black', density: 'compact', sectionStyle: 'minimal', formal: true },
  shanglan: { id: 'shanglan', accent: '#4d93ff', secondary: '#3922bb', ink: '#111827', muted: '#475569', bleed: false, layout: 'fresh-sidebar', density: 'compact', sectionStyle: 'line', heroTone: 'gradient' },
  jinhang: { id: 'jinhang', accent: '#c89143', secondary: '#a55f20', ink: '#2f2418', muted: '#6b5f52', bleed: false, layout: 'bank-gold', density: 'compact', sectionStyle: 'formal', formal: true },
  jijian: { id: 'jijian', accent: '#111111', secondary: '#111111', ink: '#111111', muted: '#3f3f46', bleed: false, layout: 'minimal-black', density: 'normal', sectionStyle: 'minimal' },
  lanzix: { id: 'lanzix', accent: '#5d5aa0', secondary: '#4a4a86', ink: '#1f2433', muted: '#626478', bleed: false, layout: 'purple-corner', density: 'compact', sectionStyle: 'line', heroTone: 'blueprint' },
}
