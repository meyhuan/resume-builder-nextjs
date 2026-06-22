import type { VariantConfig, VariantId } from './types'

export const CONFIG: Record<VariantId, VariantConfig> = {
  xinghe: { id: 'xinghe', accent: '#7c3aed', secondary: '#d946ef', ink: '#25185c', muted: '#475569', bleed: false },
  lifeng: { id: 'lifeng', accent: '#7c3aed', secondary: '#111827', ink: '#111827', muted: '#64748b', bleed: false, layout: 'dark-sidebar', density: 'compact' },
  qingsui: { id: 'qingsui', accent: '#0891b2', secondary: '#7c3aed', ink: '#0f172a', muted: '#475569', bleed: false, layout: 'campus', metrics: 'campus', heroTone: 'gradient' },
  yuanshan: { id: 'yuanshan', accent: '#9a6b38', secondary: '#7c5b35', ink: '#1f2937', muted: '#4b5563', bleed: false, metrics: 'executive', serif: true },
  hengjian: { id: 'hengjian', accent: '#334155', secondary: '#64748b', ink: '#0f172a', muted: '#475569', bleed: false, sectionStyle: 'formal', formal: true },
  yiyetong: { id: 'yiyetong', accent: '#475569', secondary: '#94a3b8', ink: '#111827', muted: '#475569', bleed: false, density: 'ultra', sectionStyle: 'line' },
}
