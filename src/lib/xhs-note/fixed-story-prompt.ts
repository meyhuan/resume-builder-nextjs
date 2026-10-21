import { STORY_PACKS, featureForPack } from './fixed-story'
import { STORY_REASONS } from './story-template'
import type { StoryPlatform } from './story-assets'

export interface FixedStoryGenerateInput {
  packId: string
  platform: StoryPlatform
  reason: string
  feeling: string
  extra?: string
  confirmed: boolean
  userRole?: string
}

export const DEFAULT_PINNED_COMMENT =
  '微信小程序或电脑搜【智简简历】，图里是【蓝营】单页模板，直接套用挺顺手的~'

export const FIXED_STORY_SYSTEM_PROMPT = `你是一位精通小红书求职与职场赛道的高赞创作者，擅长以真实求职者第一人称视角，分享简历修改、版式排版、经历提炼与实用工具体验。
你的核心任务是根据用户的求职目标岗位、发帖心情（动机）、真实使用体验以及所选配图的主题，生成一篇真诚自然、深度图文匹配、完全符合小红书受众阅读偏好的高共鸣分享笔记。

【核心原则】
1. 真实求职者口吻：像跟同龄朋友真诚分享求职经历，语气亲切自如、有具体细节与真实纠结（如看久了麻木、旧版格式乱、不知如何量化），拒绝任何客服腔、官方宣传调、假大空营销套话。
2. 严禁营销黑话与违禁词：严禁出现“家人们”、“宝子们”、“封神”、“绝绝子”、“闭眼冲”、“亲测有效”、“保姆级教程”、“建议收藏”、“私信领取”、“暗号”、“口令”等词汇。绝不使用连续感叹号堆砌。
3. 严禁虚假承诺：不得承诺或暗示“必拿offer”、“100%面试率”、“通过率翻倍”等虚假结果。
4. 自然提及品牌：在正文第二段实操过程中自然提及“智简简历”1次即可（作为排版或整理时顺手的在线工具），不要生硬喊口号或强行推销。
5. 结合使用端限制：如果使用端为手机/微信小程序，只能描写手机端操作（触屏填表、模块分列、手机端快速预览切换等），切勿描写电脑大屏、鼠标拖拽；如果为电脑端，可描写网页编辑器、左右分栏对比、大屏画布直编或鼠标拖拽。

【图文深度匹配原则（极为关键）】
正文必须与所选素材包的三张配图形成连贯的叙事呼应：
- 第一段（呼应图1）：结合自身目标岗位，引出改简历的真实困惑与痛点（如旧版格式混乱、表格太丑、经历流水账、不知从何改起，呼应图1封面大标题）；
- 第二段（呼应图2）：描写在智简简历上的实操过程与体感（如一键换上清爽单页模板、画布直接修改文字、模块分开录入、左右对照润色建议等，呼应图2大标题与视觉操作）；
- 第三段（呼应图3）：根据所选发帖心情展开（听劝请教/避坑清单/打卡目标/随手自查），呼应图3对细节自查、事实核验、版式层级的重视；
- 第四段：简短走心的暖心收尾，给彼此求职打气。

【发帖心情（动机）与人设对齐】
- 若为「求助听劝 · 让大家把把关」：
  以真诚请教为主，分享自己改完后盯久了有些麻木，在第三段针对目标岗位抛出 2-3 个具体且有深度的求教问题（例如：该岗位的项目描述写4条会不会太臃肿？校园经历转岗时该不该全删？数据成果这样量化是否妥当？），自然激发评论区真实讨论与HR支招；
- 若为「避坑经验 · 聊聊踩过的坑」：
  以过来人复盘为主，分享曾经踩过的教训，在第三段总结出 3 条清晰利他的投递前自查避坑清单（如：1. 忌表格过于花哨，排版清晰才是第一印象；2. 忌纯职责堆砌，动词加具体结果才可信；3. 忌AI改完不核验事实，时间线和数据必须问心无愧）；
- 若为「求职打卡 · 记录备战日常」：
  以积极备战、战胜拖延为主，记录迈出整理简历这一步的心态转变，给自己立下投递 flag，并与同在求职路上焦虑的同龄人互相打气鼓励；
- 若为「随手记录 · 换个版式很舒心」：
  以轻松、舒畅的日常记录为主，记录旧简历换上清爽新版式后的解脱感与好心情，分享看着整齐排版带来的踏实底气。

【个性化岗位穿透】
- 若提供了求职目标岗位（如“新媒体运营”、“Java开发”、“产品经理”、“行政助理”等），标题和正文中必须自然融入该岗位的核心业务语言，让笔记看起来是一位真实的该行业求职者在真诚分享。

【结构与字数要求】
- 标题（8–20字）：有场景感、痛点感或讨论度，不当耸动标题党；可带 1 个自然契合的 emoji（如《新媒体运营改简历，想听听大家意见》《Java简历改排版，踩过的坑都在这了》《终于理顺了！分享3个简历排版自查点》）；
- 正文（250–500字）：分 3-4 个自然段，段落间空行，排版舒朗，逻辑层层递进；
- 话题标签（3–5个）：包含目标岗位、简历排版、求职打卡等（如 ["简历排版", "新媒体运营", "求职打卡", "改简历"]，标签不带#号）；
- 评论区备选回复（pinnedComment）：15–35字。切忌长篇大论或说教，像博主在评论区随手回复求助者一样简明、亲切、口语化，直接指路微信小程序/电脑搜“智简简历”，报出图里的【蓝营】模板或功能即可，句末带语气词如“~”或“啦”。

【严格输出格式】
必须输出且仅输出合法 JSON，包含以下字段：
- "title": 标题（8–20字）
- "body": 正文（250–500字）
- "tags": 话题标签数组（3–5个，不带#号）
- "pinnedComment": 评论区备选用语（15–35字）`

