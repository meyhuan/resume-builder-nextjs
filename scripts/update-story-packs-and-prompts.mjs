import fs from 'fs'

const BASE_PROMPT_PREFIX = `Generate ONE standalone 3:4 portrait Xiaohongshu product note image, preferably 1080x1440 or higher 3:4. NOT a triptych, not a collage of multiple posters. The reference is the approved campaign STYLE: extract that refined warm ivory and sage editorial aesthetic into this single card. Warm ivory #F6F2E9, dark forest #293F36 headings, muted sage #53786C, pale green underline, subtle soft-focus leaf shadow at edges only, white resume paper, violet #7C3AED small brand footer. Oversized bold Chinese two-line headline at top, one line subtitle, dense beautifully arranged main product illustration filling lower 65%, professional readable Chinese, generous but purposeful gutters, no empty bottom. Preserve 蓝营 Lanying resume structure with sage theme: full-width 个人简历 header, portrait upper right, compact single column, rectangular bilingual section tabs and fine sage rules. All example resume text uses fictional 林知夏, 市场运营, 示例大学 新闻传播学 本科 2018.09–2022.06; 示例消费品牌 市场运营 2022.07–至今; 校园活动报名整理 活动协助 2024.03–2024.06; project description 整理活动报名信息，核对重复记录，汇总参与名单。 No invented scores, contact data, promises or numerical achievements. Accurate layout is more important than excessive tiny text: crop to relevant region and enlarge. Conceptually illustrated UI allowed, small caption 界面示意, never claim documentary screenshot. Brand controls remain violet, actual resume theme is sage. Strong editorial hierarchy, careful alignments, fine connector lines and dot callouts, subtle paper shadows, distinct composition per card. Footer 智简简历 · 产品示例 and 人物与经历为模拟数据. No QR, no website, no extraneous logo.`

