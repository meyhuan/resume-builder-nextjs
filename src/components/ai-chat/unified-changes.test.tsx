import { beforeEach, it, expect, vi } from 'vitest';
vi.mock('@/templates/template-loader', () => ({ TEMPLATE_REGISTRY: {} }));
import { useAppStore } from '@/state/store';
import { applyChecked, undoChecked } from './unified-changes';
import { targetSnapshot } from '@/lib/ai/unified/policy';
import type { CheckedProposal } from '@/lib/ai/unified/types';
import type { ResumeData } from '@/entities/resume/resume-data';
const base = {
  id: 'r',
  name: '测试',
  sections: [
    {
      id: 's',
      title: '经历',
      blocks: [
        { id: 'b', type: 'text', html: '<p>协助登记</p>' },
        { id: 'c', type: 'text', html: '<p>另一段</p>' },
      ],
    },
  ],
} as ResumeData;
beforeEach(() =>
  useAppStore.setState({
    resume: structuredClone(base),
    pastStates: [],
    futureStates: [],
    readOnly: false,
  }),
);
const proposal = (): Extract<CheckedProposal, { action: 'updateBlock' }> => ({
  action: 'updateBlock',
  blockId: 'b',
  html: '<p>协助完成登记</p>',
  before: targetSnapshot(useAppStore.getState().resume, 'b'),
  targetLabel: '经历',
  factChecked: true,
});
it('preview is inert; application forms one independent undo boundary', () => {
  const p = proposal();
  expect(useAppStore.getState().pastStates).toHaveLength(0);
  const receipt = applyChecked([p], 'r');
  expect(receipt).not.toBeNull();
  expect(useAppStore.getState().pastStates).toHaveLength(1);
  useAppStore.getState().undo();
  expect(targetSnapshot(useAppStore.getState().resume, 'b')).toBe(p.before);
});
it('does not overwrite edits made after generation', () => {
  const p = proposal();
  useAppStore.getState().setResume((d) => {
    const b = d.sections[0].blocks[0];
    if (b.type === 'text') b.html = '手动编辑';
  });
  expect(applyChecked([p], 'r')).toBeNull();
});
it('selective undo preserves unrelated edits', () => {
  const receipt = applyChecked([proposal()], 'r')!;
  useAppStore.getState().setResume((d) => {
    const b = d.sections[0].blocks[1];
    if (b.type === 'text') b.html = '其它手动修改';
  });
  expect(undoChecked(receipt)).toBe(true);
  expect(targetSnapshot(useAppStore.getState().resume, 'c')).toContain(
    '其它手动修改',
  );
});
it('refuses stale undo and cross-resume application', () => {
  const receipt = applyChecked([proposal()], 'r')!;
  useAppStore.getState().setResume((d) => {
    const b = d.sections[0].blocks[0];
    if (b.type === 'text') b.html = '后来修改';
  });
  expect(undoChecked(receipt)).toBe(false);
  expect(applyChecked([proposal()], 'other')).toBeNull();
});
it('batch application is atomic and a single undo', () => {
  const p = proposal();
  const p2: CheckedProposal = {
    ...p,
    blockId: 'c',
    before: targetSnapshot(base, 'c'),
  };
  expect(applyChecked([p, p2], 'r')).not.toBeNull();
  expect(useAppStore.getState().pastStates).toHaveLength(1);
  useAppStore.getState().undo();
  expect(targetSnapshot(useAppStore.getState().resume, 'b')).toBe(p.before);
  expect(targetSnapshot(useAppStore.getState().resume, 'c')).toBe(p2.before);
});
