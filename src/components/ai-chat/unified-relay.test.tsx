import { expect, it, vi } from 'vitest';
vi.mock('@/templates/template-loader', () => ({ TEMPLATE_REGISTRY: {} }));
import { completedRelayBlocks, relayFollowups } from './unified-relay';
import { targetSnapshot } from '@/lib/ai/unified/policy';
import { findNextBlockToOptimize, sanitizeModelFollowup } from '@/lib/ai/unified/followups';
import { assistantEventSchema } from '@/lib/ai/unified/stream';
import type { ResumeData } from '@/entities/resume/resume-data';
import type { AssistantTurn, AssistantSession } from '@/lib/ai/unified/types';
import type { UndoReceipt } from './unified-changes';

const resume = { id: 'r', sections: [{ id: 's', title: '项目经历', blocks: [
  { id: 'empty', type: 'text', html: '<p><br></p>' },
  { id: 'a', type: 'text', html: '<p>项目一</p>' },
  { id: 'b', type: 'text', html: '<p>项目二</p>' },
] }] } as ResumeData;
const turn: AssistantTurn = { requestId: 'req', text: '润色', answer: '', questions: [],
  proposals: [{ action: 'updateBlock', blockId: 'a', html: '<p>项目一</p>', before: targetSnapshot(resume, 'a'), targetLabel: '项目', factChecked: true }],
  followups: ['👉 继续优化下一段：项目经历 · 文本模块'],
  followupActions: [{ text: '👉 继续优化下一段：项目经历 · 文本模块', kind: 'next_block', targetBlockId: 'b' }],
  direct: false, charged: true, feature: 'polish',
};
function session(): AssistantSession & { receipts: Record<string, UndoReceipt> } {
  return { task: { id: 'task', resumeId: 'r', feature: 'polish', entry: 'module', blockId: 'a', label: '项目' }, turns: [turn], reviews: {}, receipts: {}, updatedAt: 1 };
}
it('preserves structured IDs through actual response validation', () => {
  const result = assistantEventSchema.parse({ type: 'result', requestId: 'req', turn });
  expect(result.type === 'result' && result.turn.followupActions?.[0].targetBlockId).toBe('b');
});
it('waits for review, uses IDs for duplicate labels, and invalidates completion after edits or undo', () => {
  const s = session();
  expect(relayFollowups(turn, s, [s], resume)).toEqual([]);
  s.reviews['req:0'] = 'applied';
  s.receipts['req:0'] = { resumeId: 'r', before: resume, after: resume, targets: ['a'] };
  expect(completedRelayBlocks([s], resume)).toEqual(['a']);
  expect(relayFollowups(turn, s, [s], resume)[0].targetBlockId).toBe('b');
  const changed = structuredClone(resume);
  Object.assign(changed.sections[0].blocks[1], { html: '<p>用户修改</p>' });
  expect(completedRelayBlocks([s], changed)).toEqual([]);
  s.reviews['req:0'] = 'undone';
  expect(completedRelayBlocks([s], resume)).toEqual([]);
  expect(relayFollowups(turn, s, [s], resume)).toEqual([]);
  s.reviews['req:0'] = 'kept';
  expect(completedRelayBlocks([s], resume)).toEqual(['a']);
});
it('skips empty and completed blocks and stops when all are finished', () => {
  const blocks = resume.sections[0].blocks.map(b => ({ blockId: b.id, sectionTitle: '项目经历', label: '文本模块', content: 'html' in b ? b.html : '' }));
  expect(findNextBlockToOptimize(blocks, 'a', new Set(['a']))?.blockId).toBe('b');
  expect(findNextBlockToOptimize(blocks, 'b', new Set(['a', 'b']))).toBeNull();
});
it('matches literal tools, rejects unsupported tools, and safely handles model regex characters', () => {
  expect(sanitizeModelFollowup('补充 Postman 的实际使用方式', '使用 Postman 测试')).not.toBeNull();
  expect(() => sanitizeModelFollowup('补充 Postman 的使用方式（如[', '使用 Postman 测试')).not.toThrow();
  expect(sanitizeModelFollowup('补充 Kubernetes 的使用经验', '整理文件')).toBeNull();
  expect(sanitizeModelFollowup('补充 Pytest 的使用经验', '使用 Postman 测试')).toBeNull();
});