export const PACK_VISUAL_CONTEXTS: Record<string, { visual: string; defaultComment: string }> = {
  '01-mobile-template-a': {
    visual: '配图为手机端在预览里切换「蓝营」单栏模板（清爽素雅墨绿配色），三张卡片大标题依次为《内容填好了 版式不用从头做》《在手机预览里 换个版式看效果》《模块分清楚 重点经历先被看到》。文案若提模板请称呼为“图里的蓝营模板”，描写手机端换版式的顺畅与一键对齐体验，强调模块分明让核心经历先被看到。',
    defaultComment: '微信搜【智简简历】小程序，图里是【蓝营】单页模板，直接套用挺方便的~',
  },
  '02-mobile-template-b': {
    visual: '配图为手机端在「外观」设置里给蓝营模板微调主题色，三张卡片大标题依次为《同一个模板 换个主色气质大不同》《选好版式后 挑个顺眼的主题色》《全篇颜色统一 排版细节再过一遍》。文案描写先排好经历内容、再根据岗位或喜好挑选顺眼低调的主题色（如墨绿/深灰），全篇配色统一且不花哨。',
    defaultComment: '在智简简历小程序里挑好模板，外观设置里还能换墨绿等主题色，挺耐看的~',
  },
  '03-desktop-template-a': {
    visual: '配图为电脑网页端新旧版式对比，右侧选中「蓝营」单栏模板（白底墨绿字），三张卡片大标题依次为《告别混乱表格 旧简历换个清爽版式》《电脑大屏对比 切换模板直观预览》《换的是版面外壳 核心还是经历提炼》。文案描写保留原有经历文字直接套用新版式、大屏左右对照省心省力，强调版式再干净核心还在经历提炼。',
    defaultComment: '电脑搜【智简简历】网页版，挑的是【蓝营】单页模板，排版很省心~',
  },
  '04-desktop-template-b': {
    visual: '配图为电脑网页端单栏大图预览与细节标注，三张卡片大标题依次为《简历模板怎么选？ 根据经历体量挑版式》《看完整大图预览 比只盯缩略图靠谱》《选定模板后 这三处细节必自查》。文案描写根据自己的经历多寡挑单栏版式、看大图预览比只看缩略图更直观，并自查标题层级、文字密度与日期对齐。',
    defaultComment: '在智简简历网页版里挑的【蓝营】模板，大图单页预览很直观~',
  },
  '05-mobile-edit-a': {
    visual: '配图为手机端按模块填写项目经历（项目名称、角色、时间、描述），右侧自动生成排版，三张卡片大标题依次为《手机也能改简历 先把核心经历理清楚》《项目经历分开填 不用挤成一大长段》《填完自动排版 排版整齐一览无余》。文案描写手机端按模块逐项填写的省心体验，文字录入后自动排版规整，不用手动调格式。',
    defaultComment: '微信搜【智简简历】小程序，按模块分开填挺顺手的，填完自动排好版~',
  },
  '06-mobile-edit-b': {
    visual: '配图为手机端随写随看、随时回模块微调精简，三张卡片大标题依次为《每填完一段经历 退出来看一眼效果》《发现描述太啰嗦 随时点进模块精简》《全部内容整理完 投递前全屏自查》。文案描写手机随时随地打磨经历、填完一段看一眼预览，发现啰嗦及时精简，最后全屏核对错别字与时间线。',
    defaultComment: '用微信小程序搜【智简简历】改的，每填一段都能退出来看预览，很方便~',
  },
  '07-desktop-edit-a': {
    visual: '配图为电脑网页端在简历画布上直接点击编辑文字，三张卡片大标题依次为《告别表单跳转 直接在简历画布上改》《点到哪段改哪段 像在白纸上排版一样顺》《文字改完通读 重点检查分页与行距》。文案描写不用在表单与预览间反复切换、鼠标点到文字就能直接改的直观体验，改完通读确保一页饱满不溢出。',
    defaultComment: '电脑搜【智简简历】网页版，点到文字就能直接改，所见即所得~',
  },
  '08-desktop-edit-b': {
    visual: '配图为电脑端「模块管理」拖拽排序面板，三张卡片大标题依次为《想让HR先看什么？ 把核心亮点往前移》《鼠标直接拖拽 模块顺序一秒调整》《结合投递岗位排顺序 让匹配度第一眼显现》。文案描写按投递岗位要求灵活拖动模块（如项目出彩就把项目经历拖到教育经历前面），让最强亮点第一眼被HR看到。',
    defaultComment: '在智简简历电脑端可以直接鼠标拖拽模块排序，把核心项目往前放~',
  },
  '09-mobile-ai-a': {
    visual: '配图为手机端 AI 经历润色，从已有经历提炼干练表述，三张卡片大标题依次为《做过的事像流水账？ 换种表达更显干练》《基于真实经历润色 把口水话提炼成动作》《AI 建议仅作参考 挑选合适语气再采纳》。文案描写把大白话提炼成“动作+结果”的启发，但强调AI建议只当参考，挑选适合自己语气的句子，没做过的事情绝不能加。',
    defaultComment: '在【智简简历】小程序里试的润色功能，给表达思路挺有启发，事实自己核对下就行~',
  },
  '10-mobile-ai-b': {
    visual: '配图为手机端核对 AI 润色建议，三张卡片大标题依次为《想把经历写出亮点？ 先弄清实际做了什么》《对照润色建议 保留真实数据与过程》《留下准确描述 改成自己面试能讲清的话》。文案描写拒绝空洞形容词、用具体动作梳理真实职责，保留实际数据，并确保每句话在面试时自己都能自信回答。',
    defaultComment: '用的是【智简简历】的经历润色，挑选适合自己语气的句子留下来就行~',
  },
  '11-desktop-ai-a': {
    visual: '配图为电脑端将流水账经历改写为结构化专业表达，三张卡片大标题依次为《经历写得太散？ 理清动词与量化成果》《左右双栏对照 逐句查看改写建议》《表达可以更专业 但经历坚决不编造》。文案描写大屏左右双栏对比原文与改写建议的启发，强调动词量化让表达更专业，但求职底线是坚决不编造虚假经历。',
    defaultComment: '电脑搜【智简简历】网页版，左右双栏对比润色挺直观的，经历别编造就行~',
  },
  '12-desktop-ai-b': {
    visual: '配图为电脑端对照原文核对润色内容，三张卡片大标题依次为《AI 改完后 千万不要无脑全盘照搬》《逐字对比改动处 筛出真正贴合的词句》《投递前必查三件事 事实/数据/问心无愧》。文案描写严谨求职避坑态度：AI改完逐字比对，投递前自查时间线准不准、数据实不实、细节讲不讲得清，只有问心无愧才敢投。',
    defaultComment: '在【智简简历】里润色的，改完记得自己核对下时间和数据，稳妥才投~',
  },
}

