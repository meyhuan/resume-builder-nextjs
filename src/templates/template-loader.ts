/**
 * Template Loader - 动态加载模板，支持代码分割
 * 每个模板会被打包成独立的chunk，按需加载
 */
import { lazy, type ComponentType } from 'react'
import { TEMPLATE_METADATA, type TemplateMetadata } from '@/lib/templates/template-metadata'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import type { ResumeFontFamilyId } from '@/entities/theme/font-stacks'

export interface TemplateProps {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
  /** Section IDs placed in the sidebar (used by two-column templates). */
  readonly sidebarSectionIds?: readonly string[]
  /** Notify parent when sidebar assignment changes (for persistence). */
  readonly onSidebarSectionIdsChange?: (ids: readonly string[]) => void
}

export interface TemplateConfig extends TemplateMetadata {
  readonly author?: string
  readonly component: ComponentType<TemplateProps>
  /**
   * Export layout contract shared by PC preview, mobile preview and server-side print.
   * - standard: native @page margins provide repeated top/bottom whitespace.
   * - bleed: the template owns the full A4 canvas and should export with zero @page margin.
   */
  readonly exportLayout?: 'standard' | 'bleed'
  /**
   * Flagship templates own a deliberate brand palette that should not be
   * overridden by the user's chosen primaryColor. When true, the theme panel
   * will disable the primary-color section for this template and explain why.
   */
  readonly locksPrimaryColor?: boolean
  /**
   * Flagship templates can declare their signature primary color. When a user
   * opens this template for the first time (no saved theme yet), the app will
   * seed `theme.primaryColor` with this value instead of the global default.
   */
  readonly recommendedPrimaryColor?: string
  /** Template-level default font style. Defaults to `sans`. */
  readonly recommendedFontFamilyId?: ResumeFontFamilyId
}


/**
 * 模板注册表
 * 使用动态import，每个模板会被Vite自动分割成独立chunk
 */
