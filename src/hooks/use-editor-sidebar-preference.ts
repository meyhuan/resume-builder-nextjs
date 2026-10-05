'use client';

import { useEffect, useState } from 'react';
import { useEditorUiStore } from '@/state/editor-ui-store';

export const EDITOR_SIDEBAR_PREFERENCE_KEY =
  'resume-editor-sidebar-preference-v1';
const PANELS = ['sections', 'layout', 'templates', 'portfolio', 'ai'] as const;
type SavedPanel = (typeof PANELS)[number];
type Preference = { open: boolean; panel: SavedPanel };
type Viewport = 'desktop' | 'narrow';
const viewport = (): Viewport =>
  window.innerWidth >= 1024 ? 'desktop' : 'narrow';
const storageKey = (mode: Viewport) =>
  `${EDITOR_SIDEBAR_PREFERENCE_KEY}:${mode}`;

function readPreference(mode: Viewport): Preference | null {
  try {
    const raw = window.localStorage.getItem(storageKey(mode));
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (typeof value?.open === 'boolean' && PANELS.includes(value.panel))
      return value;
  } catch {
    // A blocked or outdated preference must not prevent editing.
  }
  return null;
}

function savedPanel(
  panel: ReturnType<typeof useEditorUiStore.getState>['activePanel'],
): SavedPanel | null {
  // Persist the AI tab, never a transient generation surface or its task data.
  return panel === 'polish' || panel === 'generate' ? 'ai' : panel;
}

/** Restore only after hydration and before mounting the assistant for a document. */
export function useEditorSidebarPreference(
  documentId: string,
  initialPanel: 'sections' | 'ai' = 'sections',
): boolean {
  const [initializedFor, setInitializedFor] = useState<string | null>(null);
  const initializationKey = `${documentId}:${initialPanel}`;
  useEffect(() => {
    const mode = viewport();
    const preference = readPreference(mode) || {
      open: mode === 'desktop' || initialPanel === 'ai',
      panel: initialPanel,
    };
    const state = useEditorUiStore.getState();
    const hasPendingTask =
      Boolean(state.pendingAiMessage) ||
      (state.assistantBusy && state.assistantTask?.resumeId === documentId);
    const panel = hasPendingTask
      ? 'ai'
      : preference.open
        ? preference.panel
        : null;
    useEditorUiStore.setState({
      activePanel: panel,
      showAiChat: panel === 'ai',
      // Restoring a tool tab must not restart an old module generation request.
      assistantTask: hasPendingTask ? state.assistantTask : null,
      sectionAiTarget: hasPendingTask ? state.sectionAiTarget : '',
    });
    // Browser preferences are unavailable during SSR. This hydration gate keeps
    // the assistant from mounting with a stale task before restoration completes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInitializedFor(initializationKey);
    const unsubscribe = useEditorUiStore.subscribe((next, previous) => {
      if (next.activePanel === previous.activePanel) return;
      const currentMode = viewport();
      const panel =
        savedPanel(next.activePanel) ||
        savedPanel(previous.activePanel) ||
        readPreference(currentMode)?.panel ||
        'sections';
      try {
        window.localStorage.setItem(
          storageKey(currentMode),
          JSON.stringify({
            open: next.activePanel !== null,
            panel,
          } satisfies Preference),
        );
      } catch {
        // Tool switching still works when browser storage is unavailable.
      }
    });
    return unsubscribe;
  }, [documentId, initialPanel, initializationKey]);
  return initializedFor === initializationKey;
}
