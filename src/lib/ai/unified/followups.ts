import type {
  AssistantTask,
  CheckedProposal,
  DraftAnswer,
  FollowupAction,
  HistoryTurn,
  MessageSource,
  MissingFact,
} from './types';
import type { SectionModuleType } from '@/lib/ai/section-types';

const plainText = (html: string): string =>
  html
    .replace(/<\/(p|li|div)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();

export type FactTopic = 'all' | 'scale' | 'tools' | 'output';

export function followupRequest(text: string): string {
  if (text === '这段还能再精简一点吗？') {
    return '帮我进一步精简表达，保留原有事实。';
  }
  // Strip UI decoration icon if present
  if (text.startsWith('👉 ')) {
    return text.slice(3);
  }
  return text;
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

/** Literal answers only: question wording and examples are never evidence. */
export function confirmedTargetAnswers(
  turns: HistoryTurn[], text: string, source: MessageSource | undefined,
  targetId: string, taskTargetId?: string,
): string[] {
  const extract = (value: string, questions: HistoryTurn['questions']) => value.split('\n').flatMap(line => {
    const question = questions.find(q => line.startsWith(`${q.question.replace(/\s+/g, ' ').trim()}：`));
    if (question) {
      if ((question.blockId || taskTargetId) !== targetId) return [];
      const answer = line.slice(`${question.question.replace(/\s+/g, ' ').trim()}：`.length).trim();
      return answer ? [answer] : [];
    }
    return taskTargetId === targetId ? [line] : [];
  });
  return [
    ...turns.flatMap((turn, i) => turn.messageSource === 'suggestion' ? [] : extract(turn.text, turns[i - 1]?.questions || [])),
    ...(source === 'suggestion' ? [] : extract(text, turns.at(-1)?.questions || [])),
  ];
}

/**
 * Sanitizes a model-generated followup candidate:
 * - Eliminates forbidden role escalation words (主导、独立负责、精通)
 * - Eliminates ungrounded numbers unless present in source text
 * - Eliminates banned unmentioned tools
 * - Converts question formats to user first-person action statements
 */
export function sanitizeModelFollowup(
  rawText: string,
  sourceContent?: string,
): string | null {
  if (!rawText || typeof rawText !== 'string') return null;

  let cleaned = rawText
    .replace(/^[\d+.\-•*#\s]+/, '')
    .replace(/^[“"「『]|["”」』]$/g, '')
    .trim();

  if (cleaned.length < 6 || cleaned.length > 36) return null;

  // 1. Role escalation check
  if (/独立负责|主导|统筹全局|核心架构师|精通/.test(cleaned)) {
    return null;
  }

  // 2. Ungrounded number check
  const sourceNums: string[] = sourceContent
    ? plainText(sourceContent).match(/\d+/g) || []
    : [];
  const candidateNums: string[] = cleaned.match(/\d+/g) || [];
  const hasInventedNum = candidateNums.some((n) => !sourceNums.includes(n));
  if (hasInventedNum) {
    return null;
  }

  // 3. Unverified foreign tools/buzzwords check
  const sourceTools = new Set(
    (plainText(sourceContent || '').match(/[A-Za-z][A-Za-z0-9+#.-]*/g) || [])
      .map((token) => token.toLowerCase()),
  );
  const tools = cleaned.match(/[A-Za-z][A-Za-z0-9+#.-]*/g) || [];
  if (tools.some((token) => !sourceTools.has(token.toLowerCase()))) return null;

  // 4. Normalize to actionable first-person user request
  if (/^是否可以|^能否|^可以帮我|^可否/.test(cleaned)) {
    cleaned = cleaned.replace(/^是否可以|^能否|^可以帮我|^可否/, '帮我');
  } else if (/^建议|^可以考虑|^你可以/.test(cleaned)) {
    cleaned = cleaned.replace(/^建议|^可以考虑|^你可以/, '帮我');
  }

  if (cleaned.endsWith('？') || cleaned.endsWith('?')) {
    cleaned = cleaned.replace(/[？?]$/, '');
    if (!/^帮我|^请|^补充|^突出|^明确|^对照/.test(cleaned)) {
      cleaned = `帮我${cleaned}`;
    }
  }

  return cleaned.length >= 6 && cleaned.length <= 36 ? cleaned : null;
}

export interface BlockSummary {
  blockId: string;
  sectionTitle: string;
  label: string;
  content: string;
  type?: string;
}

/**
 * Finds the next unpolished or concise section block to optimize.
 */
export function findNextBlockToOptimize(
  allBlocks: BlockSummary[],
  currentBlockId?: string,
  reviewedBlockIds?: Set<string>,
): { blockId: string; label: string } | null {
  if (!allBlocks || allBlocks.length === 0) return null;

  // Candidate pool excluding current active block
  const candidates = allBlocks.filter((b) =>
    b.blockId !== currentBlockId && !reviewedBlockIds?.has(b.blockId) &&
    plainText(b.content).trim().length > 0,
  );
  if (candidates.length === 0) return null;

  // Priority ranking for resume modules
  const modulePriority = (title: string, type: string = '') => {
    const combined = `${title} ${type}`.toLowerCase();
    if (/项目|project/.test(combined)) return 1;
    if (/经历|工作|实习|experience|intern/.test(combined)) return 2;
    if (/教育|学历|education/.test(combined)) return 3;
    if (/技能|skill/.test(combined)) return 4;
    if (/评价|总结|self|summary/.test(combined)) return 5;
    return 6;
  };

  const sorted = [...candidates].sort((a, b) => {
    // Unreviewed blocks come first
    const aReviewed = reviewedBlockIds?.has(a.blockId) ? 1 : 0;
    const bReviewed = reviewedBlockIds?.has(b.blockId) ? 1 : 0;
    if (aReviewed !== bReviewed) return aReviewed - bReviewed;

    // Followed by module priority
    const aPrio = modulePriority(a.sectionTitle, a.type);
    const bPrio = modulePriority(b.sectionTitle, b.type);
    if (aPrio !== bPrio) return aPrio - bPrio;

    // Followed by non-empty blocks that need polish (e.g. shorter content)
    const aLen = plainText(a.content).length;
    const bLen = plainText(b.content).length;
    return aLen - bLen;
  });

  const target = sorted[0];
  if (!target) return null;

  const displayLabel = [target.sectionTitle, target.label]
    .filter(Boolean)
    .join(' · ');
  return {
    blockId: target.blockId,
    label: displayLabel,
  };
}

export interface FollowupGenerationContext {
  questions: DraftAnswer['questions'];
  proposals: CheckedProposal[];
  followups?: string[]; // model's proposed followups
  missingFacts?: MissingFact[];
  task?: AssistantTask;
  targetContent?: string;
  targetBlockId?: string;
  moduleType?: SectionModuleType;
  allBlocks?: BlockSummary[];
  historyTurns?: HistoryTurn[];
  reviewedBlockIds?: string[];
}

/**
 * Generates tailored, context-aware followup actions and options:
 * 1. Data Confirmation Guidance (when [X] exists)
 * 2. Next Block Polish Relay (seamless step-by-step optimization)
 * 3. Sanitized LLM-Generated Dynamic Inquiries
 * 4. Module-Specific Professional Refinements
 */
export function generateDynamicFollowups(
  context: FollowupGenerationContext,
): { followups: string[]; followupActions: FollowupAction[] } {
  // If there are unanswered clarifying questions, prompt user to answer or skip
  if (context.questions && context.questions.length > 0) {
    const actions: FollowupAction[] = [
      { text: '哪些信息是这次写作必须提供的？', kind: 'send_message' },
      { text: '不确定的信息可以先留空吗？', kind: 'send_message' },
    ];
    return {
      followups: actions.map((a) => a.text),
      followupActions: actions,
    };
  }

  // If no proposals were produced, guide user on how to proceed
  if (!context.proposals || context.proposals.length === 0) {
    const actions: FollowupAction[] = [
      { text: '帮我检查简历中哪些表述不够清楚。', kind: 'send_message' },
      { text: '说明哪些真实信息有助于完善表达。', kind: 'send_message' },
    ];
    return {
      followups: actions.map((a) => a.text),
      followupActions: actions,
    };
  }

  const actions: FollowupAction[] = [];
  const seenTexts = new Set<string>();

  const addAction = (action: FollowupAction) => {
    const norm = action.text.trim();
    if (!norm || seenTexts.has(norm)) return;
    seenTexts.add(norm);
    actions.push(action);
  };

  // 1. Data Confirmation Guidance: if output contains [X] or missingFacts
  const hasPlaceholders = context.proposals.some((p) =>
    p.action === 'updateBlock' ? /\[X\]/i.test(p.html) : false,
  );
  const placeholderCount = (context.missingFacts && context.missingFacts.length > 0)
    ? context.missingFacts.length
    : 0;

  if (hasPlaceholders || placeholderCount > 0) {
    addAction({
      text:
        placeholderCount > 0
          ? `针对正文中 ${placeholderCount} 处待确认数据，帮我给出估算思路`
          : '针对正文中的待确认数据，帮我给出估算思路',
      kind: 'send_message',
    });
  }

  // 2. Next Block Polish Relay: step-by-step progress through resume
  if (context.allBlocks && context.allBlocks.length > 0) {
    const activeBlockId = context.targetBlockId || context.task?.blockId;
    const nextBlock = findNextBlockToOptimize(context.allBlocks, activeBlockId, new Set(context.reviewedBlockIds || []));
    if (nextBlock) {
      addAction({
        text: `👉 继续优化下一段：${nextBlock.label}`,
        kind: 'next_block',
        targetBlockId: nextBlock.blockId,
        targetBlockLabel: nextBlock.label,
      });
    }
  }

  // 3. Sanitized LLM-generated dynamic followups
  if (context.followups && Array.isArray(context.followups)) {
    for (const raw of context.followups) {
      const sanitized = sanitizeModelFollowup(raw, context.targetContent);
      if (sanitized) {
        addAction({
          text: sanitized,
          kind: 'send_message',
        });
        if (actions.length >= 3) break;
      }
    }
  }

  // 4. Module-specific deep-dive suggestions
  const mod = context.moduleType || 'experience';
  if (mod === 'project') {
    addAction({
      text: '补充我在该项目中的技术难点与具体解决方案',
      kind: 'send_message',
    });
    addAction({
      text: '明确我在此项目中的个人具体分工与协作边界',
      kind: 'send_message',
    });
  } else if (mod === 'skills') {
    addAction({
      text: '对照目标岗位要求，帮我调整技能展示优先级',
      kind: 'send_message',
    });
  } else if (mod === 'self-evaluation') {
    addAction({
      text: '强化与目标岗位的匹配度，突出核心职业优势',
      kind: 'send_message',
    });
  } else if (mod === 'education') {
    addAction({
      text: '补充在校期间与求职岗位相关的核心专业课程',
      kind: 'send_message',
    });
  } else if (mod === 'experience' || mod === 'internship') {
    addAction({
      text: '补充我在团队协同和需求对齐中的执行细节',
      kind: 'send_message',
    });
  }

  // General polish fallback: concise rewriting
  addAction({
    text: '帮我进一步精简表达，保留原有事实。',
    kind: 'send_message',
  });
  addAction({
    text: '说明这次修改的差异和需要核对的表述。',
    kind: 'send_message',
  });

  // Take top 3
  const finalActions = actions.slice(0, 3);
  return {
    followups: finalActions.map((a) => a.text),
    followupActions: finalActions,
  };
}