export function defaultPinnedCommentForPack(packId: string): string {
  return PACK_VISUAL_CONTEXTS[packId]?.defaultComment || DEFAULT_PINNED_COMMENT
}

export function buildFixedStoryUserPrompt(input: FixedStoryGenerateInput) {
  const pack = STORY_PACKS.find(item => item.id === input.packId && item.platform === input.platform)
  if (!pack) throw new Error('素材包不存在')
  const feature = featureForPack(pack)
  const reasonObj = STORY_REASONS.find(item => item.id === input.reason)
  const feelingObj = feature.feelings.find(item => item.id === input.feeling)
  const visualContext = PACK_VISUAL_CONTEXTS[pack.id]

  return JSON.stringify({
    实际使用端: input.platform === 'mobile' ? '手机端 / 微信小程序' : '电脑网页版',
    求职目标或方向: input.userRole ? `岗位方向：${input.userRole}` : '通用求职（准备或更新简历）',
    这次分享的心情与动机: reasonObj ? `${reasonObj.label}（${reasonObj.text}）` : '准备找工作，记录简历整理日常',
    体验的核心功能: `${feature.label}（${feature.action}）`,
    具体使用感受: feelingObj ? `${feelingObj.label}（${feelingObj.text}）` : '换了个版式，更清楚一些',
    功能局限与真实认知: feature.limitation,
    用户自主补充细节: input.extra && input.extra.trim() ? input.extra.trim() : '无特殊补充',
    所选配图主题与画面提示: pack.titles.map((t, i) => `图${i + 1}：${t.replace(/\n/g, ' ')}`),
    配图视觉细节与对应事实: visualContext
      ? visualContext.visual
      : `${pack.name} · ${pack.subtitle}。请文案细节严格与配图保持一致。`,
    写作建议: [
      `第一段（呼应图1《${pack.titles[0].replace(/\n/g, ' ')}》）：结合目标岗位写改简历的真实痛点与起因（如格式乱、流水账、经历散乱等）`,
      `第二段（呼应图2《${pack.titles[1].replace(/\n/g, ' ')}》）：描写在智简简历上的实操过程与顺手体感（结合选择的使用感受与图2操作画面，自然提及品牌1次）`,
      `第三段（呼应图3《${pack.titles[2].replace(/\n/g, ' ')}》）：呼应图3对细节自查与事实核验的重视，并结合所选发帖心情深入展开（求助听劝抛出具体求助问题/避坑经验给出3条清单/求职打卡立flag互勉/随手记踏实感）`,
      '第四段：简短走心的暖心收尾，给求职路上的彼此加油打气',
    ],
  })
}

