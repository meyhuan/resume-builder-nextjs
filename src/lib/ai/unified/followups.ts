import type { HistoryTurn, MessageSource } from './types';

export type FactTopic = 'all' | 'scale' | 'tools' | 'output';

export function followupRequest(text: string): string {
  return text === '这段还能再精简一点吗？'
    ? '帮我进一步精简表达，保留原有事实。'
    : text;
}

/** Also handles questions in sessions saved before followups were made actionable. */
export function followupFactTopic(text: string): FactTopic | null {
  if (text === '补充这段经历的真实信息') return 'all';
  if (!/是否|有没有|有无|若有|若明确|如果有/.test(text)) return null;
  if (/人数|人次|场次|规模|数量/.test(text)) return 'scale';
  if (/工具|Excel|腾讯文档|效率/.test(text)) return 'tools';
  if (/摘要|交付物|反馈汇总|报告/.test(text)) return 'output';
  // Unknown factual questions still require an answer before being sent.
  return 'all';
}

/** Suggested questions and their examples must never become personal evidence. */
export function confirmedStatements(
  turns: HistoryTurn[],
  text: string,
  source: MessageSource = 'user',
): string[] {
  const answerEvidence = (value: string, questions: HistoryTurn['questions']) =>
    value
      .split('\n')
      .map((line) => {
        const question = questions.find((q) =>
          line.startsWith(`${q.question.replace(/\s+/g, ' ').trim()}：`),
        );
        if (!question) return line;
        const prefix = `${question.question.replace(/\s+/g, ' ').trim()}：`;
        // Keep semantic context for short replies, excluding assistant examples
        // and numbers from the evidence used by the numeric guard.
        const context = question.question
          .replace(/（[^）]*）|\([^)]*\)/g, '')
          .replace(/\d+(?:[.,]\d+)*(?:%|％)?/g, '');
        return `问题上下文（不是用户自述）：${context}\n用户回答：${line.slice(prefix.length)}`;
      })
      .join('\n');
  return [
    ...turns.flatMap((turn, index) =>
      turn.messageSource === 'suggestion'
        ? []
        : [answerEvidence(turn.text, turns[index - 1]?.questions || [])],
    ),
    ...(source === 'suggestion'
      ? []
      : [answerEvidence(text, turns.at(-1)?.questions || [])]),
  ];
}