export const PACK_DEFINITIONS = [
  {
    id: "01-mobile-template-a",
    platform: "mobile",
    feature: "templates",
    variant: "A",
    name: "手机模板 A",
    subtitle: "选个单页清爽模板，先看整体排版",
    titles: [
      "内容填好了\n版式不用从头做",
      "在手机预览里\n换个版式看效果",
      "模块分清楚\n重点经历先被看到"
    ],
    cards: [
      {
        subtitle: "选个单页清爽模板，先看整体排版",
        composition: "Large sage full resume left 65%, right two zoom detail cards with connector lines labelled 清晰的模块标题 and 规范的内容排版."
      },
      {
        subtitle: "一键套用，文字行距自动对齐",
        composition: "Mobile template picker labelled 调整样式, 模板 selected, sage 蓝营 visibly selected; right large same sage resume. Small instruction 选好模板，直接看完整单页预览."
      },
      {
        subtitle: "标题层级分明，阅读更轻松",
        composition: "Large resume left with 3 enlarged annotation crops right labelled 标题层级 正文密度 日期对齐."
      }
    ]
  },
  {
    id: "02-mobile-template-b",
    platform: "mobile",
    feature: "templates",
    variant: "B",
    name: "手机模板 B",
    subtitle: "先排好经历，再微调视觉风格",
    titles: [
      "同一个模板\n换个主色气质大不同",
      "选好版式后\n挑个顺眼的主题色",
      "全篇颜色统一\n排版细节再过一遍"
    ],
    cards: [
      {
        subtitle: "先排好经历，再微调视觉风格",
        composition: "Large sage resume with one violet alternate mini preview lower right. Main story same template can change primary color. Two enlargements of header and work section."
      },
      {
        subtitle: "墨绿/深灰/藏青，低调沉稳更耐看",
        composition: "Mobile style panel 外观 selected, 主题色 swatches violet navy sage burgundy charcoal, sage checked, fine line connects sage swatch to large sage resume header."
      },
      {
        subtitle: "深浅协调，重点突出不花哨",
        composition: "Large sage resume left, right 3 exact detail crops labelled 01 标题层级 02 正文密度 03 日期对齐."
      }
    ]
  },
  {
    id: "03-desktop-template-a",
    platform: "desktop",
    feature: "templates",
    variant: "A",
    name: "PC 模板 A",
    subtitle: "保留原有文字，一键套用单页排版",
    titles: [
      "告别混乱表格\n旧简历换个清爽版式",
      "电脑大屏对比\n切换模板直观预览",
      "换的是版面外壳\n核心还是经历提炼"
    ],
    cards: [
      {
        subtitle: "保留原有文字，一键套用单页排版",
        composition: "Desktop-oriented result: large sage resume center with smaller subdued same-content prior blue layout behind; two useful callouts 内容保留 and 版式更新."
      },
      {
        subtitle: "左侧编辑右侧出图，排版省心省力",
        composition: "Desktop editor UI focused crop: left large sage resume, right template sidebar 模板, grid with 蓝营 selected; no mobile device frame. Zoom chosen template."
      },
      {
        subtitle: "经历筛减下功夫，版式干净才加分",
        composition: "Large sage resume and enlarged project text proof, labels 版式清楚 内容准确. Note 换完模板，检查正文与分页."
      }
    ]
  },
  {
    id: "04-desktop-template-b",
    platform: "desktop",
    feature: "templates",
    variant: "B",
    name: "PC 模板 B",
    subtitle: "单栏清晰结构，适合绝大多数求职者",
    titles: [
      "简历模板怎么选？\n根据经历体量挑版式",
      "看完整大图预览\n比只盯缩略图靠谱",
      "选定模板后\n这三处细节必自查"
    ],
    cards: [
      {
        subtitle: "单栏清晰结构，适合绝大多数求职者",
        composition: "Main full sage resume with two precise magnified crops; deliberate asymmetry and compact comparison rail. Labels 先放内容 再看版式."
      },
      {
        subtitle: "文字密度与行距，一目了然看清楚",
        composition: "Desktop preview with template sidebar plus theme-color adjustment controls, sage selected. Main result enlarged, enough text to identify modules."
      },
      {
        subtitle: "标题层级 / 文字密度 / 日期格式对齐",
        composition: "Sage full resume left 60%, 3 right annotations 标题层级 正文密度 日期对齐. Tiny note 也可以调整模板主色."
      }
    ]
  },
  {
    id: "05-mobile-edit-a",
    platform: "mobile",
    feature: "editing",
    variant: "A",
    name: "手机编辑 A",
    subtitle: "按模块分别填写，思路不凌乱",
    titles: [
      "手机也能改简历\n先把核心经历理清楚",
      "项目经历分开填\n不用挤成一大长段",
      "填完自动排版\n排版整齐一览无余"
    ],
    cards: [
      {
        subtitle: "按模块分别填写，思路不凌乱",
        composition: "Mobile form left with 项目名称 校园活动报名整理, 项目角色 活动协助 and 项目描述; large sage resume right. Connector from form to project section."
      },
      {
        subtitle: "项目名称/角色/时间/描述逐项录入",
        composition: "Enlarged mobile experience form cards 项目名称, 项目角色, 开始时间 2024.03, 结束时间 2024.06, 项目描述. Large readable text, a small sage final resume only as context."
      },
      {
        subtitle: "手机预览直出，格式自动规整",
        composition: "Sage resume large with magnified 项目经历 section and precise connector. Full supplied project description, label 填写内容 → 自动排版预览."
      }
    ]
  },
  {
    id: "06-mobile-edit-b",
    platform: "mobile",
    feature: "editing",
    variant: "B",
    name: "手机编辑 B",
    subtitle: "随写随看，排版舒心不焦虑",
    titles: [
      "每填完一段经历\n退出来看一眼效果",
      "发现描述太啰嗦\n随时点进模块精简",
      "全部内容整理完\n投递前全屏自查"
    ],
    cards: [
      {
        subtitle: "随写随看，排版舒心不焦虑",
        composition: "Large readable project form foreground and sage full page behind; exact same project data. Two labels 先写一段 再看效果."
      },
      {
        subtitle: "针对性修改，逐段打磨求职亮点",
        composition: "Large mobile project editing panel with existing exact data; annotate 名称 角色 日期 描述. Sage resume crop lower right."
      },
      {
        subtitle: "核对错别字、项目时间和分页",
        composition: "Sage whole resume plus two enlarged section crops. Editorial checking strip 日期 / 错字 / 分页; no fabricated fixes."
      }
    ]
  },
  {
    id: "07-desktop-edit-a",
    platform: "desktop",
    feature: "editing",
    variant: "A",
    name: "PC 编辑 A",
    subtitle: "所见即所得，改字同时看排版",
    titles: [
      "告别表单跳转\n直接在简历画布上改",
      "点到哪段改哪段\n像在白纸上排版一样顺",
      "文字改完通读\n重点检查分页与行距"
    ],
    cards: [
      {
        subtitle: "所见即所得，改字同时看排版",
        composition: "Large sage resume as editable desktop canvas, project text area outlined violet and small cursor icon. Inset exact text. Label 在简历画面上编辑."
      },
      {
        subtitle: "光标所至即修改，省去来回保存刷新",
        composition: "Enlarge desktop resume project section, thin dotted editing boundary and caret next to exact project text; small toolbar no unsupported features. Main content not form, direct editing."
      },
      {
        subtitle: "确保单页饱满不溢出，阅读更舒服",
        composition: "Large full sage resume with detail crops and annotations 正文内容 日期 分页. Small note 内容改完，再看整页."
      }
    ]
  },
  {
    id: "08-desktop-edit-b",
    platform: "desktop",
    feature: "editing",
    variant: "B",
    name: "PC 编辑 B",
    subtitle: "因岗调整重点，核心亮点往前放",
    titles: [
      "想让HR先看什么？\n把核心亮点往前移",
      "鼠标直接拖拽\n模块顺序一秒调整",
      "结合投递岗位排顺序\n让匹配度第一眼显现"
    ],
    cards: [
      {
        subtitle: "因岗调整重点，核心亮点往前放",
        composition: "Large sage resume showing 项目经历 moved before 教育经历 and 工作经历; sidebar miniature module-order list with drag handles and project at top. Note 按投递岗位调整重点."
      },
      {
        subtitle: "无需重写剪切，整块拖动自由排序",
        composition: "Large desktop 模块管理 panel: 项目经历 at top, then 教育经历, 工作经历, 相关技能, 自我评价; clear drag handle icon, small reorder arrow. Same sage resume right."
      },
      {
        subtitle: "有针对性地展示经历，提升面试几率",
        composition: "Large correctly reordered sage resume: 项目经历 first after header, then education/work. Magnified project section and note 真实经历优先，顺序结合岗位."
      }
    ]
  },
  {
    id: "09-mobile-ai-a",
    platform: "mobile",
    feature: "ai-polish",
    variant: "A",
    name: "手机 AI A",
    subtitle: "从大白话到职业化描述，给表达新思路",
    titles: [
      "做过的事像流水账？\n换种表达更显干练",
      "基于真实经历润色\n把口水话提炼成动作",
      "AI 建议仅作参考\n挑选合适语气再采纳"
    ],
    cards: [
      {
        subtitle: "从大白话到职业化描述，给表达新思路",
        composition: "Mobile AI polish card showing input paragraph and suggestions; clear contrast between raw description and clean bullet points. Sage accent. Footer additionally 文案示例，非实测 AI 输出."
      },
      {
        subtitle: "拆解任务、行动与结果，表述更有条理",
        composition: "Mobile UI highlighting action verbs and structure; project title 校园活动报名整理 with AI-refined bullets. Sage template background. Footer additionally 文案示例，非实测 AI 输出."
      },
      {
        subtitle: "没做过的事坚决不加，事实自己核实",
        composition: "Large comparison of exact original and rewritten text, sage project section matches rewrite. Labels 核对事实 保留自己的语气. Note AI 建议不等于最终稿. Footer additionally 文案示例，非实测 AI 输出."
      }
    ]
  },
  {
    id: "10-mobile-ai-b",
    platform: "mobile",
    feature: "ai-polish",
    variant: "B",
    name: "手机 AI B",
    subtitle: "拒绝空洞大话，用具体动作讲清职责",
    titles: [
      "想把经历写出亮点？\n先弄清实际做了什么",
      "对照润色建议\n保留真实数据与过程",
      "留下准确描述\n改成自己面试能讲清的话"
    ],
    cards: [
      {
        subtitle: "拒绝空洞大话，用具体动作讲清职责",
        composition: "Original text 整理活动报名信息，核对重复记录，汇总参与名单。 compared with 核对后示例 协助整理活动报名信息，检查重复报名，并汇总参与名单。 Sage resume accent. Footer additionally 文案示例，非实测 AI 输出."
      },
      {
        subtitle: "把宽泛形容词换成实在的执行细节",
        composition: "Mobile 项目描述 with 整理活动报名信息，核对重复记录，汇总参与名单。 and AI 智能润色 controls 基础纠错 专业表达; three annotation words 任务 动作 交付物. Footer additionally 文案示例，非实测 AI 输出."
      },
      {
        subtitle: "确保每一条都能在面试时自信阐述",
        composition: "Large 核对后示例 协助整理活动报名信息，检查重复报名，并汇总参与名单。 plus sage resume project crop displaying identical text, three check labels 事实准确 职责范围 自己的语气. Footer additionally 文案示例，非实测 AI 输出."
      }
    ]
  },
  {
    id: "11-desktop-ai-a",
    platform: "desktop",
    feature: "ai-polish",
    variant: "A",
    name: "PC AI A",
    subtitle: "用“动作+情境+结果”重构项目描述",
    titles: [
      "经历写得太散？\n理清动词与量化成果",
      "左右双栏对照\n逐句查看改写建议",
      "表达可以更专业\n但经历坚决不编造"
    ],
    cards: [
      {
        subtitle: "用“动作+情境+结果”重构项目描述",
        composition: "Desktop story with 2 large text cards 原文 帮忙整理报名表，检查重复的人，再做名单。 润色示例 整理活动报名信息，核对重复记录，汇总参与名单。 Sage resume small inset. Footer additionally 文案示例，非实测 AI 输出."
      },
      {
        subtitle: "原话与建议清晰对照，好在何处一眼即知",
        composition: "Desktop AI comparison panel enlarged with 原文 and 润色建议 showing exact before/after sentences, sage resume canvas context. No scores, no progress metrics. Footer additionally 文案示例，非实测 AI 输出."
      },
      {
        subtitle: "不加没做过的事情，诚实是求职第一底线",
        composition: "Large sage project section with rewrite 整理活动报名信息，核对重复记录，汇总参与名单。 annotations 动作更清楚 事实不增加; clear rule 不增加没有做过的经历. Footer additionally 文案示例，非实测 AI 输出."
      }
    ]
  },
  {
    id: "12-desktop-ai-b",
    platform: "desktop",
    feature: "ai-polish",
    variant: "B",
    name: "PC AI B",
    subtitle: "机器给的是句式参考，事实还得靠自己",
    titles: [
      "AI 润色改完后\n千万不要无脑全盘照搬",
      "逐字对比改动处\n筛出真正贴合的词句",
      "投递前必查三件事\n事实/数据/问心无愧"
    ],
    cards: [
      {
        subtitle: "机器给的是句式参考，事实还得靠自己",
        composition: "Desktop AI suggestions two text cards foreground, sage resume behind. Exact colloquial original and polished rewrite as in supplied content; label 对照原文. Footer additionally 文案示例，非实测 AI 输出."
      },
      {
        subtitle: "保留个人真实语气，删去夸张修饰",
        composition: "Enlarged text comparison: 原文 帮忙整理报名表，检查重复的人，再做名单。 建议示例 整理活动报名信息，核对重复记录，汇总参与名单。 Highlight changed words sage; no stats. Footer additionally 文案示例，非实测 AI 输出."
      },
      {
        subtitle: "时间线准不准？数据实不实？细节讲得清吗？",
        composition: "3 prominent check cards 事实准确 职责范围 自己的语气, large sage project crop with 协助整理活动报名信息，核对重复记录，汇总参与名单。 Label 核对后示例. Footer additionally 文案示例，非实测 AI 输出."
      }
    ]
  }
]

