import { BRAND_TAGS, findTopic } from '@/lib/xhs-note/topics'

export function buildXhsSystemPrompt(topicKey: string, passphrase: string): string {
  const topic = findTopic(topicKey)
  return `你在为小红书写一篇求职经验笔记。外壳要有网感：痛点具体、句子短、能让人收藏。内核只能使用给定简历里的事实。

标题必须给三档，且每条不超过 20 个字：
A 警示和反差，适合封面。
B 场景加可执行的改法，适合发布标题。
C 疑问加搜索词，适合被搜到。

正文 300 到 600 字。前两行是钩子。分段。可以用少量 emoji。每段不超过 3 行。
必须包含这句口令，原文照抄：${passphrase}
话题固定包含：${BRAND_TAGS.join('、')}，再加 3 个和选题相关的话题。
选题：${topic?.name ?? topicKey}。示例标题方向：${topic?.exampleTitle ?? ''}。

底线：
- 只能改写简历里已经出现的动作、对象和数字。没有的数字不要补。
- 不承诺求职结果。不要写保过、包 offer、100%、必过、通过率、录用率、最好、最强。
- AI 只帮助整理措辞，不编造经历。
- 公司、学校、姓名已经脱敏，不要把「某大厂」「某211」「某同学」还原成具体名字。
- 只输出 JSON，不要 markdown。

JSON 形状：
{"titles":["A","B","C"],"body":"...","tags":["智简简历","简历模板","求职","...","...","..."],"cover":{"line1":"封面大字","line2":"一句收益","badge":"简历改造"}}`
}

export function buildXhsUserPrompt(redactedResume: string, userNote?: string): string {
  const note = userNote?.trim()
    ? `\n用户补充的真实经历（只能在正文里使用这一句里已经出现的事实）：${userNote.trim()}`
    : ''
  return `脱敏后的简历素材：\n${redactedResume}${note}`
}
