/**
 * Template Loader - 动态加载模板，支持代码分割
 * 每个模板会被打包成独立的chunk，按需加载
 */
import { lazy, type ComponentType } from 'react'
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

export interface TemplateConfig {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly preview?: string
  readonly author?: string
  readonly tags?: string[]
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

const HIDDEN_TEMPLATE_IDS: ReadonlySet<string> = new Set(['lanxin'])

/**
 * 模板注册表
 * 使用动态import，每个模板会被Vite自动分割成独立chunk
 */
export const TEMPLATE_REGISTRY: Record<string, TemplateConfig> = {
  // ——— Legacy templates (pre-kernel, kept as the utility baseline) —————
  simple: {
    id: 'simple',
    name: '简约',
    description: '简洁大方，适合所有场景',
    preview: '/thumbnails/template_simple.webp',
    tags: ['通用', '简洁'],
    component: lazy(() => import('@/templates/simple')),
  },
  elegant: {
    id: 'elegant',
    name: '典雅',
    description: '深色头部 + 金色点缀，庄重大方，适合正式场合',
    preview: '/thumbnails/template_elegant.webp',
    tags: ['正式', '庄重', '典雅', '金色'],
    component: lazy(() => import('@/templates/elegant')),
  },
  warm: {
    id: 'warm',
    name: '双栏',
    description: '双列布局，左侧边栏 + 右侧主内容，淡黄色点缀',
    preview: '/thumbnails/template_warm.webp',
    tags: ['通用', '双列', '淡黄', '侧边栏'],
    component: lazy(() => import('@/templates/warm')),
    exportLayout: 'bleed',
  },
  timeline: {
    id: 'timeline',
    name: '时间轴',
    description: '左侧日期 + 右侧内容，竖线贯穿，经典时间轴风格',
    preview: '/thumbnails/template_timeline.webp',
    tags: ['通用', '时间轴', '经典', '简洁'],
    component: lazy(() => import('@/templates/timeline')),
  },
  lanxin: {
    id: 'lanxin',
    name: '蓝芯',
    description: '浅蓝页眉 + 左侧竖线节点，清爽专业，适合产品、运营与校招场景',
    preview: '/thumbnails/template_lanxin.webp',
    tags: ['通用', '时间轴', '浅蓝', '专业'],
    component: lazy(() => import('@/templates/lanxin')),
    recommendedPrimaryColor: '#3a8ec7',
  },
  tablegrid: {
    id: 'tablegrid',
    name: '表格',
    description: '传统表格结构，信息分区清晰，适合正式投递与标准化简历',
    preview: '/thumbnails/template_tablegrid.webp',
    tags: ['通用', '表格', '正式', '标准'],
    component: lazy(() => import('@/templates/tablegrid')),
    recommendedPrimaryColor: '#3d4b58',
  },
  xinghe: {
    id: 'xinghe',
    name: '星河',
    description: '紫色渐变点缀 + 大气单栏，适合产品、运营、市场与互联网通用岗位',
    preview: '/thumbnails/template_xinghe.webp',
    tags: ['原创', '通用', '精美', '大气'],
    component: lazy(() => import('@/templates/xinghe')),
    recommendedPrimaryColor: '#7c3aed',
  },
  lifeng: {
    id: 'lifeng',
    name: '砺锋',
    description: '深色侧栏 + 紧凑信息布局，适合技术、工程、项目管理与咨询岗位',
    preview: '/thumbnails/template_lifeng.webp',
    tags: ['原创', '紧凑', '双栏', '技术'],
    component: lazy(() => import('@/templates/lifeng')),
    recommendedPrimaryColor: '#7c3aed',
  },
  qingsui: {
    id: 'qingsui',
    name: '青穗',
    description: '青蓝渐变页眉 + 校招亮点区，适合应届生、实习和转专业求职',
    preview: '/thumbnails/template_qingsui.webp',
    tags: ['原创', '校招', '应届生', '清爽'],
    component: lazy(() => import('@/templates/qingsui')),
    recommendedPrimaryColor: '#0891b2',
  },
  yuanshan: {
    id: 'yuanshan',
    name: '远山',
    description: '暖棕双线 + 稳重业绩区，适合资深专家、高管和管理岗位',
    preview: '/thumbnails/template_yuanshan.webp',
    tags: ['原创', '资深', '管理', '稳重'],
    component: lazy(() => import('@/templates/yuanshan')),
    recommendedPrimaryColor: '#9a6b38',
    recommendedFontFamilyId: 'serif',
  },
  hengjian: {
    id: 'hengjian',
    name: '衡简',
    description: '正式表格信息 + 端正分区，适合国企、银行、事业单位与传统行业',
    preview: '/thumbnails/template_hengjian.webp',
    tags: ['原创', '正式', '国企', '表格'],
    component: lazy(() => import('@/templates/hengjian')),
    recommendedPrimaryColor: '#334155',
  },
  yiyetong: {
    id: 'yiyetong',
    name: '一页通',
    description: '极致一页承载，压缩高效，适合海投和信息量较多的用户',
    preview: '/thumbnails/template_yiyetong.webp',
    tags: ['原创', '紧凑', '一页', '海投'],
    component: lazy(() => import('@/templates/yiyetong')),
    recommendedPrimaryColor: '#475569',
  },
  lanzhe: {
    id: 'lanzhe',
    name: '蓝折',
    description: '蓝色折纸页眉 + 立体签条模块，紧凑精致，适合年轻用户、校招、实习与运营岗位',
    preview: '/thumbnails/template_lanzhe.webp',
    tags: ['原创', '校招', '折角', '紧凑'],
    component: lazy(() => import('@/templates/lanzhe')),
    recommendedPrimaryColor: '#4f719f',
  },
  dense: {
    id: 'dense',
    name: '密排',
    description: '青绿时间线 + 极高信息密度，适合内容较多、希望尽量压缩到一页的简历',
    preview: '/thumbnails/template_dense.webp',
    tags: ['原创', '紧凑', '时间轴', '一页'],
    component: lazy(() => import('@/templates/dense')),
    recommendedPrimaryColor: '#4fb8ba',
  },
  ziji: {
    id: 'ziji',
    name: '紫记',
    description: '紫色渐变头图 + 双栏履历笔记，适合个人主页感、运营、产品与创意岗位',
    preview: '/thumbnails/template_ziji.webp',
    tags: ['原创', '双栏', '紫色', '个人履历'],
    component: lazy(() => import('@/templates/ziji')),
    recommendedPrimaryColor: '#7c3aed',
  },
  lanfa: {
    id: 'lanfa',
    name: '蓝法',
    description: '深蓝法务风格 + 端正信息分区，适合法务、行政与商务支持岗位',
    preview: '/thumbnails/template_lanfa.webp',
    tags: ['原创', '蓝色', '正式', '法务'],
    component: lazy(() => import('@/templates/lanfa')),
    recommendedPrimaryColor: '#0b2a57',
  },
  lanying: {
    id: 'lanying',
    name: '蓝营',
    description: '蓝色商务条幅 + 清晰模块标题，适合市场、运营和销售支持岗位',
    preview: '/thumbnails/template_lanying.webp',
    tags: ['原创', '蓝色', '市场', '商务'],
    component: lazy(() => import('@/templates/lanying')),
    recommendedPrimaryColor: '#3f6da3',
  },
  qiance: {
    id: 'qiance',
    name: '浅策',
    description: '浅蓝柔和页眉 + 清爽单栏排版，适合策划、运营和校招简历',
    preview: '/thumbnails/template_qiance.webp',
    tags: ['原创', '浅蓝', '策划', '清爽'],
    component: lazy(() => import('@/templates/qiance')),
    recommendedPrimaryColor: '#6ea6cf',
  },
  heijiao: {
    id: 'heijiao',
    name: '黑教',
    description: '黑白教师风格 + 严谨分区，适合教师、教培和学术类岗位',
    preview: '/thumbnails/template_heijiao.webp',
    tags: ['原创', '黑白', '教师', '正式'],
    component: lazy(() => import('@/templates/heijiao')),
    recommendedPrimaryColor: '#111111',
  },
  shanglan: {
    id: 'shanglan',
    name: '商蓝',
    description: '蓝紫侧栏 + 商务应届布局，适合应届生、实习和商务通用岗位',
    preview: '/thumbnails/template_shanglan.webp',
    tags: ['原创', '双栏', '应届生', '蓝紫'],
    component: lazy(() => import('@/templates/shanglan')),
    recommendedPrimaryColor: '#4d93ff',
  },
  jinhang: {
    id: 'jinhang',
    name: '金行',
    description: '金色银行风格 + 稳重线条，适合银行、金融和传统行业岗位',
    preview: '/thumbnails/template_jinhang.webp',
    tags: ['原创', '金色', '银行', '金融'],
    component: lazy(() => import('@/templates/jinhang')),
    recommendedPrimaryColor: '#c89143',
  },
  jijian: {
    id: 'jijian',
    name: '极简黑',
    description: '黑白极简 + 高信息密度，适合希望快速压缩内容的一页简历',
    preview: '/thumbnails/template_jijian.webp',
    tags: ['原创', '黑白', '极简', '一页'],
    component: lazy(() => import('@/templates/jijian')),
    recommendedPrimaryColor: '#111111',
  },
  lanzix: {
    id: 'lanzix',
    name: '蓝紫',
    description: '蓝紫点线装饰 + 应届生友好排版，适合校招、实习和初级岗位',
    preview: '/thumbnails/template_lanzix.webp',
    tags: ['原创', '蓝紫', '校招', '应届生'],
    component: lazy(() => import('@/templates/lanzix')),
    recommendedPrimaryColor: '#5d5aa0',
  },
  // ——— Flagship headless templates (each owns a deliberate brand palette) —
  qingyun: {
    id: 'qingyun',
    name: '青云',
    description: '天青蓝 + 暖橙 · 应届毕业徽章 · 双语时间轴 · 校招应届生首选（Headless）',
    preview: '/thumbnails/template_qingyun.webp',
    tags: ['旗舰', '校招', '应届生', '天青蓝', 'Headless'],
    component: lazy(() => import('@/templates/qingyun')),
    recommendedPrimaryColor: '#0891b2',
  },
  mashang: {
    id: 'mashang',
    name: '码上',
    description: '代码绿 + 终端琥珀 · 终端风 Hero · 章节编号 · 开发者 / 算法岗首选（Headless）',
    preview: '/thumbnails/template_mashang.webp',
    tags: ['旗舰', '开发', '算法', '技术', '终端', 'Headless'],
    component: lazy(() => import('@/templates/mashang')),
    recommendedPrimaryColor: '#10b981',
  },
  zhumo: {
    id: 'zhumo',
    name: '朱墨',
    description: '朱砂红 + 松烟墨 · 衬线字 · 中文数字编号 · 朱红方印 · 编辑 / 文案 / 内容岗首选（Headless）',
    preview: '/thumbnails/template_zhumo.webp',
    tags: ['旗舰', '编辑', '文案', '内容', '衬线', 'Headless'],
    component: lazy(() => import('@/templates/zhumo')),
    exportLayout: 'bleed',
    locksPrimaryColor: true,
    recommendedPrimaryColor: '#b91c1c',
    recommendedFontFamilyId: 'serif',
  },
  xingtan: {
    id: 'xingtan',
    name: '杏坛',
    description: '杏黄 + 松烟墨 · 古籍卷首双实线 banner · 章节「第壹章」· 书法体姓名 · 教师 / 学术岗首选（Headless）',
    preview: '/thumbnails/template_xingtan.webp',
    tags: ['旗舰', '教师', '学术', '教育', '古籍', 'Headless'],
    component: lazy(() => import('@/templates/xingtan')),
    exportLayout: 'bleed',
    locksPrimaryColor: true,
    recommendedPrimaryColor: '#a16207',
    recommendedFontFamilyId: 'serif',
  },
}

/**
 * 获取所有模板列表
 */
export function getAllTemplates(): TemplateConfig[] {
  return Object.values(TEMPLATE_REGISTRY).filter((template) => !HIDDEN_TEMPLATE_IDS.has(template.id))
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
  return getAllTemplates().filter((t) => t.tags?.includes(tag))
}
