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
  lanhe: {
    ...TEMPLATE_METADATA.lanhe,
    component: lazy(() => import('@/templates/lanhe')),
    recommendedPrimaryColor: '#5b7188',
  },
  lanjing: {
    ...TEMPLATE_METADATA.lanjing,
    component: lazy(() => import('@/templates/lanjing')),
    recommendedPrimaryColor: '#2f6fb2',
  },
  mujian: {
    ...TEMPLATE_METADATA.mujian,
    component: lazy(() => import('@/templates/mujian')),
    recommendedPrimaryColor: '#222222',
  },
  qianbiao: {
    ...TEMPLATE_METADATA.qianbiao,
    component: lazy(() => import('@/templates/qianbiao')),
    recommendedPrimaryColor: '#aab9d4',
  },
  huabu: {
    ...TEMPLATE_METADATA.huabu,
    component: lazy(() => import('@/templates/huabu')),
    recommendedPrimaryColor: '#5d8dce',
  },
  huigui: {
    ...TEMPLATE_METADATA.huigui,
    component: lazy(() => import('@/templates/huigui')),
    recommendedPrimaryColor: '#526174',
  },
  lvxin: {
    ...TEMPLATE_METADATA.lvxin,
    component: lazy(() => import('@/templates/lvxin')),
    recommendedPrimaryColor: '#5f9276',
  },
  hongcai: {
    ...TEMPLATE_METADATA.hongcai,
    component: lazy(() => import('@/templates/hongcai')),
    recommendedPrimaryColor: '#a65d55',
  },
  yingke: {
    ...TEMPLATE_METADATA.yingke,
    component: lazy(() => import('@/templates/yingke')),
    recommendedPrimaryColor: '#8a5a00',
  },
  hongjian: {
    ...TEMPLATE_METADATA.hongjian,
    component: lazy(() => import('@/templates/hongjian')),
    recommendedPrimaryColor: '#b44c4d',
  },
  jibai: {
    ...TEMPLATE_METADATA.jibai,
    component: lazy(() => import('@/templates/jibai')),
    recommendedPrimaryColor: '#4b82b6',
  },
  sulan: {
    ...TEMPLATE_METADATA.sulan,
    component: lazy(() => import('@/templates/sulan')),
    recommendedPrimaryColor: '#4c79a8',
  },
  xinkai: {
    ...TEMPLATE_METADATA.xinkai,
    component: lazy(() => import('@/templates/xinkai')),
    recommendedPrimaryColor: '#527ea5',
  },
  zhenmu: {
    ...TEMPLATE_METADATA.zhenmu,
    component: lazy(() => import('@/templates/zhenmu')),
    recommendedPrimaryColor: '#896a57',
  },
  qingyu: {
    ...TEMPLATE_METADATA.qingyu,
    component: lazy(() => import('@/templates/qingyu')),
    recommendedPrimaryColor: '#75a9a2',
  },
  lvzhou: {
    ...TEMPLATE_METADATA.lvzhou,
    component: lazy(() => import('@/templates/lvzhou')),
    recommendedPrimaryColor: '#5b906e',
  },
  baijiao: {
    ...TEMPLATE_METADATA.baijiao,
    component: lazy(() => import('@/templates/baijiao')),
    recommendedPrimaryColor: '#252525',
  },
  jiaozhen: {
    ...TEMPLATE_METADATA.jiaozhen,
    component: lazy(() => import('@/templates/jiaozhen')),
    recommendedPrimaryColor: '#7b8490',
  },
  falan: {
    ...TEMPLATE_METADATA.falan,
    component: lazy(() => import('@/templates/falan')),
    recommendedPrimaryColor: '#355e92',
  },
  lanhui: {
    ...TEMPLATE_METADATA.lanhui,
    component: lazy(() => import('@/templates/lanhui')),
    recommendedPrimaryColor: '#5d82ad',
  },
  yuhe: {
    ...TEMPLATE_METADATA.yuhe,
    component: lazy(() => import('@/templates/yuhe')),
    recommendedPrimaryColor: '#6b7f9b',
  },
  hongye: {
    ...TEMPLATE_METADATA.hongye,
    component: lazy(() => import('@/templates/hongye')),
    recommendedPrimaryColor: '#c75b5b',
  },
  mihuang: {
    ...TEMPLATE_METADATA.mihuang,
    component: lazy(() => import('@/templates/mihuang')),
    recommendedPrimaryColor: '#c6a268',
  },
  baolv: {
    ...TEMPLATE_METADATA.baolv,
    component: lazy(() => import('@/templates/baolv')),
    recommendedPrimaryColor: '#6d9b73',
  },
  shuanglan: {
    ...TEMPLATE_METADATA.shuanglan,
    component: lazy(() => import('@/templates/shuanglan')),
    recommendedPrimaryColor: '#4676b7',
  },
  zicui: {
    ...TEMPLATE_METADATA.zicui,
    component: lazy(() => import('@/templates/zicui')),
    recommendedPrimaryColor: '#8068a5',
  },
  heiyu: {
    ...TEMPLATE_METADATA.heiyu,
    component: lazy(() => import('@/templates/heiyu')),
    recommendedPrimaryColor: '#292929',
  },
  zijiao: {
    ...TEMPLATE_METADATA.zijiao,
    component: lazy(() => import('@/templates/zijiao')),
    recommendedPrimaryColor: '#7965a8',
  },
  shangfeng: {
    ...TEMPLATE_METADATA.shangfeng,
    component: lazy(() => import('@/templates/shangfeng')),
    recommendedPrimaryColor: '#3f6d9e',
  },
  qicheng: {
    ...TEMPLATE_METADATA.qicheng,
    component: lazy(() => import('@/templates/qicheng')),
    recommendedPrimaryColor: '#4f83b0',
  },
  fenzhi: {
    ...TEMPLATE_METADATA.fenzhi,
    component: lazy(() => import('@/templates/fenzhi')),
    recommendedPrimaryColor: '#d36c9b',
  },
  weizhi: {
    ...TEMPLATE_METADATA.weizhi,
    component: lazy(() => import('@/templates/weizhi')),
    recommendedPrimaryColor: '#385f90',
  },
  baiyu: {
    ...TEMPLATE_METADATA.baiyu,
    component: lazy(() => import('@/templates/baiyu')),
    recommendedPrimaryColor: '#7b7f87',
  },
  yingxiao: {
    ...TEMPLATE_METADATA.yingxiao,
    component: lazy(() => import('@/templates/yingxiao')),
    recommendedPrimaryColor: '#4b78ad',
  },
  tiezi: {
    ...TEMPLATE_METADATA.tiezi,
    component: lazy(() => import('@/templates/tiezi')),
    recommendedPrimaryColor: '#9c6d53',
  },
  zhuanxin: {
    ...TEMPLATE_METADATA.zhuanxin,
    component: lazy(() => import('@/templates/zhuanxin')),
    recommendedPrimaryColor: '#5b82aa',
  },
  qinghe: {
    ...TEMPLATE_METADATA.qinghe,
    component: lazy(() => import('@/templates/qinghe')),
    recommendedPrimaryColor: '#789276',
  },
  huichen: {
    ...TEMPLATE_METADATA.huichen,
    component: lazy(() => import('@/templates/huichen')),
    recommendedPrimaryColor: '#6e737b',
  },
  changcheng: {
    ...TEMPLATE_METADATA.changcheng,
    component: lazy(() => import('@/templates/changcheng')),
    recommendedPrimaryColor: '#57799d',
  },
  jingjian: {
    ...TEMPLATE_METADATA.jingjian,
    component: lazy(() => import('@/templates/jingjian')),
    recommendedPrimaryColor: '#5278a4',
  },
  chaobai: {
    ...TEMPLATE_METADATA.chaobai,
    component: lazy(() => import('@/templates/chaobai')),
    recommendedPrimaryColor: '#8a69bc',
  },
  xuexin: {
    ...TEMPLATE_METADATA.xuexin,
    component: lazy(() => import('@/templates/xuexin')),
    recommendedPrimaryColor: '#4f79b1',
  },
  xiaoshou: {
    ...TEMPLATE_METADATA.xiaoshou,
    component: lazy(() => import('@/templates/xiaoshou')),
    recommendedPrimaryColor: '#477aad',
  },
  lvjian: {
    ...TEMPLATE_METADATA.lvjian,
    component: lazy(() => import('@/templates/lvjian')),
    recommendedPrimaryColor: '#6a9b72',
  },
  jiaoyu: {
    ...TEMPLATE_METADATA.jiaoyu,
    component: lazy(() => import('@/templates/jiaoyu')),
    recommendedPrimaryColor: '#4f7f88',
  },
  pixel: {
    ...TEMPLATE_METADATA.pixel,
    component: lazy(() => import('@/templates/pixel')),
    recommendedPrimaryColor: '#4776c5',
  },
  jingying: {
    ...TEMPLATE_METADATA.jingying,
    component: lazy(() => import('@/templates/jingying')),
    recommendedPrimaryColor: '#416a9e',
  },
  lvjian2: {
    ...TEMPLATE_METADATA.lvjian2,
    component: lazy(() => import('@/templates/lvjian2')),
    recommendedPrimaryColor: '#6e9e76',
  },
  shangwu: {
    ...TEMPLATE_METADATA.shangwu,
    component: lazy(() => import('@/templates/shangwu')),
    recommendedPrimaryColor: '#526f99',
  },
  wenhe: {
    ...TEMPLATE_METADATA.wenhe,
    component: lazy(() => import('@/templates/wenhe')),
    recommendedPrimaryColor: '#9b806b',
  },
  'canva-minimal': {
    ...TEMPLATE_METADATA['canva-minimal'],
    component: lazy(() => import('@/templates/canva-minimal')),
    recommendedPrimaryColor: '#27313b',
    recommendedFontFamilyId: 'sans',
  },
  'canva-columns': {
    ...TEMPLATE_METADATA['canva-columns'],
    component: lazy(() => import('@/templates/canva-columns')),
    recommendedPrimaryColor: '#334155',
    recommendedFontFamilyId: 'sans',
  },
  'canva-sidebar': {
    ...TEMPLATE_METADATA['canva-sidebar'],
    component: lazy(() => import('@/templates/canva-sidebar')),
    exportLayout: 'bleed',
    recommendedPrimaryColor: '#5279a8',
    recommendedFontFamilyId: 'sans',
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