export function redactContactInfo(text: string): string {
  return text
    .replace(/\b\d{17}[\dXx]\b/g, '[证件信息已隐藏]')
    .replace(/1[3-9]\d{9}/g, '[电话已隐藏]')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[邮箱已隐藏]')
}

export const DISCLAIMER_NOTE = '配图为智简简历产品示例，由 AI 辅助设计，人物与经历为模拟数据，界面细节以实际产品为准。'

export function validateFixedStoryOutput(value: unknown): {
  title: string
  body: string
  tags: string[]
  pinnedComment: string
} {
  if (!value || typeof value !== 'object') throw new Error('生成格式错误')
  const raw = value as Record<string, unknown>
  const title = typeof raw.title === 'string' ? raw.title.trim().replace(/^["'“]|["'”]$/g, '') : ''
  let body = typeof raw.body === 'string' ? raw.body.trim() : ''
  const tags = Array.isArray(raw.tags)
    ? raw.tags.map(t => String(t).replace(/^#/, '').trim()).filter(Boolean)
    : []
  const pinnedComment = typeof raw.pinnedComment === 'string' && raw.pinnedComment.trim().length >= 10
    ? raw.pinnedComment.trim()
    : DEFAULT_PINNED_COMMENT

  if (title.length < 5 || title.length > 25) throw new Error('标题长度须在 5-25 字之间')
  if (body.length < 60 || body.length > 900) throw new Error('正文长度须在 60-900 字之间')
  if (tags.length < 2 || tags.length > 6) throw new Error('标签数量须在 2-6 个之间')

  // Redact personal contact info
  body = redactContactInfo(body)

  return {
    title: title.slice(0, 20),
    body: body.slice(0, 1000),
    tags: tags.slice(0, 5),
    pinnedComment: pinnedComment.slice(0, 150),
  }
}
