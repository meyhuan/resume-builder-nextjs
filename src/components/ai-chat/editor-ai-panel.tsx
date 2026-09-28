'use client';
import { useState, useEffect } from 'react';
import { AiChatPanel } from './ai-chat-panel';
import { UnifiedAssistant } from './unified-assistant';
import { useAppStore } from '@/state/store';
import { useEditorUiStore } from '@/state/editor-ui-store';
export function EditorAiPanel({ resumeId }: { readonly resumeId?: string }) {
  const storeId = useAppStore((s) => s.resume.id) || 'local';
  const documentId = resumeId || storeId;
  useEffect(() => {
    useEditorUiStore.setState({ assistantResumeId: documentId });
    return () => {
      useEditorUiStore.setState({ assistantResumeId: null });
    };
  }, [documentId]);
  const task = useEditorUiStore((s) => s.assistantTask);
  const [legacy, setLegacy] = useState(false);
  const pendingMessage = useEditorUiStore((s) => s.pendingAiMessage);
  useEffect(
    () =>
      useEditorUiStore.subscribe((next, previous) => {
        if (
          (next.assistantTask &&
            next.assistantTask !== previous.assistantTask) ||
          (next.pendingAiMessage &&
            next.pendingAiMessage !== previous.pendingAiMessage)
        )
          setLegacy(false);
      }),
    [],
  );
  if (legacy && !task && !pendingMessage)
    return (
      <div className="flex h-full flex-col">
        <button
          className="p-2 text-xs text-violet-600"
          onClick={() => setLegacy(false)}
        >
          返回新版助手
        </button>
        <div className="min-h-0 flex-1">
          <AiChatPanel resumeId={resumeId} />
        </div>
      </div>
    );
  return (
    <UnifiedAssistant
      key={documentId}
      resumeId={documentId}
      onLegacy={() => {
        useEditorUiStore.setState({ assistantTask: null });
        setLegacy(true);
      }}
    />
  );
}
