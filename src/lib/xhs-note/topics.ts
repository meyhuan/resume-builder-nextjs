export type XhsTopicCategory = 'tool' | 'practice' | 'story'

export interface XhsTopicVisualConfig {
  readonly card2Title: string
  readonly card2Sub: string
  readonly card2Badge: string
  readonly card3Title: string
  readonly card3Sub: string
  readonly card3Cta: string
}

export interface XhsTopic {
  readonly key: string
  readonly category: XhsTopicCategory
  readonly name: string
  readonly tagLabel: string
  readonly exampleTitle: string
  readonly hint: string
  readonly recommended: boolean
  readonly icon: string
  readonly storyHook: string
  readonly featureFact: string
  readonly previewBad: string
  readonly previewGood: string
  readonly visuals?: XhsTopicVisualConfig
}

export interface XhsCategoryTab {
  readonly key: XhsTopicCategory
  readonly label: string
  readonly desc: string
}

export interface XhsPainPoint {
  readonly key: string
  readonly label: string
  readonly promptHint: string
}

export const XHS_CATEGORIES: readonly XhsCategoryTab[] = [
  { key: 'tool', label: '工具与模板', desc: '模板、导入、导出、初稿与双端协同' },
  { key: 'practice', label: '改写实操', desc: '告别流水账、岗位词对齐、一页纸排版' },
  { key: 'story', label: '求职故事', desc: '应届、转岗、跳槽与投递前自查' },
]

