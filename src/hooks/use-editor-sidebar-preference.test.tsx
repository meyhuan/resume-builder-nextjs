import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useEditorUiStore } from '@/state/editor-ui-store';
import {
  EDITOR_SIDEBAR_PREFERENCE_KEY,
  useEditorSidebarPreference,
} from './use-editor-sidebar-preference';

const key = (mode = 'desktop') => `${EDITOR_SIDEBAR_PREFERENCE_KEY}:${mode}`;
const width = (value: number) =>
  Object.defineProperty(window, 'innerWidth', { configurable: true, value });
beforeEach(() => {
  localStorage.clear();
  width(1440);
  useEditorUiStore.setState(useEditorUiStore.getInitialState());
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('opens modules on the first desktop entry without recording a forced preference', () => {
  const { result } = renderHook(() => useEditorSidebarPreference('r'));
  expect(result.current).toBe(true);
  expect(useEditorUiStore.getState()).toMatchObject({
    activePanel: 'sections',
    showAiChat: false,
  });
  expect(localStorage.getItem(key())).toBeNull();
});

it.each([375, 768, 1023])(
  'starts collapsed on a first narrow entry at %s px',
  (size) => {
    width(size);
    renderHook(() => useEditorSidebarPreference('r'));
    expect(useEditorUiStore.getState().activePanel).toBeNull();
  },
);

it('remembers the selected tool across editor remounts and different resumes', () => {
  const hook = renderHook(() => useEditorSidebarPreference('first'));
  act(() => useEditorUiStore.getState().setActivePanel('templates'));
  hook.unmount();
  useEditorUiStore.setState(useEditorUiStore.getInitialState());
  renderHook(() => useEditorSidebarPreference('second'));
  expect(useEditorUiStore.getState().activePanel).toBe('templates');
});

it('remembers explicit collapse without losing the last selected tool', () => {
  const hook = renderHook(() => useEditorSidebarPreference('r'));
  act(() => useEditorUiStore.getState().setActivePanel('layout'));
  act(() => useEditorUiStore.getState().setActivePanel(null));
  expect(JSON.parse(localStorage.getItem(key())!)).toEqual({
    open: false,
    panel: 'layout',
  });
  hook.unmount();
  useEditorUiStore.setState(useEditorUiStore.getInitialState());
  renderHook(() => useEditorSidebarPreference('r'));
  expect(useEditorUiStore.getState().activePanel).toBeNull();
});

it('keeps desktop and narrow preferences separate and records changes at the current viewport width', () => {
  const hook = renderHook(() => useEditorSidebarPreference('r'));
  act(() => useEditorUiStore.getState().setActivePanel('layout'));
  width(390);
  act(() => useEditorUiStore.getState().setActivePanel('ai'));
  act(() => useEditorUiStore.getState().setActivePanel(null));
  expect(JSON.parse(localStorage.getItem(key())!)).toEqual({
    open: true,
    panel: 'layout',
  });
  expect(JSON.parse(localStorage.getItem(key('narrow'))!)).toEqual({
    open: false,
    panel: 'ai',
  });
  hook.unmount();
  useEditorUiStore.setState(useEditorUiStore.getInitialState());
  const narrow = renderHook(() => useEditorSidebarPreference('r'));
  expect(useEditorUiStore.getState().activePanel).toBeNull();
  narrow.unmount();
  width(1440);
  renderHook(() => useEditorSidebarPreference('r'));
  expect(useEditorUiStore.getState().activePanel).toBe('layout');
});

it('never turns an automatic narrow collapse into the desktop preference', () => {
  localStorage.setItem(
    key(),
    JSON.stringify({ open: true, panel: 'templates' }),
  );
  width(390);
  renderHook(() => useEditorSidebarPreference('r'));
  expect(useEditorUiStore.getState().activePanel).toBeNull();
  expect(JSON.parse(localStorage.getItem(key())!)).toEqual({
    open: true,
    panel: 'templates',
  });
});

it.each(['polish', 'generate'] as const)(
  'restores %s as the idle AI tab, never as a previous task',
  (panel) => {
    const hook = renderHook(() => useEditorSidebarPreference('r'));
    act(() => useEditorUiStore.getState().setActivePanel(panel));
    expect(JSON.parse(localStorage.getItem(key())!)).toEqual({
      open: true,
      panel: 'ai',
    });
    hook.unmount();
    useEditorUiStore.setState({
      assistantTask: {
        id: 'stale',
        resumeId: 'r',
        feature: 'polish',
        blockId: 'b',
        label: '经历',
        entry: 'module',
      },
      assistantBusy: false,
    });
    renderHook(() => useEditorSidebarPreference('r'));
    expect(useEditorUiStore.getState()).toMatchObject({
      activePanel: 'ai',
      showAiChat: true,
      assistantTask: null,
    });
  },
);

it('lets a new module action open AI while retaining its exact task', () => {
  width(390);
  renderHook(() => useEditorSidebarPreference('r'));
  const task = {
    id: 'fresh',
    resumeId: 'r',
    feature: 'generate' as const,
    blockId: 'b',
    label: '经历',
    entry: 'module' as const,
  };
  act(() =>
    useEditorUiStore.setState({
      activePanel: 'ai',
      showAiChat: true,
      assistantTask: task,
    }),
  );
  expect(useEditorUiStore.getState().assistantTask).toBe(task);
  expect(useEditorUiStore.getState().activePanel).toBe('ai');
  expect(localStorage.getItem(key('narrow'))).not.toContain('fresh');
});

it('does not hide an explicitly pending handoff on initialization', () => {
  localStorage.setItem(
    key(),
    JSON.stringify({ open: false, panel: 'sections' }),
  );
  useEditorUiStore.setState({
    activePanel: 'ai',
    showAiChat: true,
    pendingAiMessage: '解释我的修改',
  });
  renderHook(() => useEditorSidebarPreference('r'));
  expect(useEditorUiStore.getState()).toMatchObject({
    activePanel: 'ai',
    pendingAiMessage: '解释我的修改',
  });
});

it.each([
  'bad json',
  '{"open":true,"panel":"unknown"}',
  '{"open":"false","panel":"layout"}',
  'null',
])('uses sensible defaults for invalid storage: %s', (raw) => {
  localStorage.setItem(key(), raw);
  renderHook(() => useEditorSidebarPreference('r'));
  expect(useEditorUiStore.getState().activePanel).toBe('sections');
});

it('still opens and switches tools when browser storage is blocked', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  renderHook(() => useEditorSidebarPreference('r'));
  expect(useEditorUiStore.getState().activePanel).toBe('sections');
  act(() => useEditorUiStore.getState().setActivePanel('layout'));
  expect(useEditorUiStore.getState().activePanel).toBe('layout');
});

it('unsubscribes on exit and restores the preference safely on a document change', () => {
  const hook = renderHook(({ id }) => useEditorSidebarPreference(id), {
    initialProps: { id: 'first' },
  });
  act(() => useEditorUiStore.getState().setActivePanel('layout'));
  hook.rerender({ id: 'second' });
  expect(hook.result.current).toBe(true);
  hook.unmount();
  useEditorUiStore.getState().setActivePanel('ai');
  expect(JSON.parse(localStorage.getItem(key())!)).toEqual({
    open: true,
    panel: 'layout',
  });
});
