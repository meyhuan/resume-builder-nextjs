import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { UnifiedFollowupForm } from './unified-followup-form';

afterEach(cleanup);
it('clears facts when switching the target and submits only facts for the selected block', () => {
  const submit = vi.fn();
  render(
    <UnifiedFollowupForm
      topic="all"
      targets={[
        { id: 'b', label: '读书会' },
        { id: 'c', label: '志愿服务' },
      ]}
      onSubmit={submit}
      onCancel={() => {}}
    />,
  );
  fireEvent.change(screen.getByLabelText('实际服务规模'), {
    target: { value: '47人次' },
  });
  fireEvent.change(screen.getByLabelText('补充到哪段经历'), {
    target: { value: 'c' },
  });
  expect(
    (screen.getByLabelText('实际服务规模') as HTMLTextAreaElement).value,
  ).toBe('');
  expect(
    (
      screen.getByRole('button', {
        name: '提交补充并润色',
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.click(screen.getAllByRole('button', { name: '没有' })[2]);
  fireEvent.click(screen.getByRole('button', { name: '提交补充并润色' }));
  expect(submit).toHaveBeenCalledTimes(1);
  expect(submit.mock.calls[0][0]).toContain('没有可补充的信息，请保留原文');
  expect(submit.mock.calls[0][0]).not.toContain('47');
  expect(submit.mock.calls[0][1]).toBe('c');
});