export const XHS_TOPICS: readonly XhsTopic[] = [
  // ==================== 第一类：工具与效率种草 (5个) ====================
  {
    key: 'template-share',
    category: 'tool',
    name: '清爽一页纸模板分享',
    tagLabel: '一页版式',
    exampleTitle: '改了3版终于定稿！我的清爽单页模板',
    hint: '告别花哨色块，分区清楚、中文行距舒服',
    recommended: true,
    icon: '📄',
    storyHook: '之前试过花里胡哨的彩色表格模板，重点全被淹没，换了极简白底单页版式后看着清爽多了',
    featureFact: '智简简历提供适合中文求职的极简白底单页模板，模块分区清晰，行距与留白易读，不晒个人隐私',
    previewBad: '花哨双栏色块模板，占掉三分之一页面空间',
    previewGood: '极简白底单栏结构，教育与经历重点一眼扫清',
    visuals: {
      card2Title: '单页模板要点',
      card2Sub: '好的版式让 HR 10 秒抓住重点',
      card2Badge: '排版细节',
      card3Title: '挑选模板自查',
      card3Sub: '选对版式，投递前最后核对',
      card3Cta: '在「智简简历」获取同款极简单页模板',
    },
  },
  {
    key: 'pdf-import',
    category: 'tool',
    name: '旧 PDF 简历一键导入',
    tagLabel: '免手敲',
    exampleTitle: '原来旧PDF简历能直接导入改排版',
    hint: '上传旧 PDF/Word 自动拆成模块，不用从头手打',
    recommended: true,
    icon: '📥',
    storyHook: '翻出以前的旧 PDF 简历准备更新，本来以为要对着敲一晚上，结果直接上传就拆好了模块',
    featureFact: '支持上传旧 PDF、Word 或图片简历，自动解析拆分到对应模块后直接在线修改内容和换模板',
    previewBad: '对着旧 PDF 一段段复制粘贴，格式全乱还要重调',
    previewGood: '上传旧简历自动拆分教育与项目模块，直接在线改字',
    visuals: {
      card2Title: '旧简历导入前后',
      card2Sub: '从杂乱旧版到结构化新模块',
      card2Badge: '导入体验',
      card3Title: '导入后核对清单',
      card3Sub: '解析完成后检查这几项',
      card3Cta: '在「智简简历」一键上传旧简历解析',
    },
  },
  {
    key: 'clean-export',
    category: 'tool',
    name: '干净无水印 PDF 导出体验',
    tagLabel: '高清导出',
    exampleTitle: '终于找到导出干净不折腾的简历工具',
    hint: '免费额度内直接导高清无水印 PDF，排版不乱码',
    recommended: false,
    icon: '✨',
    storyHook: '最怕花半小时排好版，导出后的 PDF 字体错位或者带着大水印，临近投递真的很耽误事',
    featureFact: '支持在免费额度内导出高清无水印 PDF（也支持免费导出 Markdown），导出排版与预览保持一致',
    previewBad: '网页看着正常，导出成文件后行距错位、字号忽大忽小',
    previewGood: '所见即所得导出标准 A4 高清无水印 PDF，直接拿去投递',
    visuals: {
      card2Title: '导出效果对比',
      card2Sub: '避开错位与水印，保证投递品质',
      card2Badge: '导出排查',
      card3Title: 'PDF 导出前核验',
      card3Sub: '发送前务必按项核对',
      card3Cta: '在「智简简历」免费导出高清无水印 PDF',
    },
  },
  {
    key: 'first-draft',
    category: 'tool',
    name: '快速搭出第一版简历初稿',
    tagLabel: '告别空白页',
    exampleTitle: '对着空白文档发呆？我这样搭出初稿',
    hint: '先搭好岗位标准模块框架，再顺着填自己的细节',
    recommended: false,
    icon: '⚡',
    storyHook: '刚开始写简历时对着空白文档发呆，第一行都不知道写什么，先把标准框架搭出来就顺畅多了',
    featureFact: '可根据目标岗位先生成结构化的简历初稿框架，再由用户结合真实经历补充和修改细节',
    previewBad: '对着空白文档纠结格式和顺序，两小时写不出一段话',
    previewGood: '先搭好岗位标准结构与模块，再顺着填入自己的真实项目',
    visuals: {
      card2Title: '从空白到初稿',
      card2Sub: '先搭骨架，再填真实细节',
      card2Badge: '初稿思路',
      card3Title: '初稿完善清单',
      card3Sub: '框架搭好后逐项填充',
      card3Cta: '在「智简简历」快速生成岗位简历框架',
    },
  },
  {
    key: 'cross-device',
    category: 'tool',
    name: '手机随手记 + 电脑大屏精修',
    tagLabel: '双端同步',
    exampleTitle: '通勤用手机记灵感，回家电脑调排版',
    hint: '小程序随时改草稿，电脑网页端大屏调整细节',
    recommended: false,
    icon: '💻',
    storyHook: '白天突然想起一个项目细节，身边没电脑，先在手机小程序里记下来，晚上回电脑端调版式导出',
    featureFact: '微信小程序可随时查看和轻量修改简历，电脑网页版（aijianli.cn）支持完整大屏编辑与排版同步',
    previewBad: '手机备忘录记一堆零散句子，回电脑还要重新整理搬运',
    previewGood: '小程序随手改经历草稿，电脑打开直接同步精修导出',
    visuals: {
      card2Title: '双端协作方式',
      card2Sub: '移动端记灵感，桌面端把控全局',
      card2Badge: '协同体验',
      card3Title: '大屏导出自查',
      card3Sub: '在电脑端做最终版式确认',
      card3Cta: '小程序随手记，电脑登录 aijianli.cn 精修',
    },
  },

  // ==================== 第二类：改简历实操体验 (3个) ====================
  {
    key: 'before-after',
    category: 'practice',
    name: '我用 AI 把简历从流水账改清楚',
    tagLabel: '前后反差',
    exampleTitle: '简历只会写负责？改成这句清楚多了',
    hint: '对比原句与改写后动作，把“负责/参与”换成具体交付',
    recommended: true,
    icon: '✨',
    storyHook: '写完初稿发现满屏都是“负责、参与、协助”，读起来像岗位职责说明书，改完动词后扎实多了',
    featureFact: 'AI 润色基于用户已有经历做措辞梳理，将笼统的“负责/参与”替换为「具体动作 + 业务对象 + 交付物」，不编造事实',
    previewBad: '负责活动社群日常运营与用户答疑工作',
    previewGood: '搭建社群排期与常见问题话术库，独立承接日常促活闭环',
    visuals: {
      card2Title: '经历措辞改写对照',
      card2Sub: '把空泛职责升级为真实交付',
      card2Badge: '动词替换',
      card3Title: '经历段落自查',
      card3Sub: '每一段都按这 4 点过一遍',
      card3Cta: '在「智简简历」一键润色简历经历措辞',
    },
  },
  {
    key: 'jd-align',
    category: 'practice',
    name: '投递前对照 JD 查漏补缺',
    tagLabel: '岗位对齐',
    exampleTitle: '海投没回音？先对照JD看缺了哪些词',
    hint: '把岗位描述拆开看，检查经历里有没有漏掉关键能力词',
    recommended: false,
    icon: '🎯',
    storyHook: '之前一份通用简历到处投没什么回音，后来每次投递前先把岗位 JD 里的核心词挑出来核对一遍',
    featureFact: '电脑端支持粘贴目标岗位描述（JD），检查简历中缺失的关键词与能力项（仅作覆盖参考，不代表录用概率）',
    previewBad: '一份通用简历投所有岗位，核心技能词跟招聘要求对不上',
    previewGood: '对照岗位要求梳理高频能力词，把匹配的真实经历往前放',
    visuals: {
      card2Title: 'JD 核心能力匹配',
      card2Sub: '让简历经历紧贴招聘诉求',
      card2Badge: '关键词对齐',
      card3Title: '投递前对齐清单',
      card3Sub: '投递前花 2 分钟核对这 4 点',
      card3Cta: '在电脑端「智简简历」粘贴 JD 进行对齐分析',
    },
  },
  {
    key: 'one-page-fit',
    category: 'practice',
    name: '尴尬的一页半怎么收进一页纸',
    tagLabel: '一页纸控制',
    exampleTitle: '简历超出一页四五行？我这样收进一页',
    hint: '删掉空洞自评、合并同类项、换紧凑模板刚好一页',
    recommended: false,
    icon: '📐',
    storyHook: '最尴尬的就是简历刚好超出一页纸四五行，删经历觉得可惜，不删又显得第二页空荡荡',
    featureFact: '编辑器会在内容超出一页时给出提示，支持切换紧凑型单页模板或精简冗余句子，保持一页纸干净呈现',
    previewBad: '超出一页纸只多出五六行字，第二页大片空白很尴尬',
    previewGood: '精简空洞形容词并切换紧凑单页版式，重点全留在一页内',
    visuals: {
      card2Title: '一页纸压缩技巧',
      card2Sub: '精简水分，把版面留给关键成果',
      card2Badge: '排版压缩',
      card3Title: '一页纸自检步骤',
      card3Sub: '排版溢出时的排查顺序',
      card3Cta: '在「智简简历」切换紧凑模板自适应一页纸',
    },
  },

  // ==================== 第三类：人群共鸣故事 (4个) ====================
  {
    key: 'pitfalls',
    category: 'story',
    name: '应届生没大厂实习怎么写简历',
    tagLabel: '应届破局',
    exampleTitle: '没大厂实习，应届生怎么把经历写扎实',
    hint: '把课程设计、校园项目按「背景-动作-交付」拆清楚',
    recommended: true,
    icon: '🎓',
    storyHook: '作为应届生手里没有大厂实习，一开始觉得简历空荡荡没东西可写，后来把课程项目拆开写清楚了',
    featureFact: '支持针对校园经历与课程项目进行结构化梳理，按「项目背景 + 独立承担模块 + 具体交付物」呈现做事规范度',
    previewBad: '参与数据库课程设计，和小组成员一起完成系统开发',
    previewGood: '独立负责课程系统检索模块设计，完成接口联调与测试报告',
    visuals: {
      card2Title: '校园/课程项目拆解',
      card2Sub: '没实习也能把做事规范度写清楚',
      card2Badge: '应届示范',
      card3Title: '应届生自查清单',
      card3Sub: '初入职场简历避坑指南',
      card3Cta: '在「智简简历」使用应届生专属单页模板',
    },
  },
  {
    key: 'career-switch',
    category: 'story',
    name: '跨专业 / 转岗简历怎么重构',
    tagLabel: '跨行转岗',
    exampleTitle: '跨专业找工作，我是这样重排简历模块的',
    hint: '弱化无关杂活，把可迁移的通用能力往前放',
    recommended: false,
    icon: '🔄',
    storyHook: '准备跨方向投递时，发现以前的经历写得太偏原专业了，重新提炼了通用能力并调整了模块顺序',
    featureFact: '支持自由拖拽调整简历模块顺序，并针对目标岗位方向润色可迁移的项目经验与技能描述',
    previewBad: '按时间流水账堆砌原专业杂事，看不出与新岗位的关联',
    previewGood: '将匹配的专项项目置顶，提炼数据分析、沟通推进等通用交付',
    visuals: {
      card2Title: '可迁移能力提炼',
      card2Sub: '把原专业经历对准新岗位要求',
      card2Badge: '转岗重构',
      card3Title: '转岗简历核对',
      card3Sub: '跨方向投递前逐项确认',
      card3Cta: '在「智简简历」自由拖拽调整简历模块与排版',
    },
  },
  {
    key: 'job-hop-night',
    category: 'story',
    name: '在职看机会，下班花半小时更新简历',
    tagLabel: '在职更新',
    exampleTitle: '在职看机会，下班后快速把这两年经历理顺',
    hint: '不用大动干戈，先把零散日常工作整理成交付清单',
    recommended: false,
    icon: '🌙',
    storyHook: '工作一两年没动过简历，突然看到合适的机会，晚上回家趁热把这两年做过的项目梳理成了一份新简历',
    featureFact: '在原有简历基础上快速新增模块与润色要点，省去调格式时间，专注梳理核心业务成果',
    previewBad: '两年没更新简历，临时抱佛脚只写得出几句部门日常职责',
    previewGood: '按阶段归类近两年的关键项目，快速理出清晰的个人产出清单',
    visuals: {
      card2Title: '在职经历速理要点',
      card2Sub: '下班高效理顺这两年核心产出',
      card2Badge: '成果清单',
      card3Title: '跳槽简历快检',
      card3Sub: '投出前核对这 4 个职场关键项',
      card3Cta: '在「智简简历」快速更新在职工作经历',
    },
  },
  {
    key: 'hr-view',
    category: 'story',
    name: '投递前最后 5 分钟自查清单',
    tagLabel: '投递自查',
    exampleTitle: '每次点发送简历前，我会先核对这 4 件事',
    hint: '检查文件名、首屏前三行重点、联系方式和一页留白',
    recommended: false,
    icon: '👀',
    storyHook: '以前急着投简历，发出去才发现文件名还是“新建简历(2).pdf”，现在每次导出前都会按清单核对一遍',
    featureFact: '导出前可在线预览完整 A4 页面效果，核对求职意向、模块排布与文件命名后再导出投递',
    previewBad: '文件名写着“简历最终版2.pdf”，首屏全是空洞自我评价',
    previewGood: '规范命名“岗位-姓名”，首屏前三行直接亮出核心匹配经历',
    visuals: {
      card2Title: '易被忽略的失分点',
      card2Sub: '细节定成败，别在临门一脚丢分',
      card2Badge: '自查对比',
      card3Title: '投递前 5 分钟清单',
      card3Sub: '点击发送前必过的 4 道门槛',
      card3Cta: '在「智简简历」完成在线预览与标准导出',
    },
  },
]

export const XHS_PAIN_POINTS: readonly XhsPainPoint[] = [
  { key: 'fresh-grad', label: '应届春招 / 秋招投递', promptHint: '当前处于应届求职阶段，正在准备秋招/春招简历投递' },
  { key: 'job-switch', label: '在职看机会更新简历', promptHint: '工作后准备看新机会，利用业余时间重新梳理过往经历' },
  { key: 'cross-field', label: '跨专业 / 转岗投递', promptHint: '正在尝试跨方向投递，重点把过往经历往目标岗位要求上靠拢' },
  { key: 'urgent-fix', label: '改了好几版终于定稿', promptHint: '之前改了好几版都不满意，这次终于把格式和措辞理顺定稿了' },
]

export const BRAND_TAGS = ['智简简历', '简历模板', '求职'] as const

export function findTopic(key: string): XhsTopic | undefined {
  return XHS_TOPICS.find((topic) => topic.key === key)
}
