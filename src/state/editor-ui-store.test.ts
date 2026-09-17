import { beforeEach, expect, it, vi } from 'vitest';
import { useEditorUiStore } from './editor-ui-store';

beforeEach(() => useEditorUiStore.setState(useEditorUiStore.getInitialState()));
it('switches between tools and AI without overlapping panels', () => {
  const store = useEditorUiStore.getState();
  store.setActivePanel('layout');
  store.toggleAiChat();
  expect(useEditorUiStore.getState()).toMatchObject({ activePanel: 'ai', showAiChat: true });
  store.setActivePanel('sections');
  expect(useEditorUiStore.getState()).toMatchObject({ activePanel: 'sections', showAiChat: false });
  store.setShowAiChat(false);
  expect(useEditorUiStore.getState().activePanel).toBe('sections');
  store.setActivePanel('polish');
  store.toggleAiChat();
  store.toggleAiChat();
  expect(useEditorUiStore.getState().activePanel).toBeNull();
});
it('hands a modal task to the same AI workspace', () => {
  vi.useFakeTimers();
  useEditorUiStore.getState().openModal('jd-analysis');
  useEditorUiStore.getState().handoffToChat('优化经历');
  vi.runAllTimers();
  expect(useEditorUiStore.getState()).toMatchObject({ activeModal: null, activePanel: 'ai', pendingAiMessage: '优化经历' });
  vi.useRealTimers();
});
