'use client';

import { AiChatPanel } from './ai-chat-panel';

/** Kept mounted while tools switch so drafts and streaming responses survive. */
export function EditorAiPanel({ resumeId }: { readonly resumeId?: string }) {
  return <AiChatPanel resumeId={resumeId} />;
}
