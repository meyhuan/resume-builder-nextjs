export type XhsLayoutVariant = 'paper-annot' | 'memo-grid' | 'split-table'

export interface XhsPersona {
  readonly id: string
  readonly name: string
  readonly toneDescription: string
  readonly structureGuide: string
  readonly exampleHooks: readonly string[]
}

export const XHS_LAYOUT_VARIANTS: readonly XhsLayoutVariant[] = [
  'paper-annot',
  'memo-grid',
  'split-table',
]

export const XHS_PERSONAS: readonly XhsPersona[] = [
  {
    id: 'memo-list',
    name: '备忘录干货清单流',
    toneDescription: '干练、克制、条理极强，像在分享手机备忘录里自用的改简历复盘',
    structureGuide: '第一行直切痛点场景；中间分 1/2/3 序号清单拆解动词和排版改法；结尾克制带出工具',
    exampleHooks: [
      '改了三版简历后，我把求职顾问教我的动词套路整理成了这份清单。',
      '准备投递前翻备忘录，把之前踩坑的几处表述重新顺了一遍。',
    ],
  },
  {
    id: 'senior-sister',
    name: '热心学姐/学长手把手流',
    toneDescription: '真诚、耐心、有同理心，像给同专业学弟学妹传授改简历秘诀',
    structureGuide: '开头用第一人称共情求职焦虑；中间像圈画重点一样做「改前 vs 改后」对比；结尾分享自用效率神器',
    exampleHooks: [
      '刷到很多同学简历还在通篇写“负责/协助”，忍不住把改写前后的细节拆出来给你们看。',
      '作为刚上岸/转岗过来的人，太懂一份版面清爽的简历能给面试官省多少时间了。',
    ],
  },
  {
    id: 'minimalist-geek',
    name: '极简效率控流',
    toneDescription: '追求极致清爽、厌恶冗长空话和花哨排版，说话直击核心',
    structureGuide: '开头吐槽花哨模板和空洞自评；中间亮出一页纸版面原则与动作拆解；结尾强调一页纸自适应导出',
    exampleHooks: [
      '求求大家别再用双栏大色块模板了，重要的项目经历全被挤到了第二页。',
      '把简历从流水账精简到刚好一页纸，关键就在这几个关键动词的提炼。',
    ],
  },
  {
    id: 'late-night-fixer',
    name: '深夜改稿逆袭流',
    toneDescription: '场景感强、真实生动，展现打工人/毕业生在特定情境下的专注与蜕变',
    structureGuide: '开头描摹赶在投递截止前的紧急场景；中间讲述梳理出核心交付物后的豁然开朗；结尾赞叹效率提升',
    exampleHooks: [
      '晚上临时看到心动岗位的补招，花半小时把这两年的零散经历重新提炼了一遍。',
      '面对空白文档卡壳了一下午，先顺着标准模块搭好骨架才终于写出了初稿。',
    ],
  },
  {
    id: 'hr-perspective',
    name: '换位思考避坑流',
    toneDescription: '专业、沉着，站在筛选简历视角解析“什么才是有效经历”',
    structureGuide: '开头指出 10 秒扫视中最容易被忽略的硬伤；中间对比空洞职责与量化交付；结尾自查核对',
    exampleHooks: [
      '很多人海投没回音，可能不是经历不够，而是前三行没有让对方看到匹配的能力词。',
      '发送 PDF 之前，多花两分钟核对这 4 个细节，能避开大部分无效投递。',
    ],
  },
  {
    id: 'formula-copier',
    name: '万能句式抄作业流',
    toneDescription: '保姆级、模块化、强操作性，读者看完就能直接照猫画虎修改',
    structureGuide: '直接亮出同岗位可套用的「动词 + 业务对象 + 交付成果」句式公式，再结合真实经历举例演示',
    exampleHooks: [
      '写经历卡壳的朋友，直接套用这套改写公式，把干巴巴的日常写成交付成果。',
      '与其纠结怎么编华丽形容词，不如按这个结构把做过的事拆明白。',
    ],
  },
]

export function pickPersona(seed: string): XhsPersona {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % XHS_PERSONAS.length
  return XHS_PERSONAS[index]
}

export function pickLayoutVariant(seed: string): XhsLayoutVariant {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 3) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % XHS_LAYOUT_VARIANTS.length
  return XHS_LAYOUT_VARIANTS[index]
}
