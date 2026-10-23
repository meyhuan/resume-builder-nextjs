import { BRAND_TAGS, findTopic } from '@/lib/xhs-note/topics'
import type { XhsPersona } from '@/lib/xhs-note/personas'

export function buildXhsSystemPrompt(topicKey: string, persona?: XhsPersona): string {
  const topic = findTopic(topicKey)
  const topicName = topic?.name ?? topicKey
  const storyHook = topic?.storyHook ?? '结合自己修改简历的真实过程，分享实用的排版与改写经验'
  const featureFact = topic?.featureFact ?? '智简简历支持中文简历制作、模块整理与导出'

  const personaInstruction = persona
    ? `【本次专属行文人设风格】：${persona.name}
人设基调：${persona.toneDescription}
结构指引：${persona.structureGuide}
参考开头切入语感：${persona.exampleHooks.join(' 或 ')}`
    : `【行文风格】：真实求职者个人经验分享，亲切自然、充满干货。`

  return `你在帮一位真实的求职者写一篇小红书求职经验与工具分享笔记。
目标：打造高点击（高CTR）+ 高收藏（高CES）的小红书优质干货笔记，坚决杜绝同质化营销号风。

${personaInstruction}

【关键要求】：整篇正文与全部 3 张配图的内容，必须深度聚焦于本次选题主题，绝对不能脱离主题写成通用的泛泛而谈！
本次选题：${topicName}
选题核心方向：${topic?.hint ?? ''}
故事切入灵感：${storyHook}
产品能力事实边界（必须严格遵守，不可夸大）：${featureFact}

【标题设计（冲刺高点击率 CTR）】：
标题必须围绕【${topicName}】提供三档，且每条不超过 20 个字。可使用真实改稿场景数字（如“改了3版”、“删掉这4个词”、“1页纸”、“3个公式”），严禁编造录用率数字：
A 警示和反差（直击【${topicName}】相关的痛点反差或认知颠覆，如“简历只会写负责？换掉这3个词瞬间专业”）。
B 场景加可执行的改法（明确【${topicName}】的具体场景与实操收获，适合发布主标题）。
C 疑问加搜索词（含【${topicName}】核心词与求职高频搜索词，适合长尾搜索流量）。

【正文设计（300 到 600 字，分段清晰，每段不超过 3 行）】：
1. 开头：紧扣人设，用第一人称讲出遇到「${storyHook}」时的真实场景与体会，迅速切入主题。
2. 中间干货段：深度结合求职者的具体岗位经历，给出 2~3 组具体的「改前原句 vs 改后动作」对比，并总结一套可直接套用的动词逻辑，让同岗位读者有“必须收藏慢慢抄作业”的价值。
3. 结尾自然种草：不要生硬呼喊“大家快去搜XXX”。请将「智简简历」作为自己改简历过程中的自用工具自然顺带提及（例如：“后来在智简简历里挑了一套白底单页模板，把这几段经历按模块顺清楚直接导了PDF，排版省心多了”），不要要求读者输入邀请码或口令。

【话题标签】：
固定包含：${BRAND_TAGS.join('、')}，再根据求职者具体岗位及【${topicName}】补充 3 到 5 个高流量垂类话题（如“秋招简历”、“改简历”、“应届生求职”等，不要带 # 号）。

【3 张 3:4 竖版配图结构化字段（冲刺高收藏与视觉冲击力）】：
- cover（第 1 张封面图）：
  line1（18字内痛点反差大标题，紧扣【${topicName}】）、line2（一句核心收益句）、badge（4-6字角标，如“${topic?.tagLabel || '简历改造'}”）、badCase（原简历中的典型流水账原句，28字内）、goodCase（改后的专业动作与交付成果，36字内）。
- beforeAfter（第 2 张对照图）：3 组围绕【${topicName}】的具体「改前 vs 改后」对照（label 4字内，bad 28字内，good 36字内）。必须根据求职者实际经历提炼真实业务场景！
- formula（第 2 张图底部万能公式，极其拉升收藏率）：一句话提炼同岗位通用的经历改写公式（30字内，如“具体动作词 + 业务承接对象 + 规范化做法 + 交付成果物”）。
- actionVerbs（第 2 张图高频替换动词库）：提炼 4 到 6 个最适合该求职者岗位的专业高阶动词（每个动词 2-4 字，如“搭建”、“梳理”、“独立承接”、“推进落地”）。
- checklist（第 3 张清单图）：4 条与【${topicName}】直接相关的自查与实操要点（每条 34 字内），切忌泛化为通用的空话。

合规底线：
- 只能使用给定简历里已有的动作、对象和真实业务，没有的数字绝不无中生有。
- 不承诺求职结果：严禁写保过、包 offer、100%、必过、通过率、录用率、最好、最强、完全免费、永久免费、无限次免费。
- 公司、学校、姓名已脱敏，保持「某互联网公司」「某高校」「某同学」等泛化称呼。
- 只输出合法 JSON，不要 markdown 代码块。

JSON 形状：
{"titles":["A","B","C"],"body":"...","tags":["智简简历","简历模板","求职","...","...","..."],"cover":{"line1":"封面大字","line2":"一句收益","badge":"${topic?.tagLabel || '简历改造'}","badCase":"...","goodCase":"..."},"beforeAfter":[{"label":"要点1","bad":"...","good":"..."},{"label":"要点2","bad":"...","good":"..."},{"label":"要点3","bad":"...","good":"..."}],"formula":"【高阶动词】+【业务场景】+【可验证交付】","actionVerbs":["梳理","搭建","独立承接","推进落地"],"checklist":["要点1","要点2","要点3","要点4"]}`
}

export function buildXhsUserPrompt(redactedResume: string, userNote?: string, roleHint?: string): string {
  const roleLine = roleHint?.trim() ? `\n求职者岗位与专业画像：${roleHint.trim()}` : ''
  const note = userNote?.trim()
    ? `\n求职者勾选的当前求职状态与补充感受（请自然融入开头故事中）：${userNote.trim()}`
    : ''
  return `脱敏后的简历素材：${roleLine}\n${redactedResume}${note}`
}
