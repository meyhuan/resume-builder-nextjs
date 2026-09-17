import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from './section-ai-surface';
import { useEditorUiStore } from '@/state/editor-ui-store';

afterEach(() => { cleanup(); document.getElementById('editor-section-ai')?.remove(); });
function Form() {
  return <Sheet task="polish" open onOpenChange={() => {}}><SheetContent><SheetTitle>润色</SheetTitle><SheetDescription>修改这一段</SheetDescription><input aria-label="目标岗位" /></SheetContent></Sheet>;
}
it('docks without a blocking dialog and preserves the form while switching tools', () => {
  const host = document.createElement('div'); host.id = 'editor-section-ai'; document.body.append(host);
  useEditorUiStore.getState().setActivePanel('polish');
  render(<Form />);
  fireEvent.change(screen.getByLabelText('目标岗位'), { target: { value: '产品经理' } });
  expect(screen.queryByRole('dialog')).toBeNull();
  act(() => useEditorUiStore.getState().setActivePanel('layout'));
  expect(host.firstElementChild?.hasAttribute('hidden')).toBe(true);
  act(() => useEditorUiStore.getState().setActivePanel('polish'));
  expect((screen.getByLabelText('目标岗位') as HTMLInputElement).value).toBe('产品经理');
});
it('retains the modal sheet for mobile preview and other consumers without a dock', () => {
  render(<Form />);
  expect(screen.getByRole('dialog')).toBeTruthy();
});
