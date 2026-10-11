import type { ModuleKey } from '@/entities/module/module-config'

/** Measured from the archived 1131 × 1600 Canva pages; A4 preview is 794 px wide.
 * These are layout recipes, not applicant data. Never put example facts here. */
export interface ReferenceDesign {
  readonly sourceId: string
  readonly columns: 'single' | 'left' | 'right' | 'split'
  readonly railRatio?: number
  readonly header: 'inline' | 'ruled' | 'rail' | 'mint' | 'circle' | 'segmented' | 'notched' | 'dots' | 'frame' | 'bookmark' | 'vertical' | 'collage' | 'compact' | 'split' | 'banner' | 'blue-banner' | 'angled' | 'rail-document' | 'centered' | 'stacked' | 'table' | 'watercolor'
  readonly heading: 'dotted' | 'ruled' | 'hexagon' | 'square' | 'pill' | 'folded' | 'slant' | 'solid-icon' | 'plane' | 'flag' | 'bubble' | 'tape' | 'tab' | 'triangle' | 'outline-icon' | 'two-tone' | 'capsule' | 'flat' | 'caps-rule' | 'rounded-bar' | 'arrow' | 'bullet' | 'timeline-dot' | 'spark-rule' | 'thin' | 'table-band'
  readonly accent: string
  readonly avatar: readonly [number, number]
  readonly avatarShape?: 'circle' | 'rounded' | 'polaroid'
  readonly sidebarModules?: readonly ModuleKey[]
  readonly darkRail?: boolean
  /** Optional light tint used by references with a paper-like profile rail. */
  readonly railTint?: string
  readonly density: 'standard' | 'compact'
  readonly blockFlow?: 'date-track' | 'ledger' | 'table'
  readonly decor?: 'edge-bands' | 'circles' | 'outer-frame' | 'spine' | 'paper' | 'beige-circles' | 'top-rule' | 'corner-bands' | 'watercolor-cards'
}

