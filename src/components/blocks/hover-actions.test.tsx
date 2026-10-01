import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BlockWrapper from '@/components/blocks/block-wrapper';
import SectionHeader from '@/components/sections/section-header';
import EditableFieldWrapper from '@/editor/editable-field-wrapper';
import { EditableText } from '@/templates/_core/primitives/editable-text';
import { SectionTitleText } from '@/components/sections/section-title-text';

const store = vi.hoisted(() => ({ readOnly: false, setResume: vi.fn() }));

// Only external store/telemetry dependencies are replaced. Actual hover owners,
// action toolbar, buttons, and section-title component run unchanged.
vi.mock('@/state/store', () => ({
  useAppStore: (selector: (state: typeof store) => unknown) => selector(store),
}));
vi.mock('@/lib/ai/unified/use-impression', () => ({ useAiImpression: () => () => {} }));
vi.mock('@/lib/ai/unified/analytics', () => ({ trackAssistant: vi.fn() }));

it('lets a module title contain spaces and commits Enter without reopening its editor', () => {
  const commit = vi.fn();
  render(<SectionTitleText value="教育经历" onCommit={commit} />);
  fireEvent.keyDown(screen.getByRole('heading'), { key: 'Enter' });
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: '教育 与培训' } });
  fireEvent.keyDown(input, { key: ' ' });
  expect((input as HTMLInputElement).value).toBe('教育 与培训');
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(commit).toHaveBeenCalledOnce();
  expect(commit).toHaveBeenCalledWith('教育 与培训');
  expect(screen.queryByRole('textbox')).toBeNull();
});

beforeEach(() => { store.readOnly = false; vi.useFakeTimers(); });
afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
});

function advance(milliseconds: number): void {
  act(() => vi.advanceTimersByTime(milliseconds));
}

function move(from: Element, to: Element): void {
  // Native over/out plus relatedTarget exercise React's enter/leave plugin.
  // JSDOM has no physical pointer or CSS hit testing. Browser QA covers those.
  fireEvent.mouseOut(from, { relatedTarget: to });
  fireEvent.mouseOver(to, { relatedTarget: from });
}

const targets = [
  {
    name: 'BlockWrapper (used by current qingning template)',
    buttonName: '添加教育经历',
    mount(onAdd: () => void) {
      const view = render(<BlockWrapper blockType="教育经历" onAdd={onAdd} onDelete={() => {}}>
        <p data-testid="content">教育经历正文</p>
      </BlockWrapper>);
      return { view, content: screen.getByTestId('content') };
    },
  },
  {
    name: 'SectionHeader (legacy shared component)',
    buttonName: '添加',
    mount(onAdd: () => void) {
      const view = render(<SectionHeader sectionId={'hover-audit' as never} title="教育经历"
        themeColor="#7c3aed" onAdd={onAdd} onDelete={() => {}} />);
      return { view, content: screen.getByRole('heading', { name: '教育经历' }) };
    },
  },
];

