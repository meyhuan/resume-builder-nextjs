/** Real, unmodified product captures from screenshots/index/screenshot-index.json.
 * All people, companies and figures in these captures are demonstration data.
 */
export type StoryPlatform = 'mobile' | 'desktop'
export function resolveStoryPlatform(source?: string, platform?: string): StoryPlatform {
  return source === 'mini' ? 'mobile' : platform === 'desktop' ? 'desktop' : 'mobile'
}
export const STORY_ASSETS = [
  { id: 'mobile-edit-module-management-sheet', platform: 'mobile', title: '模块管理', caption: '手机端模块展示与顺序调整', keywords: ['模块', '顺序'], summary: '手机端模块管理弹层，展示模块的拖动排序与显示控制。' },
  { id: 'mobile-edit-home-editing-dashboard', platform: 'mobile', title: '编辑首页', caption: '手机端按模块填写内容的编辑首页', keywords: ['填写', '编辑', '界面'], summary: '手机端编辑首页与各模块入口，示例人物和数据。' },
  { id: 'ai-resume-wizard-desktop', platform: 'desktop', title: 'AI 生成向导', caption: '电脑端 AI 生成向导的身份选择', keywords: ['生成', '向导'], summary: '电脑端生成向导入口，不代表任何用户已经完成了生成。' },
  { id: 'import-resume-desktop', platform: 'desktop', title: '导入入口', caption: '电脑端文本粘贴与文件上传入口（历史界面示例）', keywords: ['导入'], summary: '历史版本的电脑端导入入口，额度与提示以当前产品实际显示为准，不代表用户的个人导入记录。' },
  { id: 'mobile-preview-xinghe', platform: 'mobile', title: '简历预览', caption: '星河模板的完整简历预览', keywords: ['简历', '完成', '预览', '排版', '一页', '单页'], summary: '手机端简历成品预览，示例简历，不代表用户自己的简历。' },
  { id: 'editor-lanzhe-one-page-mode-desktop', platform: 'desktop', title: '一页模式', caption: '开启一页模式后的真实编辑器', keywords: ['一页', '单页'], summary: 'PC 编辑器的一页模式已开启，自动调整排版参数，尽量收纳到一页；不保证任意内容量都能装下。' },
  { id: 'editor-lanzhe-layout-settings-desktop', platform: 'desktop', title: '排版设置', caption: '字号、行距和页边距调整', keywords: ['字号', '行距', '页边距', '模块间距'], summary: '真实编辑器的排版设置面板，可调字号、行距、模块间距和页边距。' },
  { id: 'editor-pc-template-library-desktop', platform: 'desktop', title: '模板切换', caption: '在编辑器里选择并预览模板', keywords: ['模板'], summary: '编辑器内的模板库，点击模板可以切换简历版式。' },
  { id: 'editor-pc-ai-optimize-preview-desktop', platform: 'desktop', title: '优化前后', caption: 'AI 优化后的逐项对比预览', keywords: ['润色', '优化'], summary: 'AI 优化结果的模块级差异预览，可逐项审核后应用，不代表求职结果。' },
  { id: 'mobile-edit-project-detail-rich-form', platform: 'mobile', title: '项目经历', caption: '项目名称、角色与成果编辑', keywords: ['项目经历', '项目描述', '项目名称'], summary: '手机端项目经历详情表单，包含项目角色、时间和描述成果的富文本编辑。' },
  {"id": "mobile-preview-settings-template-sheet", "platform": "mobile", "title": "模板切换", "caption": "手机预览中的模板选择", "keywords": ["模板", "风格"], "summary": "展示手机端预览页的样式设置弹层，默认模板页签中列出多款简历模板，可直接在手机上切换预览。"},
  {"id": "mobile-preview-export-menu", "platform": "mobile", "title": "简历导出", "caption": "手机预览中的导出菜单", "keywords": ["导出", "PDF", "图片"], "summary": "展示手机端预览页底部导出菜单，用户可以选择导出 PDF 或导出图片。"},
] as const

export type StoryAsset = typeof STORY_ASSETS[number]
export function storyAssetSource(id: string) { return `/m/story-assets/${id}.png` }
export function storyAssetsFor(platform: StoryPlatform): StoryAsset[] {
  return STORY_ASSETS.filter(asset => asset.platform === platform)
}
export function positiveStoryClauses(value: string) {
  return value.split(/[，。！？；\n]/).filter(clause => !/没(?:有)?用|未用|没试|未试|不用|不曾|尚未|还没|没体验|想试|打算|准备试/.test(clause)).join('，')
}
export function recommendStoryAssets(text: string, platform: StoryPlatform = 'mobile'): StoryAsset[] {
  const experience = positiveStoryClauses(text)
  return storyAssetsFor(platform).map(asset => ({ asset, score: asset.keywords.reduce((n, word) => n + (experience.toLowerCase().includes(word.toLowerCase()) ? 1 : 0), 0) }))
    .filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map(item => item.asset)
}