const supplementary = ['skill', 'summary', 'qualifications'] as const
export const REFERENCE_DESIGNS = {
  yunbai: { sourceId: 'EAGAKbjagYk', columns: 'single', header: 'inline', heading: 'dotted', accent: '#222222', avatar: [132, 156], density: 'standard' },
  qianyao: { sourceId: 'EAG1XXwjQeg', columns: 'single', header: 'ruled', heading: 'ruled', accent: '#222222', avatar: [103, 111], density: 'standard' },
  jilan: { sourceId: 'EAGp2cNi_4U', columns: 'left', railRatio: .37, header: 'rail', heading: 'hexagon', accent: '#2778b6', avatar: [165, 184], sidebarModules: supplementary, darkRail: true, density: 'standard' },
  qinglan: { sourceId: 'EAF0e6HAWDE', columns: 'single', header: 'mint', heading: 'square', accent: '#488a79', avatar: [130, 156], density: 'standard', decor: 'edge-bands' },
  yinxing: { sourceId: 'EAFSF4u4X7g', columns: 'right', railRatio: .30, header: 'circle', heading: 'pill', accent: '#30343b', avatar: [112, 112], avatarShape: 'circle', sidebarModules: supplementary, density: 'standard', decor: 'circles' },
  jinshu: { sourceId: 'EAFrAuLzH0g', columns: 'single', header: 'segmented', heading: 'folded', accent: '#566a9b', avatar: [108, 127], avatarShape: 'rounded', density: 'standard', decor: 'spine' },
  liuguang: { sourceId: 'EAG5BJFpDH0', columns: 'single', header: 'notched', heading: 'slant', accent: '#44576f', avatar: [106, 128], density: 'standard' },
  mingxu: { sourceId: 'EAG1NYzrmEA', columns: 'single', header: 'ruled', heading: 'solid-icon', accent: '#252525', avatar: [112, 133], density: 'standard' },
  guanlan: { sourceId: 'EAG6amszSHE', columns: 'single', header: 'frame', heading: 'plane', accent: '#344376', avatar: [110, 133], density: 'standard', decor: 'outer-frame' },
  chujian: { sourceId: 'EAGDgQ-pf6M', columns: 'single', header: 'bookmark', heading: 'flag', accent: '#6d8fbf', avatar: [103, 125], density: 'standard', decor: 'edge-bands' },
  chunzhao: { sourceId: 'EAG-dOzsKqk', columns: 'single', header: 'vertical', heading: 'bubble', accent: '#559ab9', avatar: [105, 127], density: 'standard' },
  xingmiao: { sourceId: 'EAG2Zs4rlws', columns: 'left', railRatio: .44, header: 'collage', heading: 'tape', accent: '#558b99', avatar: [187, 217], avatarShape: 'polaroid', sidebarModules: ['eduExp', 'qualifications', 'skill'], density: 'standard', decor: 'paper' },
  jianqing: { sourceId: 'EAGiEgdRE0E', columns: 'single', header: 'dots', heading: 'tab', accent: '#242424', avatar: [111, 131], density: 'standard' },
  qihang: { sourceId: 'EAGb_GRLSOE', columns: 'single', header: 'compact', heading: 'triangle', accent: '#23356f', avatar: [115, 137], density: 'standard' },
  xiaoyuanlan: { sourceId: 'EAGRqi3YNLQ', columns: 'single', header: 'dots', heading: 'outline-icon', accent: '#343434', avatar: [110, 130], density: 'standard' },
  shaoniangan: { sourceId: 'EAHVRGFoGSU', columns: 'split', railRatio: .43, header: 'split', heading: 'two-tone', accent: '#468d93', avatar: [266, 280], sidebarModules: supplementary, density: 'standard' },
  zhanxu: { sourceId: 'EAHAoX7b59A', columns: 'single', header: 'banner', heading: 'capsule', accent: '#3b72a7', avatar: [120, 145], density: 'standard' },
  jikebai: { sourceId: 'EAGfcFNg9NY', columns: 'single', header: 'angled', heading: 'flat', accent: '#3b3b3b', avatar: [105, 127], density: 'compact', blockFlow: 'date-track' },
  heiyao: { sourceId: 'EAGw8Mq9mRk', columns: 'left', railRatio: .355, header: 'rail', heading: 'caps-rule', accent: '#252525', avatar: [162, 162], avatarShape: 'circle', sidebarModules: ['skill'], darkRail: true, density: 'compact' },
  shujuliu: { sourceId: 'EAGnnbc-Kcg', columns: 'left', railRatio: .267, header: 'rail-document', heading: 'rounded-bar', accent: '#66a4cb', avatar: [136, 162], sidebarModules: supplementary, density: 'compact' },
  jiagoushi: { sourceId: 'EAG7wqNALek', columns: 'single', header: 'notched', heading: 'arrow', accent: '#47576d', avatar: [113, 130], density: 'compact' },
  zixunhui: { sourceId: 'EAG2ncgx1Tc', columns: 'left', railRatio: .375, header: 'rail', heading: 'bullet', accent: '#8a7462', avatar: [193, 218], sidebarModules: supplementary, density: 'standard', decor: 'beige-circles' },
  caiwulan: { sourceId: 'EAGCc0BCNoc', columns: 'single', header: 'centered', heading: 'thin', accent: '#282828', avatar: [72, 86], density: 'compact', blockFlow: 'ledger' },
  fawujian: { sourceId: 'EAG7QTydNlc', columns: 'left', railRatio: .37, header: 'stacked', heading: 'flat', accent: '#444444', avatar: [176, 201], avatarShape: 'rounded', sidebarModules: ['skill', 'summary'], density: 'compact' },
  lanhe: { sourceId: 'EAGHKWvjDh4', columns: 'left', railRatio: .36, header: 'rail', heading: 'pill', accent: '#5b7188', avatar: [168, 198], avatarShape: 'rounded', sidebarModules: ['skill', 'qualifications', 'summary'], density: 'standard', railTint: '#edf2f5' },
  lanjing: { sourceId: 'EAGrImHrcTg', columns: 'single', header: 'blue-banner', heading: 'timeline-dot', accent: '#2f6fb2', avatar: [164, 204], density: 'standard', blockFlow: 'date-track' },
  mujian: { sourceId: 'EAG6_s3su9M', columns: 'single', header: 'inline', heading: 'spark-rule', accent: '#222222', avatar: [132, 156], density: 'standard', decor: 'top-rule' },
  qianbiao: { sourceId: 'EAGGeZE6KGY', columns: 'single', header: 'table', heading: 'table-band', accent: '#aab9d4', avatar: [170, 200], density: 'standard', blockFlow: 'table', decor: 'corner-bands' },
  huabu: { sourceId: 'EAGmZRaoCjo', columns: 'single', header: 'watercolor', heading: 'capsule', accent: '#5d8dce', avatar: [164, 190], avatarShape: 'rounded', density: 'standard', decor: 'watercolor-cards' },
  huigui: { sourceId: 'EAGombtNJx4', columns: 'left', railRatio: .36, header: 'rail-document', heading: 'dotted', accent: '#526174', avatar: [128, 158], sidebarModules: supplementary, density: 'compact', decor: 'top-rule' },
  lvxin: { sourceId: 'EAFwXk-tl5o', columns: 'split', railRatio: .43, header: 'split', heading: 'square', accent: '#5f9276', avatar: [190, 220], avatarShape: 'polaroid', sidebarModules: supplementary, density: 'standard', decor: 'edge-bands' },
  hongcai: { sourceId: 'EAGCc6P0xoI', columns: 'single', header: 'centered', heading: 'thin', accent: '#a65d55', avatar: [92, 108], density: 'compact', decor: 'top-rule' },
  yingke: { sourceId: 'EAGyHsX6Kb4', columns: 'right', railRatio: .30, header: 'segmented', heading: 'caps-rule', accent: '#8a5a00', avatar: [112, 132], avatarShape: 'circle', sidebarModules: supplementary, density: 'compact', blockFlow: 'date-track', decor: 'circles' },
  hongjian: { sourceId: 'EAGQUXdxa2Q', columns: 'single', header: 'notched', heading: 'flat', accent: '#b44c4d', avatar: [110, 130], density: 'standard', decor: 'top-rule' },
  jibai: { sourceId: 'EAGNukpl1Ig', columns: 'single', header: 'banner', heading: 'capsule', accent: '#4b82b6', avatar: [124, 148], density: 'standard', decor: 'edge-bands' },
  sulan: { sourceId: 'EAFB30uW_Pg', columns: 'single', header: 'inline', heading: 'ruled', accent: '#4c79a8', avatar: [118, 140], density: 'standard', decor: 'top-rule' },
  xinkai: { sourceId: 'EAGCc2V8AeU', columns: 'left', railRatio: .36, header: 'rail-document', heading: 'rounded-bar', accent: '#527ea5', avatar: [140, 168], sidebarModules: supplementary, density: 'compact', decor: 'paper' },
  zhenmu: { sourceId: 'EAGx4K-leJw', columns: 'single', header: 'stacked', heading: 'arrow', accent: '#896a57', avatar: [116, 136], density: 'compact', decor: 'spine' },
  qingyu: { sourceId: 'EAGJsKeAtlk', columns: 'single', header: 'mint', heading: 'bubble', accent: '#75a9a2', avatar: [125, 150], density: 'standard', decor: 'edge-bands' },
  lvzhou: { sourceId: 'EAGNuavBXaQ', columns: 'left', railRatio: .36, header: 'rail', heading: 'pill', accent: '#5b906e', avatar: [160, 185], sidebarModules: supplementary, density: 'standard', decor: 'beige-circles' },
  baijiao: { sourceId: 'EAFTTDBscQs', columns: 'single', header: 'ruled', heading: 'solid-icon', accent: '#252525', avatar: [104, 126], density: 'standard', decor: 'outer-frame' },
  jiaozhen: { sourceId: 'EAF6-RcUL3Y', columns: 'single', header: 'table', heading: 'table-band', accent: '#7b8490', avatar: [150, 180], density: 'compact', blockFlow: 'date-track', decor: 'corner-bands' },
  falan: { sourceId: 'EAF93tJubA4', columns: 'left', railRatio: .36, header: 'rail-document', heading: 'thin', accent: '#355e92', avatar: [140, 160], sidebarModules: supplementary, density: 'compact', decor: 'paper' },
  lanhui: { sourceId: 'EAG_ZiobM60', columns: 'single', header: 'blue-banner', heading: 'timeline-dot', accent: '#5d82ad', avatar: [126, 150], density: 'standard', decor: 'edge-bands' },
  yuhe: { sourceId: 'EAHA_r_-82I', columns: 'single', header: 'ruled', heading: 'outline-icon', accent: '#6b7f9b', avatar: [108, 128], density: 'standard', decor: 'top-rule' },
  hongye: { sourceId: 'EAG9nIOXwZY', columns: 'right', railRatio: .30, header: 'circle', heading: 'bubble', accent: '#c75b5b', avatar: [112, 112], avatarShape: 'circle', sidebarModules: supplementary, density: 'standard', decor: 'circles' },
  mihuang: { sourceId: 'EAHUwy5WCkQ', columns: 'split', railRatio: .43, header: 'split', heading: 'two-tone', accent: '#c6a268', avatar: [240, 250], avatarShape: 'polaroid', sidebarModules: supplementary, density: 'standard', decor: 'paper' },
  baolv: { sourceId: 'EAHOPCbHD-w', columns: 'single', header: 'inline', heading: 'flat', accent: '#6d9b73', avatar: [112, 134], density: 'standard', decor: 'edge-bands' },
  shuanglan: { sourceId: 'EAHRM2N1QWA', columns: 'single', header: 'vertical', heading: 'triangle', accent: '#4676b7', avatar: [118, 140], density: 'standard', decor: 'spine' },
  zicui: { sourceId: 'EAHCUpAq4Xg', columns: 'left', railRatio: .36, header: 'collage', heading: 'tape', accent: '#8068a5', avatar: [180, 208], sidebarModules: supplementary, density: 'standard', decor: 'paper' },
  heiyu: { sourceId: 'EAHVWfHHDz4', columns: 'right', railRatio: .30, header: 'frame', heading: 'plane', accent: '#292929', avatar: [130, 150], sidebarModules: supplementary, density: 'standard', decor: 'outer-frame' },
  zijiao: { sourceId: 'EAHCCghYRRY', columns: 'single', header: 'compact', heading: 'square', accent: '#7965a8', avatar: [120, 142], density: 'standard', decor: 'top-rule' },
  shangfeng: { sourceId: 'EAHRmLI6tj0', columns: 'left', railRatio: .36, header: 'rail', heading: 'bullet', accent: '#3f6d9e', avatar: [172, 198], sidebarModules: supplementary, density: 'compact', decor: 'beige-circles' },
  qicheng: { sourceId: 'EAHRl7AD33Q', columns: 'single', header: 'bookmark', heading: 'flag', accent: '#4f83b0', avatar: [120, 142], density: 'standard', decor: 'edge-bands' },
  fenzhi: { sourceId: 'EAHRzvpK69U', columns: 'single', header: 'segmented', heading: 'capsule', accent: '#d36c9b', avatar: [116, 138], density: 'standard', decor: 'circles' },
  weizhi: { sourceId: 'EAHQSOakW4w', columns: 'left', railRatio: .36, header: 'stacked', heading: 'rounded-bar', accent: '#385f90', avatar: [155, 180], sidebarModules: supplementary, density: 'compact', decor: 'paper' },
  baiyu: { sourceId: 'EAHPYi7a3RA', columns: 'single', header: 'centered', heading: 'outline-icon', accent: '#7b7f87', avatar: [98, 114], density: 'standard', decor: 'top-rule' },
  yingxiao: { sourceId: 'EAG5ys6d3ow', columns: 'single', header: 'banner', heading: 'arrow', accent: '#4b78ad', avatar: [128, 152], density: 'standard', decor: 'edge-bands' },
  tiezi: { sourceId: 'EAHGzNTW8ug', columns: 'split', railRatio: .43, header: 'split', heading: 'tape', accent: '#9c6d53', avatar: [235, 250], avatarShape: 'polaroid', sidebarModules: supplementary, density: 'standard', decor: 'paper' },
  zhuanxin: { sourceId: 'EAG9axAeb8A', columns: 'right', railRatio: .30, header: 'blue-banner', heading: 'timeline-dot', accent: '#5b82aa', avatar: [130, 150], sidebarModules: supplementary, density: 'standard', decor: 'top-rule' },
  qinghe: { sourceId: 'EAG76txKR5I', columns: 'left', railRatio: .36, header: 'rail-document', heading: 'rounded-bar', accent: '#789276', avatar: [145, 168], sidebarModules: supplementary, density: 'standard', decor: 'paper' },
  huichen: { sourceId: 'EAHDnXCBPF0', columns: 'single', header: 'notched', heading: 'slant', accent: '#6e737b', avatar: [108, 128], density: 'compact', decor: 'spine' },
  changcheng: { sourceId: 'EAHR4ZzxQwk', columns: 'single', header: 'compact', heading: 'timeline-dot', accent: '#57799d', avatar: [118, 136], density: 'compact', blockFlow: 'date-track', decor: 'top-rule' },
  jingjian: { sourceId: 'EAHTfFUUNQI', columns: 'single', header: 'inline', heading: 'dotted', accent: '#5278a4', avatar: [110, 130], density: 'standard', decor: 'outer-frame' },
  chaobai: { sourceId: 'EAHHuiq8ELg', columns: 'split', railRatio: .43, header: 'split', heading: 'two-tone', accent: '#8a69bc', avatar: [230, 250], avatarShape: 'polaroid', sidebarModules: supplementary, density: 'standard', decor: 'circles' },
  xuexin: { sourceId: 'EAHP6QfEMvA', columns: 'single', header: 'banner', heading: 'flag', accent: '#4f79b1', avatar: [124, 148], density: 'standard', decor: 'top-rule' },
  xiaoshou: { sourceId: 'EAHAJjG4Mcc', columns: 'left', railRatio: .36, header: 'rail', heading: 'capsule', accent: '#477aad', avatar: [160, 186], sidebarModules: supplementary, density: 'standard', decor: 'edge-bands' },
  lvjian: { sourceId: 'EAGkCXXPwKI', columns: 'single', header: 'mint', heading: 'square', accent: '#6a9b72', avatar: [116, 138], density: 'standard', decor: 'edge-bands' },
  jiaoyu: { sourceId: 'EAFfBCNOstw', columns: 'single', header: 'centered', heading: 'thin', accent: '#4f7f88', avatar: [100, 118], density: 'compact', decor: 'outer-frame' },
  pixel: { sourceId: 'EAHGpPw8SyA', columns: 'single', header: 'angled', heading: 'flat', accent: '#4776c5', avatar: [112, 134], density: 'standard', decor: 'top-rule' },
  jingying: { sourceId: 'EAG-XOsn_7k', columns: 'left', railRatio: .36, header: 'rail', heading: 'solid-icon', accent: '#416a9e', avatar: [170, 196], sidebarModules: supplementary, density: 'compact', decor: 'beige-circles' },
  lvjian2: { sourceId: 'EAGvHn4pAuM', columns: 'right', railRatio: .30, header: 'circle', heading: 'pill', accent: '#6e9e76', avatar: [116, 116], avatarShape: 'circle', sidebarModules: supplementary, density: 'standard', decor: 'circles' },
  shangwu: { sourceId: 'EAHUeh_csdU', columns: 'single', header: 'stacked', heading: 'ruled', accent: '#526f99', avatar: [118, 140], density: 'standard', decor: 'top-rule' },
  wenhe: { sourceId: 'EAHRMwhGdwo', columns: 'single', header: 'frame', heading: 'folded', accent: '#9b806b', avatar: [114, 136], density: 'standard', decor: 'outer-frame' },
} as const satisfies Record<string, ReferenceDesign>

export type ReferenceDesignId = keyof typeof REFERENCE_DESIGNS

/** Colour is deliberately excluded: colour changes do not create a new design. */
export function referenceStructureSignature(design: ReferenceDesign): string {
  return JSON.stringify([design.columns, design.railRatio, design.header, design.heading, design.avatar, design.avatarShape, design.sidebarModules, design.darkRail, design.decor, design.blockFlow])
}
