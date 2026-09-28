import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AiSectionProvider, { useAiSection } from './ai-section-provider';
import { useAppStore } from '@/state/store';
import { useEditorUiStore } from '@/state/editor-ui-store';
import type { ResumeData } from '@/entities/resume/resume-data';

vi.mock('@/templates/template-loader', () => ({ TEMPLATE_REGISTRY: {} }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));
vi.mock('@/lib/ai/unified/analytics', () => ({ trackAssistant: vi.fn() }));
// Isolate provider routing and write-back from model/network and form internals.
vi.mock('./ai-polish-sheet', () => ({
  default: (p: {
    open: boolean;
    originalContent: string;
    onInsert: (html: string) => void;
    onOpenChange: (open: boolean) => void;
  }) =>
    p.open ? (
      <section aria-label="润色表单">
        <span>{p.originalContent}</span>
        <button onClick={() => p.onInsert('<p>润色结果</p>')}>应用润色</button>
        <button onClick={() => p.onOpenChange(false)}>关闭润色</button>
      </section>
    ) : null,
}));
vi.mock('./ai-generate-sheet', () => ({
  default: (p: { open: boolean; onInsert: (html: string) => void }) =>
    p.open ? (
      <section aria-label="生成表单">
        <button onClick={() => p.onInsert('<p>生成结果</p>')}>应用生成</button>
      </section>
    ) : null,
}));

function Entry() {
  const ai = useAiSection();
  return (
    <>
      <button onClick={() => ai.openPolish('b', '<p>原文</p>', 'experience')}>
        润色入口
      </button>
      <button onClick={() => ai.openGenerate('b', 'experience')}>
        生成入口
      </button>
    </>
  );
}
function viewport(width: number) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: width >= 768 })),
  );
}
beforeEach(() => {
  viewport(390);
  useEditorUiStore.setState(useEditorUiStore.getInitialState());
  useAppStore.setState({
    resume: {
      id: 'r',
      name: '测试',
      sections: [
        {
          id: 's',
          title: '经历',
          blocks: [
            { id: 'b', type: 'text', html: '<p>原文</p>' },
            { id: 'other', type: 'text', html: '<p>其他段落</p>' },
          ],
        },
      ],
    } as ResumeData,
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it.each([390, 767])(
  'keeps mobile polish at %ipx and writes only its target',
  (width) => {
    viewport(width);
    render(
      <AiSectionProvider>
        <Entry />
      </AiSectionProvider>,
    );
    fireEvent.click(screen.getByText('润色入口'));
    expect(screen.getByLabelText('润色表单')).toBeTruthy();
    expect(useEditorUiStore.getState()).toMatchObject({
      activePanel: 'polish',
      assistantTask: null,
    });
    fireEvent.click(screen.getByText('应用润色'));
    expect(useAppStore.getState().resume.sections[0].blocks).toMatchObject([
      { id: 'b', html: '<p>润色结果</p>' },
      { id: 'other', html: '<p>其他段落</p>' },
    ]);
    fireEvent.click(screen.getByText('关闭润色'));
    expect(useEditorUiStore.getState().activePanel).toBeNull();
  },
);
it('switches mobile forms and retains generation write-back', () => {
  render(
    <AiSectionProvider>
      <Entry />
    </AiSectionProvider>,
  );
  fireEvent.click(screen.getByText('润色入口'));
  fireEvent.click(screen.getByText('生成入口'));
  expect(screen.queryByLabelText('润色表单')).toBeNull();
  expect(screen.getByLabelText('生成表单')).toBeTruthy();
  expect(useEditorUiStore.getState()).toMatchObject({
    activePanel: 'generate',
    assistantTask: null,
  });
  fireEvent.click(screen.getByText('应用生成'));
  expect(useAppStore.getState().resume.sections[0].blocks[0]).toMatchObject({
    html: '<p>生成结果</p>',
  });
});
it('honors the existing mobile access gate for both actions', () => {
  const gate = vi.fn(() => false);
  render(
    <AiSectionProvider requireVip={gate}>
      <Entry />
    </AiSectionProvider>,
  );
  fireEvent.click(screen.getByText('润色入口'));
  fireEvent.click(screen.getByText('生成入口'));
  expect(gate).toHaveBeenCalledTimes(2);
  expect(screen.queryByLabelText('润色表单')).toBeNull();
  expect(screen.queryByLabelText('生成表单')).toBeNull();
  expect(useEditorUiStore.getState().assistantTask).toBeNull();
});
it.each(['润色入口', '生成入口'])(
  'routes desktop %s into the unified assistant at 768px',
  (entry) => {
    viewport(768);
    render(
      <AiSectionProvider>
        <Entry />
      </AiSectionProvider>,
    );
    fireEvent.click(screen.getByText(entry));
    expect(useEditorUiStore.getState()).toMatchObject({
      activePanel: 'ai',
      assistantTask: {
        blockId: 'b',
        feature: entry === '润色入口' ? 'polish' : 'generate',
      },
    });
    expect(screen.queryByLabelText('润色表单')).toBeNull();
    expect(screen.queryByLabelText('生成表单')).toBeNull();
  },
);
