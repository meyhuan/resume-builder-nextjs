'use client';

import { useChatHistory } from '@/hooks/use-chat-history';
import { useAppStore } from '@/state/store';
import { AiMessage } from './ai-message';

/** Legacy conversations are retained for reference; all new work uses UnifiedAssistant. */
export function AiChatPanel({ resumeId }: { readonly resumeId?: string }) {
  const storeId = useAppStore((state) => state.resume.id);
  const {
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    deleteSession,
  } = useChatHistory(resumeId || storeId || 'local');
  if (!activeSessionId)
    return <p className="p-4 text-xs text-slate-500">加载历史…</p>;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 border-b border-slate-100 p-3 text-xs">
        <p className="text-slate-500">
          旧版历史仅供查看。新任务请返回新版助手。
        </p>
        {sessions.length > 0 && (
          <div className="flex gap-2">
            <select
              aria-label="旧版历史对话"
              className="min-w-0 flex-1 rounded-lg border p-2"
              value={activeSessionId}
              onChange={(event) => setActiveSessionId(event.target.value)}
            >
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.title || '历史对话'}
                </option>
              ))}
            </select>
            <button
              className="shrink-0 text-slate-500 hover:text-red-600"
              onClick={() => void deleteSession(activeSessionId)}
            >
              删除记录
            </button>
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        {!activeSession?.messages.length && (
          <p className="text-xs text-slate-400">暂无历史对话</p>
        )}
        {activeSession?.messages.map((message) => (
          <AiMessage
            key={message.id}
            message={message}
            reviewedKeys={activeSession.proposalReviews || {}}
            onReview={() => {}}
            readOnly
          />
        ))}
      </div>
    </div>
  );
}