for (const target of targets) {
  describe(target.name, () => {
    function start() {
      const onAdd = vi.fn();
      const { content } = target.mount(onAdd);
      move(document.body, content);
      const button = screen.getByRole('button', { name: target.buttonName });
      return { content, button, onAdd };
    }

    it('shows a reachable action on entry, and clicking it calls the handler once', () => {
      const { content, button, onAdd } = start();
      move(content, button);
      advance(250);
      fireEvent.click(screen.getByRole('button', { name: target.buttonName }));
      expect(onAdd).toHaveBeenCalledTimes(1);
    });

    it('keeps actions when moving between toolbar buttons', () => {
      const { content, button } = start();
      move(content, button);
      move(button, screen.getByRole('button', { name: '删除' }));
      advance(250);
      expect(screen.queryByRole('button', { name: target.buttonName })).not.toBeNull();
    });

    it('hides actions 200 ms after leaving the content for outside', () => {
      const { content } = start();
      move(content, document.body);
      advance(199);
      expect(screen.queryByRole('button', { name: target.buttonName })).not.toBeNull();
      advance(1);
      expect(screen.queryByRole('button', { name: target.buttonName })).toBeNull();
    });

    it('cancels a single leave timer when returning to content after 100 ms', () => {
      const { content } = start();
      move(content, document.body);
      advance(100);
      move(document.body, content);
      advance(150);
      expect(screen.queryByRole('button', { name: target.buttonName })).not.toBeNull();
    });

    it('keeps actions after toolbar -> outside -> button within 100 ms', () => {
      const { content, button } = start();
      move(content, button);
      move(button, document.body);
      advance(100);
      move(document.body, button);
      advance(150);
      expect(screen.queryByRole('button', { name: target.buttonName })).not.toBeNull();
    });

    it('keeps actions after toolbar -> content without leaving the hover owner', () => {
      const { content, button } = start();
      move(content, button);
      move(button, content);
      advance(250);
      expect(screen.queryByRole('button', { name: target.buttonName })).not.toBeNull();
    });

    it('owns only one pending hide timer when leaving a toolbar descendant', () => {
      const { content, button } = start();
      move(content, button);
      move(button, document.body);
      expect(vi.getTimerCount()).toBe(1);
    });

    it('keeps focused actions when the pointer leaves, then hides on focus exit', () => {
      const { content, button } = start();
      move(content, button);
      act(() => button.focus());
      move(button, document.body);
      advance(700);
      expect(screen.queryByRole('button', { name: target.buttonName })).not.toBeNull();
      fireEvent.blur(button, { relatedTarget: document.body });
      expect(screen.queryByRole('button', { name: target.buttonName })).toBeNull();
    });

    it('cancels pending hide timers on unmount', () => {
      const { content, view } = target.mount(vi.fn());
      move(document.body, content);
      move(content, document.body);
      expect(vi.getTimerCount()).toBe(1);
      view.unmount();
      expect(vi.getTimerCount()).toBe(0);
    });

    it('does not expose actions in a read-only preview', () => {
      store.readOnly = true;
      const { content } = target.mount(vi.fn());
      move(document.body, content);
      expect(screen.queryByRole('button', { name: target.buttonName })).toBeNull();
    });
  });
}

it('removes actions and clears pending work while inline editing disables them', () => {
  const view = render(<BlockWrapper blockType="内容" onAdd={() => {}}><p>正文</p></BlockWrapper>);
  const content = screen.getByText('正文');
  move(document.body, content);
  move(content, document.body);
  view.rerender(<BlockWrapper blockType="内容" onAdd={() => {}} disableHover><p>正文</p></BlockWrapper>);
  expect(screen.queryByRole('button', { name: '添加内容' })).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
  expect(view.container.querySelector('[data-resume-edit-state="editing"]')).not.toBeNull();
});

it('opens a structured field from keyboard focus and returns after Escape', () => {
  render(<EditableFieldWrapper blockId="block" fieldName="school" value="江城大学" onUpdate={() => {}} />);
  const field = screen.getByRole('button', { name: '江城大学' });
  fireEvent.keyDown(field, { key: 'Enter' });
  expect(screen.getByRole('textbox', { name: '学校名称' })).toBe(document.activeElement);
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  expect(screen.getByRole('button', { name: '江城大学' })).not.toBeNull();
});

it('opens a template name from the keyboard and commits once', () => {
  const onCommit = vi.fn();
  render(<EditableText value="李小满" onCommit={onCommit} />);
  fireEvent.keyDown(screen.getByText('李小满'), { key: 'Enter' });
  const input = screen.getByRole('textbox');
  expect(input).toBe(document.activeElement);
  fireEvent.change(input, { target: { value: '李明' } });
  fireEvent.blur(input);
  expect(onCommit).toHaveBeenCalledExactlyOnceWith('李明');
});

it('keeps a read-only template name free of editing affordances', () => {
  store.readOnly = true;
  const onCommit = vi.fn();
  const view = render(<EditableText value="李小满" onCommit={onCommit} />);
  fireEvent.click(screen.getByText('李小满'));
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(view.container.querySelector('[data-resume-edit-field]')).toBeNull();
  expect(onCommit).not.toHaveBeenCalled();
});
