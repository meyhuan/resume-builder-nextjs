import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BlockWrapper from '@/components/blocks/block-wrapper';
import SectionHeader from '@/components/sections/section-header';
import EditableFieldWrapper from '@/editor/editable-field-wrapper';
import { EditableText } from '@/templates/_core/primitives/editable-text';
import { SectionTitleText } from '@/components/sections/section-title-text';
import { ResumeActionWorkspace } from '@/components/blocks/resume-action-dock';

const store = vi.hoisted(() => ({ readOnly: false, setResume: vi.fn() }));

// Only external store/telemetry dependencies are replaced. Actual hover owners,
// action toolbar, buttons, and section-title component run unchanged.
vi.mock('@/state/store', () => ({
  useAppStore: (selector: (state: typeof store) => unknown) => selector(store),
}));
vi.mock('@/lib/ai/unified/use-impression', () => ({ useAiImpression: () => () => {} }));
vi.mock('@/lib/ai/unified/analytics', () => ({ trackAssistant: vi.fn() }));

describe('action dock ownership', () => {
  function mount(disabled = false) {
    const firstDelete = vi.fn();
    const secondDelete = vi.fn();
    const view = render(<ResumeActionWorkspace>
      <section data-resume-edit-region="section"><h2>项目经历</h2>
        <BlockWrapper blockType="内容" onDelete={firstDelete} disableHover={disabled}><p>第一条正文</p></BlockWrapper>
        <BlockWrapper blockType="内容" onDelete={secondDelete}><p>第二条正文</p></BlockWrapper>
      </section>
    </ResumeActionWorkspace>);
    return { view, firstDelete, secondDelete, first: screen.getByText('第一条正文'), second: screen.getByText('第二条正文') };
  }

  it('keeps the selected target while crossing other rows on the way to the dock', () => {
    const { first, second, firstDelete, secondDelete } = mount();
    fireEvent.click(first);
    const action = screen.getByRole('button', { name: '删除' });
    expect(first.closest('[data-resume-edit-region="block"]')?.contains(action)).toBe(false);
    move(first, second);
    advance(500);
    move(second, action);
    advance(500);
    expect(screen.getByText('项目经历 · 第 1 条')).not.toBeNull();
    fireEvent.click(action);
    expect(firstDelete).toHaveBeenCalledOnce();
    expect(secondDelete).not.toHaveBeenCalled();
  });

  it('switches actions only on explicit selection and clears on a background click', () => {
    const { first, second, firstDelete, secondDelete } = mount();
    fireEvent.click(first);
    fireEvent.click(second);
    expect(screen.getAllByRole('button', { name: '删除' })).toHaveLength(1);
    expect(screen.getByText('项目经历 · 第 2 条')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '删除' }));
    expect(firstDelete).not.toHaveBeenCalled();
    expect(secondDelete).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('heading'));
    expect(screen.queryByRole('button', { name: '删除' })).toBeNull();
  });

  it('supports Alt+F10 to enter the dock and Escape to return to the selected block', () => {
    const { first } = mount();
    const block = first.closest('[data-resume-edit-region="block"]') as HTMLElement;
    act(() => block.focus());
    fireEvent.keyDown(block, { key: 'F10', altKey: true });
    const action = screen.getByRole('button', { name: '删除' });
    expect(document.activeElement).toBe(action);
    fireEvent.keyDown(action, { key: 'Escape' });
    expect(document.activeElement).toBe(block);
  });

  it('removes the old dock actions when the selected block unmounts', () => {
    const { first, view } = mount();
    fireEvent.click(first);
    view.rerender(<ResumeActionWorkspace><p>条目已删除</p></ResumeActionWorkspace>);
    expect(screen.queryByRole('button', { name: '删除' })).toBeNull();
  });

  it('retains ownership when a move replaces its own clicked button synchronously', async () => {
    const draw = (reversed: boolean) => <StrictMode><ResumeActionWorkspace>
      <section data-resume-edit-region="section"><h2>项目经历</h2>
        {(reversed ? ['second', 'first'] : ['first', 'second']).map((key) =>
          <BlockWrapper key={key} blockType="项目" onDelete={() => {}}
            onMoveDown={key === 'first' && !reversed ? () => view.rerender(draw(true)) : undefined}
            onMoveUp={key === 'first' && reversed ? () => {} : undefined}>
            <p>{key}</p>
          </BlockWrapper>)}
      </section>
    </ResumeActionWorkspace></StrictMode>;
    const view = render(draw(false));
    fireEvent.click(screen.getByText('first'));
    fireEvent.click(screen.getByRole('button', { name: '下移' }));
    advance(0);
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText('项目经历 · 第 2 条')).not.toBeNull();
    expect(screen.getByRole('button', { name: '上移' })).not.toBeNull();
  });

  it('suppresses actions while rich text is being edited', () => {
    const { first } = mount(true);
    fireEvent.click(first);
    expect(screen.queryByRole('button', { name: '删除' })).toBeNull();
  });

  it('has no editing dock in read-only mode', () => {
    store.readOnly = true;
    const { first } = mount();
    fireEvent.click(first);
    expect(document.querySelector('[data-resume-action-dock]')).toBeNull();
  });
});

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
