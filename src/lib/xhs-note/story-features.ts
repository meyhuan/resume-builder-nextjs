import { storyAssetsFor, type StoryPlatform } from './story-assets'

export type StoryFeeling = { id: string; label: string; text: string }
export type Feature = {
  id: string; label: string; mention?: string; description: string; platforms: StoryPlatform[]
  action: string; title: string; feelings: StoryFeeling[]; limitation: string
  screenshot: string; assets: Partial<Record<StoryPlatform, string[]>>
  feelingQuestion?: string
}
const both: StoryPlatform[] = ['mobile', 'desktop']

/** Current source audit: docs/xhs-story-feature-audit.md. No usage is inferred from these capabilities. */
export const STORY_FEATURES: Feature[] = [
  { id: 'ai-generate', label: 'AI 生成简历', description: '选身份、填经历，先整理出一份草稿', platforms: both,
    action: '按向导选择身份、补充经历，生成了一份简历草稿', title: '这次做简历，我先从草稿开始',
    feelingQuestion: '用 AI 生成简历草稿，最直接的体感是？',
    feelings: [
      { id: 'helpful', label: '✨ 不用对着空白页犯愁，快速有了起步框架', text: '不用对着空白文档抓耳挠腮想第一句，很快就有了框架。' },
      { id: 'different', label: '📋 给了一个继续修改的起点，省去大量起步时间', text: '给了一个可以继续修改和补充的起点，省去了大量起手时间。' },
      { id: 'trying', label: '🔍 框架搭好了，具体经历细节还是要自己逐条核实', text: '我还在试，目前没有特别明显的感受，具体的工作细节和数据还是要自己逐条核实完善。' },
    ], limitation: 'AI 写的内容还是要逐项核实，没做过的经历不能留。',
    screenshot: '上传你实际填写的生成向导和生成后的草稿，遮挡个人信息。成品图只能展示结果，不能替代生成过程。', assets: { desktop: ['ai-resume-wizard-desktop'] } },
  { id: 'ai-polish', label: 'AI 润色', description: '基于已有经历，看看表达还能怎么改', platforms: both,
    action: '试着润色了一段自己写的经历', title: '简历这段话，我又改了一遍',
    feelingQuestion: '试完经历润色，最深的一点体会是？',
    feelings: [
      { id: 'helpful', label: '💡 把流水账提炼成具体动作，给了很多表达思路', text: '把之前写得像流水账的大白话，梳理成了“动词+结果”的干练表述。' },
      { id: 'different', label: '📝 左右双栏对照很清晰，只挑适合自己语气的采纳', text: '对照改写建议逐句挑选，只保留契合自己语气的句子，思路被打开了。' },
      { id: 'trying', label: '🤝 表达更干练了，但真实数据和事实自己把关才安心', text: '我还在试，目前没有特别明显的感受，关键数据和业务细节还是要自己严格核对。' },
    ], limitation: '有些说法还要改成自己的语气，事实和数字也得自己核对。',
    screenshot: '上传同一段经历的原文和实际润色结果。不要用其他人的对比图代替自己的经历。', assets: { desktop: ['editor-pc-ai-optimize-preview-desktop'] } },
  { id: 'templates', label: '选择简历模板', mention: '模板切换', description: '比较不同版式，挑适合自己内容的模板', platforms: both,
    action: '给自己的简历挑了一个模板', title: '给旧简历换了个版式',
    feelingQuestion: '换完这个版式，最直观的体感是？',
    feelings: [
      { id: 'helpful', label: '🌿 排版清爽很多，内容一下子有了“呼吸感”', text: '换了这个版式之后，整份简历清爽了很多，内容一下子有了呼吸感。' },
      { id: 'different', label: '⏱️ 省去反复调边距行距的折腾，很省时间', text: '直接套用规范版式，省去了在Word或表格里反复调行距和对齐的折腾。' },
      { id: 'trying', label: '🎯 单栏层次清楚，核心经历更容易被先看到', text: '我还在试，目前没有特别明显的感受，单栏清晰结构让重点经历更突出。' },
    ], limitation: '模板只是版式，哪些经历值得放还是得自己选。',
    screenshot: '建议放你的模板选择界面和最终成品。公共模板图仅作产品示例。', assets: { mobile: ['mobile-preview-settings-template-sheet'], desktop: ['editor-pc-template-library-desktop'] } },
  { id: 'appearance', label: '主题色与样式调整', description: '调整颜色、字号、行距等，部分模板有固定样式', platforms: both,
    action: '调整了一下简历的样式', title: '把简历调成自己喜欢的样子',
    feelingQuestion: '微调主题色与样式后，感觉怎么样？',
    feelings: [
      { id: 'helpful', label: '🎨 换个沉稳低调的主题色，整份简历更显职业感', text: '换了个沉稳的主题色之后，整份简历的气质看起来更专业耐看。' },
      { id: 'different', label: '👌 字号行距统一协调，视觉重点更加清晰', text: '调整完字号和行距后，视觉重点更突出了，看着更舒服。' },
      { id: 'trying', label: '👀 预览对比很直观，很容易挑出自己顺眼的风格', text: '我还在试，目前没有特别明显的感受，随时看着右侧预览微调挑选搭配。' },
    ], limitation: '不同模板能调的地方不完全一样，我还得看着预览微调。',
    screenshot: '上传自己实际使用的主题色或样式设置，以及调整后的成品；可配同一份简历的前后效果。', assets: { desktop: ['editor-lanzhe-layout-settings-desktop'] } },
  { id: 'one-page', label: '一页模式', description: '尝试收紧排版；内容过多时仍需取舍', platforms: both,
    action: '试了一页模式', title: '这次改简历，试了一页模式',
    feelingQuestion: '试了一页模式，最明显的感受是？',
    feelings: [
      { id: 'helpful', label: '📄 自动收紧多余间距，刚好饱满卡进单页', text: '自动收紧了多余的行距边距，内容刚好饱满地收在一页纸里。' },
      { id: 'different', label: '✂️ 逼着自己把注水套话删掉，简历反而更精炼了', text: '在一页空间的限制下，逼着自己删掉了无用废话，表达反而更精炼。' },
      { id: 'trying', label: '⏱️ 省去了反复微调段落挤一页的痛苦折腾', text: '我还在试，目前没有特别明显的感受，省去了为了压进一页反复挤行距的折腾。' },
    ], limitation: '内容太多还是要自己取舍，一页模式不是再多都能装下。',
    screenshot: '上传自己的一页模式设置和实际成品。成品图保留原本排版，不会为了配图强行压成一页。', assets: { desktop: ['editor-lanzhe-one-page-mode-desktop'] } },
  { id: 'module-order', label: '调整模块顺序', description: '把想先展示的经历放到前面', platforms: both,
    action: '调整了简历里几个模块的顺序', title: '把想先展示的经历放到前面',
    feelingQuestion: '调整模块顺序时，最主要的考虑是？',
    feelings: [
      { id: 'helpful', label: '📌 把最贴合岗位的核心亮点往前放，HR第一眼看到', text: '把最贴合目标岗位的核心项目直接拖到前面，让优势亮点第一眼显现。' },
      { id: 'different', label: '🖱️ 鼠标拖拽一秒调换顺序，不用重新复制粘贴', text: '直接鼠标拖动模块就能调整顺序，不用再剪切粘贴折腾半天格式。' },
      { id: 'trying', label: '🎯 针对投递岗位灵活排优先级，针对性更强', text: '我还在试，目前没有特别明显的感受，针对不同投递方向灵活切换模块优先级。' },
    ], limitation: '先展示什么还是要结合这次投递的岗位来决定。',
    screenshot: '上传本人模块管理或拖拽排序画面，也可以放调整顺序后的成品。', assets: { mobile: ['mobile-edit-module-management-sheet'] } },
  { id: 'import', label: '导入已有简历', mention: '简历导入', description: '从旧材料开始，识别后继续检查和编辑', platforms: both,
    action: '把原来的简历导进来继续改', title: '旧简历导进来，接着慢慢改',
    feelingQuestion: '把旧简历导入进来，最大的便利是？',
    feelings: [
      { id: 'helpful', label: '📥 不用从零一条条重新敲字，省了大量基础录入', text: '直接解析带入了原有经历，不用再从零一条条敲字录入了。' },
      { id: 'different', label: '📑 原有经历有了新的排版底座，整理起来更有条理', text: '原来的材料有了一个崭新的排版底座，继续修改梳理更顺畅。' },
      { id: 'trying', label: '🔍 基础信息一键带入，能专注打磨核心经历语句', text: '我还在试，目前没有特别明显的感受，免去繁琐录入后能专注打磨经历。' },
    ], limitation: '识别后的内容和模块归类还得自己检查，有不准的地方要改。',
    screenshot: '上传实际导入入口和识别后的内容。原文件、文件名和联系方式都要检查隐私。', assets: { desktop: ['import-resume-desktop'] } },
  { id: 'translate', label: '简历翻译', description: '选择目标语言，检查后应用或另存', platforms: both,
    action: '试着把简历翻译成另一种语言', title: '试着给简历做了个另一语言版本',
    feelingQuestion: '尝试简历翻译后，觉得体验如何？',
    feelings: [
      { id: 'helpful', label: '🌐 专业术语对应得比较规范，快速有了双语底稿', text: '给出了很规范的双语表述底稿，不用自己在词典里反复查。' },
      { id: 'different', label: '⚡ 省去逐段去外部软件翻译拼凑的繁琐操作', text: '直接在编辑器里生成对照，省去了逐段复制到外部工具翻译的麻烦。' },
      { id: 'trying', label: '✍️ 句式框架搭好了，自己再微调几处行话即可', text: '我还在试，目前没有特别明显的感受，英文句式框架搭得很规整。' },
    ], limitation: '专业术语和具体表述仍要自己核对，译文不能直接当成最终稿。',
    screenshot: '上传你实际的翻译设置、原文与译文。请只展示自己愿意公开的段落。', assets: {} },
  { id: 'simple-ui', label: '简洁的操作界面', description: '分享你对这次操作过程的真实感受', platforms: both,
    action: '整理了一次自己的简历', title: '这次整理简历，记一点使用感受',
    feelingQuestion: '这次整理简历的操作体验，觉得如何？',
    feelings: [
      { id: 'helpful', label: '🌿 界面干净没有多余广告干扰，能专心写简历', text: '界面非常干净清爽，没有乱七八糟的弹窗广告，能让人专心沉浸写简历。' },
      { id: 'different', label: '🧭 功能入口很清晰，不用到处翻找菜单', text: '核心功能一目了然，不需要到处翻找隐藏菜单，用起来很顺手。' },
      { id: 'trying', label: '💡 流程轻巧顺畅，不知不觉就整理好了一份', text: '我还在试，目前没有特别明显的感受，从选模板到填内容流程轻快丝滑。' },
    ], limitation: '没用到的功能还不了解，这里只说这次的体验。',
    screenshot: '上传你实际操作的编辑首页或界面，重点展示让你觉得顺手的部分。', assets: { mobile: ['mobile-edit-home-editing-dashboard'] } },
  { id: 'auto-layout', label: '填内容，模板自动排版', mention: '模板自动排版', description: '手机上专心填内容，去预览里看成品', platforms: ['mobile'],
    action: '在手机上填好内容，再用模板看排版效果', title: '手机上填内容，再看看简历成品',
    feelingQuestion: '手机上整理经历，觉得哪点最顺手？',
    feelings: [
      { id: 'helpful', label: '📱 按模块分开填很省心，不用对着大段文字头疼', text: '手机端按模块把经历拆开填，不用对着一整篇密密麻麻的文字犯愁。' },
      { id: 'different', label: '👀 填完一段就能实时看预览，哪里啰嗦改哪里', text: '每填完一个模块都能退出来看实际排版效果，发现啰嗦及时调整。' },
      { id: 'trying', label: '✨ 录完自动排好版，不用在手机小屏上手动对齐', text: '我还在试，目前没有特别明显的感受，录入经历后格式自动规整排版。' },
    ], limitation: '内容的长短和取舍还要自己改，不是填多少都不用管。',
    screenshot: '建议放本人填写经历的页面和简历预览，展示从内容到成品的过程。', assets: { mobile: ['mobile-edit-project-detail-rich-form', 'mobile-preview-xinghe'] } },
  { id: 'live-edit', label: '所见即所得编辑', description: '在简历画面上修改，拖拽模块调整顺序', platforms: ['desktop'],
    action: '直接在简历画面上编辑内容', title: '边改边看，整理了一下简历',
    feelingQuestion: '在电脑画布上改简历，觉得哪点最顺手？',
    feelings: [
      { id: 'helpful', label: '🖱️ 点哪改哪、所见即所得，像在白纸上排版一样顺', text: '鼠标点到哪段文字就在哪直接修改，不用在表单和预览页来回跳转。' },
      { id: 'different', label: '📐 改字同时就能看到整页排版，随时调整篇幅', text: '一边改字一边就能看到对整页布局的影响，很方便把控单页篇幅。' },
      { id: 'trying', label: '🔍 直接在成品画面上通读检查，更容易发现问题', text: '我还在试，目前没有特别明显的感受，直接对着最终排版画面通读修改。' },
    ], limitation: '布局改完还是要检查整页效果，尤其是分页的位置。',
    screenshot: '可从本人已保存的简历截取真实电脑编辑器页面；若想展示修改或拖拽过程，请补充自己的实际操作截图。', assets: {} },
  { id: 'jd-match', label: '岗位匹配', description: '对照职位描述找关键词和内容缺口', platforms: ['desktop'],
    action: '拿一段职位描述和自己的简历做了对照', title: '拿职位描述，对照着改简历',
    feelingQuestion: '对照职位描述匹配后，最大的收获是？',
    feelings: [
      { id: 'helpful', label: '🎯 抓出了岗位核心关键词，知道该针对性强化哪块', text: '清晰梳理出了目标岗位的关键词，明确了该重点突出哪段经历。' },
      { id: 'different', label: '🔍 看清了自己经历里的薄弱点，改起来目标更明确', text: '对照着看出了自己经历里的描述缺口，针对性补全了相关项目。' },
      { id: 'trying', label: '📋 投递前有了客观参考，不再像盲盒一样盲投', text: '我还在试，目前没有特别明显的感受，投递前有了一个客观的关键词对照参考。' },
    ], limitation: '匹配分析只是关键词和内容参考，不代表录用概率，经历也不能硬编。',
    screenshot: '上传电脑编辑器里的实际岗位匹配结果，可遮挡公司信息。不要把公开关键词检查工具当成编辑器的匹配结果。', assets: {} },
  { id: 'interview', label: '面试准备', description: '结合简历和职位，整理自我介绍与练习问题', platforms: ['desktop'],
    action: '用简历和职位描述整理了一份面试准备材料', title: '拿自己的经历，整理面试准备',
    feelingQuestion: '生成面试提纲后，觉得哪点最有帮助？',
    feelings: [
      { id: 'helpful', label: '💬 提前梳理好了自我介绍结构，面试开场不慌了', text: '帮我理顺了针对性自我介绍的框架，面试开场不至于大脑空白。' },
      { id: 'different', label: '❓ 预判了几个针对经历的深挖问题，可以提前准备', text: '预判了面试官可能会深挖的几个业务细节，让我能提前打好腹稿。' },
      { id: 'trying', label: '🧠 重新盘点了一遍项目细节，去面试心里踏实很多', text: '我还在试，目前没有特别明显的感受，带着问题重新复盘了一遍项目的来龙去脉。' },
    ], limitation: '生成的内容还要按自己的真实经历改，也不能保证面试结果。',
    screenshot: '上传实际生成的自我介绍或练习问题，检查是否包含不想公开的经历；准备记录保存在当前浏览器。', assets: {} },
]
export function storyFeaturesFor(platform: StoryPlatform) { return STORY_FEATURES.filter(feature => feature.platforms.includes(platform)) }
export function storyFeature(id: string, platform: StoryPlatform) { return storyFeaturesFor(platform).find(feature => feature.id === id) }
export function featureStoryAssets(ids: string[], platform: StoryPlatform) {
  const allowed = new Set(ids.flatMap(id => storyFeature(id, platform)?.assets[platform] || []))
  return storyAssetsFor(platform).filter(asset => allowed.has(asset.id))
}