export const TEMPLATE_REGISTRY: Record<string, TemplateConfig> = {
  // ——— Legacy templates (pre-kernel, kept as the utility baseline) —————
  simple: {
    ...TEMPLATE_METADATA.simple,
    component: lazy(() => import('@/templates/simple')),
  },
  elegant: {
    ...TEMPLATE_METADATA.elegant,
    component: lazy(() => import('@/templates/elegant')),
  },
  warm: {
    ...TEMPLATE_METADATA.warm,
    component: lazy(() => import('@/templates/warm')),
    exportLayout: 'bleed',
  },
  timeline: {
    ...TEMPLATE_METADATA.timeline,
    component: lazy(() => import('@/templates/timeline')),
  },
  lanxin: {
    ...TEMPLATE_METADATA.lanxin,
    component: lazy(() => import('@/templates/lanxin')),
    recommendedPrimaryColor: '#3a8ec7',
  },
  tablegrid: {
    ...TEMPLATE_METADATA.tablegrid,
    component: lazy(() => import('@/templates/tablegrid')),
    recommendedPrimaryColor: '#3d4b58',
  },
  xinghe: {
    ...TEMPLATE_METADATA.xinghe,
    component: lazy(() => import('@/templates/xinghe')),
    recommendedPrimaryColor: '#7c3aed',
  },
  lifeng: {
    ...TEMPLATE_METADATA.lifeng,
    component: lazy(() => import('@/templates/lifeng')),
    recommendedPrimaryColor: '#7c3aed',
  },
  qingsui: {
    ...TEMPLATE_METADATA.qingsui,
    component: lazy(() => import('@/templates/qingsui')),
    recommendedPrimaryColor: '#0891b2',
  },
  yuanshan: {
    ...TEMPLATE_METADATA.yuanshan,
    component: lazy(() => import('@/templates/yuanshan')),
    recommendedPrimaryColor: '#9a6b38',
    recommendedFontFamilyId: 'serif',
  },
  hengjian: {
    ...TEMPLATE_METADATA.hengjian,
    component: lazy(() => import('@/templates/hengjian')),
    recommendedPrimaryColor: '#334155',
  },
  yiyetong: {
    ...TEMPLATE_METADATA.yiyetong,
    component: lazy(() => import('@/templates/yiyetong')),
    recommendedPrimaryColor: '#475569',
  },
  lanzhe: {
    ...TEMPLATE_METADATA.lanzhe,
    component: lazy(() => import('@/templates/lanzhe')),
    recommendedPrimaryColor: '#4f719f',
  },
  dense: {
    ...TEMPLATE_METADATA.dense,
    component: lazy(() => import('@/templates/dense')),
    recommendedPrimaryColor: '#4fb8ba',
  },
  lanjiao: {
    ...TEMPLATE_METADATA.lanjiao,
    component: lazy(() => import('@/templates/lanjiao')),
    recommendedPrimaryColor: '#0752cf',
  },
  lanmu: {
    ...TEMPLATE_METADATA.lanmu,
    component: lazy(() => import('@/templates/lanmu')),
    recommendedPrimaryColor: '#2f86ed',
  },
  ziji: {
    ...TEMPLATE_METADATA.ziji,
    component: lazy(() => import('@/templates/ziji')),
    recommendedPrimaryColor: '#7c3aed',
  },
  lanfa: {
    ...TEMPLATE_METADATA.lanfa,
    component: lazy(() => import('@/templates/lanfa')),
    recommendedPrimaryColor: '#0b2a57',
  },
  lanying: {
    ...TEMPLATE_METADATA.lanying,
    component: lazy(() => import('@/templates/lanying')),
    recommendedPrimaryColor: '#3f6da3',
  },
  qiance: {
    ...TEMPLATE_METADATA.qiance,
    component: lazy(() => import('@/templates/qiance')),
    recommendedPrimaryColor: '#6ea6cf',
  },
  heijiao: {
    ...TEMPLATE_METADATA.heijiao,
    component: lazy(() => import('@/templates/heijiao')),
    recommendedPrimaryColor: '#111111',
  },
  shanglan: {
    ...TEMPLATE_METADATA.shanglan,
    component: lazy(() => import('@/templates/shanglan')),
    recommendedPrimaryColor: '#4d93ff',
  },
  jinhang: {
    ...TEMPLATE_METADATA.jinhang,
    component: lazy(() => import('@/templates/jinhang')),
    recommendedPrimaryColor: '#c89143',
  },
  jijian: {
    ...TEMPLATE_METADATA.jijian,
    component: lazy(() => import('@/templates/jijian')),
    recommendedPrimaryColor: '#111111',
  },
  lanzix: {
    ...TEMPLATE_METADATA.lanzix,
    component: lazy(() => import('@/templates/lanzix')),
    recommendedPrimaryColor: '#5d5aa0',
  },
  // ——— Flagship headless templates (each owns a deliberate brand palette) —
  qingyun: {
    ...TEMPLATE_METADATA.qingyun,
    component: lazy(() => import('@/templates/qingyun')),
    recommendedPrimaryColor: '#0891b2',
  },
  mashang: {
    ...TEMPLATE_METADATA.mashang,
    component: lazy(() => import('@/templates/mashang')),
    recommendedPrimaryColor: '#10b981',
  },
  zhumo: {
    ...TEMPLATE_METADATA.zhumo,
    component: lazy(() => import('@/templates/zhumo')),
    exportLayout: 'bleed',
    recommendedPrimaryColor: '#b91c1c',
    recommendedFontFamilyId: 'serif',
  },
  xingtan: {
    ...TEMPLATE_METADATA.xingtan,
    component: lazy(() => import('@/templates/xingtan')),
    exportLayout: 'bleed',
    recommendedPrimaryColor: '#a16207',
    recommendedFontFamilyId: 'serif',
  },
  moxu: {
    ...TEMPLATE_METADATA.moxu,
    component: lazy(() => import('@/templates/moxu')),
    recommendedPrimaryColor: '#242424',
    recommendedFontFamilyId: 'serif',
  },
  qingning: {
    ...TEMPLATE_METADATA.qingning,
    component: lazy(() => import('@/templates/qingning')),
    recommendedPrimaryColor: '#c6e1d2',
  },
  suxian: {
    ...TEMPLATE_METADATA.suxian,
    component: lazy(() => import('@/templates/suxian')),
    recommendedPrimaryColor: '#292929',
  },
  zhangxu: {
    ...TEMPLATE_METADATA.zhangxu,
    component: lazy(() => import('@/templates/zhangxu')),
    recommendedPrimaryColor: '#3a4351',
  },
  mixu: {
    ...TEMPLATE_METADATA.mixu,
    component: lazy(() => import('@/templates/mixu')),
    recommendedPrimaryColor: '#2a201f',
  },
  chengyan: {
    ...TEMPLATE_METADATA.chengyan,
    component: lazy(() => import('@/templates/chengyan')),
    recommendedPrimaryColor: '#b6653a',
  },
  lanqi: {
    ...TEMPLATE_METADATA.lanqi,
    component: lazy(() => import('@/templates/lanqi')),
    recommendedPrimaryColor: '#7899b9',
  },
  shenke: {
    ...TEMPLATE_METADATA.shenke,
    component: lazy(() => import('@/templates/shenke')),
    recommendedPrimaryColor: '#344052',
  },
  kuangxu: {
    ...TEMPLATE_METADATA.kuangxu,
    component: lazy(() => import('@/templates/kuangxu')),
    recommendedPrimaryColor: '#343434',
  },
  huiying: {
    ...TEMPLATE_METADATA.huiying,
    component: lazy(() => import('@/templates/huiying')),
    recommendedPrimaryColor: '#292929',
  },
  jingrui: {
    ...TEMPLATE_METADATA.jingrui,
    component: lazy(() => import('@/templates/jingrui')),
    recommendedPrimaryColor: '#4c47ff',
  },
  yunbai: {
    ...TEMPLATE_METADATA.yunbai,
    component: lazy(() => import('@/templates/yunbai')),
    recommendedPrimaryColor: '#222222',
  },
  qianyao: {
    ...TEMPLATE_METADATA.qianyao,
    component: lazy(() => import('@/templates/qianyao')),
    recommendedPrimaryColor: '#222222',
  },
  jilan: {
    ...TEMPLATE_METADATA.jilan,
    component: lazy(() => import('@/templates/jilan')),
    recommendedPrimaryColor: '#2778b6',
  },
  qinglan: {
    ...TEMPLATE_METADATA.qinglan,
    component: lazy(() => import('@/templates/qinglan')),
    recommendedPrimaryColor: '#488a79',
  },
  yinxing: {
    ...TEMPLATE_METADATA.yinxing,
    component: lazy(() => import('@/templates/yinxing')),
    recommendedPrimaryColor: '#30343b',
  },
  jinshu: {
    ...TEMPLATE_METADATA.jinshu,
    component: lazy(() => import('@/templates/jinshu')),
    recommendedPrimaryColor: '#566a9b',
  },
  liuguang: {
    ...TEMPLATE_METADATA.liuguang,
    component: lazy(() => import('@/templates/liuguang')),
    recommendedPrimaryColor: '#44576f',
  },
  mingxu: {
    ...TEMPLATE_METADATA.mingxu,
    component: lazy(() => import('@/templates/mingxu')),
    recommendedPrimaryColor: '#252525',
  },
  guanlan: {
    ...TEMPLATE_METADATA.guanlan,
    component: lazy(() => import('@/templates/guanlan')),
    recommendedPrimaryColor: '#344376',
  },
  chujian: {
    ...TEMPLATE_METADATA.chujian,
    component: lazy(() => import('@/templates/chujian')),
    recommendedPrimaryColor: '#6d8fbf',
  },
  chunzhao: {
    ...TEMPLATE_METADATA.chunzhao,
    component: lazy(() => import('@/templates/chunzhao')),
    recommendedPrimaryColor: '#559ab9',
  },
  xingmiao: {
    ...TEMPLATE_METADATA.xingmiao,
    component: lazy(() => import('@/templates/xingmiao')),
    recommendedPrimaryColor: '#558b99',
  },
  jianqing: {
    ...TEMPLATE_METADATA.jianqing,
    component: lazy(() => import('@/templates/jianqing')),
    recommendedPrimaryColor: '#242424',
  },
  qihang: {
    ...TEMPLATE_METADATA.qihang,
    component: lazy(() => import('@/templates/qihang')),
    recommendedPrimaryColor: '#23356f',
  },
  xiaoyuanlan: {
    ...TEMPLATE_METADATA.xiaoyuanlan,
    component: lazy(() => import('@/templates/xiaoyuanlan')),
    recommendedPrimaryColor: '#343434',
  },
  shaoniangan: {
    ...TEMPLATE_METADATA.shaoniangan,
    component: lazy(() => import('@/templates/shaoniangan')),
    recommendedPrimaryColor: '#468d93',
  },
  zhanxu: {
    ...TEMPLATE_METADATA.zhanxu,
    component: lazy(() => import('@/templates/zhanxu')),
    recommendedPrimaryColor: '#3b72a7',
  },
  jikebai: {
    ...TEMPLATE_METADATA.jikebai,
    component: lazy(() => import('@/templates/jikebai')),
    recommendedPrimaryColor: '#3b3b3b',
  },
  heiyao: {
    ...TEMPLATE_METADATA.heiyao,
    component: lazy(() => import('@/templates/heiyao')),
    recommendedPrimaryColor: '#252525',
  },
  shujuliu: {
    ...TEMPLATE_METADATA.shujuliu,
    component: lazy(() => import('@/templates/shujuliu')),
    recommendedPrimaryColor: '#66a4cb',
  },
  jiagoushi: {
    ...TEMPLATE_METADATA.jiagoushi,
    component: lazy(() => import('@/templates/jiagoushi')),
    recommendedPrimaryColor: '#47576d',
  },
  zixunhui: {
    ...TEMPLATE_METADATA.zixunhui,
    component: lazy(() => import('@/templates/zixunhui')),
    recommendedPrimaryColor: '#8a7462',
  },
  caiwulan: {
    ...TEMPLATE_METADATA.caiwulan,
    component: lazy(() => import('@/templates/caiwulan')),
    recommendedPrimaryColor: '#282828',
  },
  fawujian: {
    ...TEMPLATE_METADATA.fawujian,
    component: lazy(() => import('@/templates/fawujian')),
    recommendedPrimaryColor: '#444444',
  },
}

/**
 * 获取所有模板列表
 */
export function getAllTemplates(): TemplateConfig[] {
  return Object.values(TEMPLATE_REGISTRY).filter((template) => template.visibility.editor)
}

/** User-facing choices share the public catalog; hidden templates remain loadable by ID. */
export function getPublicTemplates(): TemplateConfig[] {
  return Object.values(TEMPLATE_REGISTRY).filter((template) => template.visibility.editor && template.visibility.catalog)
}

/**
 * 根据ID获取模板
 */
export function getTemplate(id: string): TemplateConfig | undefined {
  return TEMPLATE_REGISTRY[id]
}

/**
 * 根据标签搜索模板
 */
export function searchTemplatesByTag(tag: string): TemplateConfig[] {
  return getPublicTemplates().filter((t) => t.tags?.includes(tag))
}
