import type { ResumeData } from '@/entities/resume/resume-data';
import { toResumeContext } from '@/lib/ai/resume-context';
import type { AssistantTask, DraftAnswer } from './types';

export const plainText = (html: string): string =>
  html
    .replace(/<\/(p|li|div)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
export function targetSnapshot(resume: ResumeData, blockId?: string): string {
  if (!blockId) return JSON.stringify(resume);
  const block = resume.sections
    .flatMap((s) => s.blocks)
    .find((b) => b.id === blockId);
  return block ? JSON.stringify(block) : '';
}
export function targetContent(resume: ResumeData, blockId: string): string {
  return (
    toResumeContext(resume)
      .sections.flatMap((s) => s.blocks)
      .find((b) => b.blockId === blockId)?.content || ''
  );
}
/** Conservative authorization, only the current user's turn, never assistant text. */
export function explicitlyDirect(text: string): boolean {
  // Quoted replacement text is data; authorization must be outside quotations.
  const command = text.replace(/“[^”]*”|「[^」]*」|『[^』]*』|"[^"]*"/g, '');
  if (
    /不要直接|别直接|先.*(?:看看|预览|确认)|仅.*建议|如果|假如|比如|例如|怎么|如何|是什么意思|[?？]/.test(
      command,
    )
  )
    return false;
  return /(?:直接|不用预览|无需预览|不必预览).{0,12}(?:改|润色|精简|重写|替换|应用|写入)|(?:替换|应用|写入).{0,8}(?:原文|简历|这段)/.test(
    command,
  );
}
export function numericAdditions(source: string, result: string): string[] {
  const values = (s: string) => s.match(/\d+(?:[.,]\d+)*(?:%|％)?/g) || [];
  const known = new Set(values(plainText(source)));
  return [...new Set(values(plainText(result)).filter((n) => !known.has(n)))];
}
export function followupsFor(
  draft: Pick<DraftAnswer, 'questions' | 'proposals' | 'followups'>,
): string[] {
  const fallback = draft.questions.length
    ? ['哪些信息是这次写作必须提供的？', '不确定的信息可以先留空吗？']
    : draft.proposals.length
      ? [
          '这段还能再精简一点吗？',
          '哪些表述需要我核对？',
          '这次具体调整了哪些表达？',
        ]
      : ['我应该先补充哪些真实信息？', '帮我检查简历中哪些表述不够清楚。'];
  return [...new Set([...draft.followups, ...fallback])].slice(0, 3);
}
export function taskSystem(task: AssistantTask): string {
  return `你是智简简历的AI助手，为所有行业求职者服务。用用户语言回答，默认中文。
当前任务：${task.feature}，对象：${task.label}。${task.blockId ? '只能修改指定blockId=' + task.blockId + '。其它模块仅供理解背景，不能将其它经历的成果移到此段。' : '全局任务，修改目标不明确时先询问。'}
事实规则：原简历与用户明确自述是事实来源；JD、参考范文、助手之前的建议不是用户事实。保留职责程度、技能熟练程度、公司、职位、日期、数字、因果与贡献边界。协助不能变主导，了解不能变精通，流程不能变成果。用户明确纠正事实后使用新事实。不得凭空补经历、数字、技能、学历。
主动识别缺失信息：事实够就组织表达；不知道怎么写时每轮只问1到3个日常问题，可附简短选项，不预选事实。无数字也可以保守表达；允许不知道、跳过。存在冲突先确认。不得强制填满每个模块。
少说过程：直接给可核对结果，不说我将为你打造、不重复修改卡片、不声称已应用。普通回复先提建议；执行由客户端根据本次授权决定。
输出一个JSON对象：{answer:简短说明或分析,questions:[{question,options:[]}],proposals:[{action:"updateBlock",blockId,html,reason}或{action:"addSection",type,title,contentHtml}或{action:"suggestSkills",skills:[],category}],followups:[2到3条相关的下一步问题]}。HTML只允许p/ul/li/strong。技能建议只有用户明确证实会的技能才能放进proposals，岗位要求缺少的技能只能在分析中说明。
有questions时不要同时输出proposals，也不要在answer中夹带可直接复制的虚构履历。后续问题不要暗示新的事实，不使用泛泛的需要帮助吗，不重复应用/撤销按钮。用户要求写、润色、翻译、补技能时通过proposals输出而非只在正文写改稿。分析JD、面试准备、求职信等可在answer回答，但同样不能编造用户事实。`;
}
