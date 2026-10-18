import type { ResumeData } from '@/entities/resume/resume-data';
import { toResumeContext } from '@/lib/ai/resume-context';
import { findNextBlockToOptimize } from '@/lib/ai/unified/followups';
import { snapshotsMatch, targetSnapshot } from '@/lib/ai/unified/policy';
import type { AssistantSession, AssistantTurn, FollowupAction } from '@/lib/ai/unified/types';
import type { UndoReceipt } from './unified-changes';

type RelaySession = AssistantSession & { receipts: Record<string, UndoReceipt> };

export function completedRelayBlocks(sessions: RelaySession[], resume: ResumeData): string[] {
  const completed = new Set<string>();
  for (const session of sessions) {
    if (session.task.resumeId !== resume.id) continue;
    for (const turn of session.turns) turn.proposals.forEach((p, index) => {
      if (p.action !== 'updateBlock') return;
      const key = `${turn.requestId}:${index}`;
      const status = session.reviews[key];
      const receipt = session.receipts[key];
      const snapshot = status === 'applied' && receipt
        ? targetSnapshot(receipt.after, p.blockId)
        : status === 'kept' ? p.before : undefined;
      if (snapshot && snapshotsMatch(snapshot, targetSnapshot(resume, p.blockId))) completed.add(p.blockId);
    });
  }
  return [...completed];
}

export function relayFollowups(turn: AssistantTurn, session: RelaySession, sessions: RelaySession[], resume: ResumeData): FollowupAction[] {
  const actions = turn.followups.flatMap((text, i) => {
    const action = turn.followupActions?.[i];
    if (action?.kind === 'next_block' || /^(?:👉\s*)?继续优化下一段：/.test(text)) return [];
    return [action || { text, kind: 'send_message' as const }];
  });
  const settled = turn.proposals.length > 0 && turn.proposals.every((_, i) =>
    ['applied', 'kept'].includes(session.reviews[`${turn.requestId}:${i}`]),
  );
  if (settled) {
    const blocks = toResumeContext(resume).sections.flatMap(s => s.blocks.map(b => ({ ...b, sectionTitle: s.title })));
    const completed = new Set(completedRelayBlocks(sessions, resume));
    const next = findNextBlockToOptimize(blocks, session.task.blockId, completed);
    if (next) actions.unshift({ text: `👉 继续优化下一段：${next.label}`, kind: 'next_block', targetBlockId: next.blockId, targetBlockLabel: next.label });
  }
  return actions.slice(0, 3);
}
