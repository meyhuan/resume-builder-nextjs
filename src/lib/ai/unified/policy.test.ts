import { describe, it, expect } from 'vitest';
import { explicitlyDirect, numericAdditions, followupsFor } from './policy';
import { taskSchema } from './types';
import { textDiff } from '@/components/ai-chat/unified-changes';
import { vi } from 'vitest';
vi.mock('@/templates/template-loader', () => ({ TEMPLATE_REGISTRY: {} }));
describe('single-turn authorization', () => {
  it.each([
    '帮我润色',
    '不要直接改',
    '如果合适就直接改',
    '比如直接修改这段',
    '“直接修改”是什么意思？',
    '先预览再直接改',
  ])('does not authorize %s', (text) =>
    expect(explicitlyDirect(text)).toBe(false),
  );
  it.each(['直接帮我改这段', '不用预览，直接替换原文', '请直接应用这次修改'])(
    'authorizes %s',
    (text) => expect(explicitlyDirect(text)).toBe(true),
  );
});
it('detects unsupported numbers and percentages', () =>
  expect(
    numericAdditions('协助处理10份材料', '主导处理100份材料，效率提高20%'),
  ).toEqual(['100', '20%']));
it('requires a block for module tasks', () =>
  expect(
    taskSchema.safeParse({
      id: crypto.randomUUID(),
      resumeId: 'r',
      feature: 'polish',
      label: '经历',
      entry: 'module',
    }).success,
  ).toBe(false));
it('always supplies related followups without another call', () =>
  expect(
    followupsFor({ questions: [], proposals: [], followups: [] }),
  ).toHaveLength(2));
it('Chinese difference preserves original and revised text', () => {
  const pieces = textDiff('协助登记物品', '协助完成物品登记');
  expect(
    pieces
      .filter((p) => p.kind !== 'add')
      .map((p) => p.text)
      .join(''),
  ).toBe('协助登记物品');
  expect(
    pieces
      .filter((p) => p.kind !== 'remove')
      .map((p) => p.text)
      .join(''),
  ).toBe('协助完成物品登记');
});

it('recognizes an explicit command around quoted replacement content, but not a quoted command', () => {
  expect(
    explicitlyDirect(
      '请直接替换这段：把“协助登记”改为“协助完成登记”，其余不变。',
    ),
  ).toBe(true);
  expect(explicitlyDirect('“直接修改这段”是什么意思？')).toBe(false);
});
