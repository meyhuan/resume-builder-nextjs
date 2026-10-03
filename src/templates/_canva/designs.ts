import type { ModuleKey } from '@/entities/module/module-config'

/** Measured from the archived 1131 × 1600 Canva pages; A4 preview is 794 px wide.
 * These are layout recipes, not applicant data. Never put example facts here. */
export interface ReferenceDesign {
  readonly sourceId: string
  readonly columns: 'single' | 'left' | 'right' | 'split'
  readonly railRatio?: number
  readonly header: 'inline' | 'ruled' | 'rail' | 'mint' | 'circle' | 'segmented' | 'notched' | 'dots' | 'frame' | 'bookmark' | 'vertical' | 'collage' | 'compact' | 'split' | 'banner' | 'angled' | 'rail-document' | 'centered' | 'stacked'
  readonly heading: 'dotted' | 'ruled' | 'hexagon' | 'square' | 'pill' | 'folded' | 'slant' | 'solid-icon' | 'plane' | 'flag' | 'bubble' | 'tape' | 'tab' | 'triangle' | 'outline-icon' | 'two-tone' | 'capsule' | 'flat' | 'caps-rule' | 'rounded-bar' | 'arrow' | 'bullet' | 'thin'
  readonly accent: string
  readonly avatar: readonly [number, number]
  readonly avatarShape?: 'circle' | 'rounded' | 'polaroid'
  readonly sidebarModules?: readonly ModuleKey[]
  readonly darkRail?: boolean
  readonly density: 'standard' | 'compact'
  readonly blockFlow?: 'date-track' | 'ledger'
  readonly decor?: 'edge-bands' | 'circles' | 'outer-frame' | 'spine' | 'paper' | 'beige-circles'
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
} as const satisfies Record<string, ReferenceDesign>

export type ReferenceDesignId = keyof typeof REFERENCE_DESIGNS

/** Colour is deliberately excluded: colour changes do not create a new design. */
export function referenceStructureSignature(design: ReferenceDesign): string {
  return JSON.stringify([design.columns, design.railRatio, design.header, design.heading, design.avatar, design.avatarShape, design.sidebarModules, design.darkRail, design.decor, design.blockFlow])
}