// 1. Build docs/xhs-story-sage-prompts.json
const sagePromptsData = {
  generator: "built-in image_gen",
  reference: "C:\\Users\\62765\\.codex\\generated_images\\01a14e90-5cf0-7dd1-b966-e7e1c20a7395\\exec-e578fa34-8039-49de-8f19-c32691538548.png",
  packs: PACK_DEFINITIONS.map(p => ({
    id: p.id,
    platform: p.platform,
    feature: p.feature,
    variant: p.variant,
    name: p.name,
    titles: p.titles,
    subtitle: p.subtitle,
  })),
  images: PACK_DEFINITIONS.flatMap(p => {
    return p.cards.map((card, idx) => {
      const cardNum = idx + 1
      const headline = p.titles[idx]
      const prompt = `${BASE_PROMPT_PREFIX}  Platform ${p.platform}, feature ${p.feature}, variant ${p.variant}, card ${cardNum}/3. Exact headline with linebreak: "${headline.replace(/\n/g, '\\n')}". Subtitle: "${card.subtitle}". Composition: ${card.composition}`
      return {
        id: `${p.id}-${cardNum}`,
        prompt,
      }
    })
  })
}

fs.writeFileSync('docs/xhs-story-sage-prompts.json', JSON.stringify(sagePromptsData, null, 2), 'utf8')
console.log('Updated docs/xhs-story-sage-prompts.json successfully!')

// 2. Build src/lib/xhs-note/story-packs.json
const storyPacksData = PACK_DEFINITIONS.map(p => ({
  id: p.id,
  platform: p.platform,
  feature: p.feature,
  variant: p.variant,
  name: p.name,
  titles: p.titles,
  subtitle: p.subtitle,
}))

fs.writeFileSync('src/lib/xhs-note/story-packs.json', JSON.stringify(storyPacksData, null, 2), 'utf8')
console.log('Updated src/lib/xhs-note/story-packs.json successfully!')
