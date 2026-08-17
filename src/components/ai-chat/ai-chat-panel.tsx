'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactElement } from 'react';
import { Clock, Loader2, Plus, SendHorizonal, Sparkles, Trash2 } from 'lucide-react';
import { useEditorAIChat } from '@/hooks/use-ai-chat';
import { useChatHistory } from '@/hooks/use-chat-history';
import { AiMessage } from '@/components/ai-chat/ai-message';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppStore } from '@/state/store';
import { useEditorUiStore } from '@/state/editor-ui-store';
import { EditorAssistQuotaHint } from '@/components/ai/editor-assist-quota-hint';

const QUICK_PROMPTS = [
  '分析这份简历与目标岗位的匹配度',
  '把最近一段工作经历写得更专业',
  '根据我的经历补充技能关键词',
];

export function AiChatPanel(props: {
  readonly resumeId?: string;
  readonly hideTitle?: boolean;
}): ReactElement {
  const storeResumeId = useAppStore((state) => state.resume.id);
  const resumeKey = props.resumeId || storeResumeId || 'local';
  const {
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    saveSession,
    deleteSession,
    createSession,
  } = useChatHistory(resumeKey);

  if (!activeSessionId) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-slate-400">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        加载对话…
      </div>
    );
  }

  return (
    <AiChatSession
      key={activeSessionId}
      resumeKey={resumeKey}
      sessionId={activeSessionId}
      initialMessages={activeSession?.messages}
      sessions={sessions}
      onSaveSession={saveSession}
      onDeleteSession={deleteSession}
      onSelectSession={setActiveSessionId}
      onCreateSession={createSession}
      hideTitle={props.hideTitle}
    />
  );
}

function AiChatSession(props: {
  readonly resumeKey: string;
  readonly sessionId: string;
  readonly initialMessages?: import('ai').UIMessage[];
  readonly sessions: Array<{ id: string; title: string; updatedAt: number }>;
  readonly onSaveSession: (session: {
    id: string;
    title: string;
    updatedAt: number;
    messages: import('ai').UIMessage[];
  }) => Promise<void>;
  readonly onDeleteSession: (sessionId: string) => Promise<void>;
  readonly onSelectSession: (sessionId: string) => void;
  readonly onCreateSession: () => string;
  readonly hideTitle?: boolean;
}): ReactElement {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error, sendMessage } = useEditorAIChat({
    initialMessages: props.initialMessages,
    sessionId: props.sessionId,
  });
  const pendingAiMessage = useEditorUiStore((state) => state.pendingAiMessage);
  const setPendingAiMessage = useEditorUiStore((state) => state.setPendingAiMessage);
  const openModal = useEditorUiStore((state) => state.openModal);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const handleScroll = useCallback((): void => {
    const el = scrollerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    setIsAtBottom(nearBottom);
  }, []);

  useEffect(() => {
    if (isAtBottom && scrollerRef.current) {
      scrollerRef.current.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading, isAtBottom]);

  useEffect(() => {
    if (isLoading || messages.length === 0) return;
    const firstUser = messages.find((message) => message.role === 'user');
    const titlePart = firstUser?.parts?.find((part) => part.type === 'text');
    void props.onSaveSession({
      id: props.sessionId,
      title: (titlePart && 'text' in titlePart ? titlePart.text : '新对话').slice(0, 40),
      updatedAt: Date.now(),
      messages,
    });
  }, [isLoading, messages, props.onSaveSession, props.sessionId]);

  useEffect(() => {
    if (!pendingAiMessage) return;
    const text = pendingAiMessage;
    setPendingAiMessage(null);
    void sendMessage({ text });
    setIsAtBottom(true);
  }, [pendingAiMessage, sendMessage, setPendingAiMessage]);

  const submitAndScroll = (event: FormEvent<HTMLFormElement>): void => {
    handleSubmit(event);
    setIsAtBottom(true);
  };

  const sendQuickPrompt = (prompt: string): void => {
    void sendMessage({ text: prompt });
    setIsAtBottom(true);
  };

  const empty = messages.length === 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
        {!props.hideTitle ? (
          <div className="flex items-center gap-1.5 text-sm font-semibold text-violet-700">
            <Sparkles className="h-4 w-4" />
            AI 简历顾问
          </div>
        ) : (
          <span className="text-xs text-slate-500">对话</span>
        )}
        <div className="flex items-center gap-1">
          {!props.hideTitle ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="一键优化"
              onClick={() => openModal('optimize')}
            >
              <Sparkles className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="历史对话">
                <Clock className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {props.sessions.length === 0 ? (
                <div className="px-2 py-3 text-xs text-slate-400">暂无历史对话</div>
              ) : (
                props.sessions.map((session) => (
                  <DropdownMenuItem
                    key={session.id}
                    className="flex items-center justify-between gap-2"
                    onClick={() => props.onSelectSession(session.id)}
                  >
                    <span className="min-w-0 flex-1 truncate text-xs">
                      {session.title || '新对话'}
                    </span>
                    <button
                      type="button"
                      className="rounded p-1 text-slate-400 hover:text-red-500"
                      onClick={(event) => {
                        event.stopPropagation();
                        void props.onDeleteSession(session.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="新对话"
            onClick={() => props.onCreateSession()}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scrollbar space-y-4 px-4 py-4"
      >
        {empty && (
          <div className="rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-5">
            <p className="text-xs leading-relaxed text-slate-500">
              我可以分析岗位匹配度、改写经历、新增模块、补充技能或翻译简历。涉及内容修改时会直接写入简历。
            </p>
            <div className="mt-3 space-y-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="block w-full rounded-xl border border-white bg-white px-3 py-2 text-left text-xs text-slate-600 hover:border-violet-200 hover:text-violet-700"
                  onClick={() => sendQuickPrompt(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((message) => (
          <AiMessage key={message.id} message={message} />
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            AI 正在思考…
          </div>
        )}
        {error && <p className="text-xs text-red-500">{error.message || '对话失败，请稍后重试'}</p>}
      </div>

      <form className="shrink-0 border-t border-slate-100 bg-white p-3" onSubmit={submitAndScroll}>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 focus-within:border-violet-300 focus-within:bg-white">
          <textarea
            value={input}
            onChange={handleInputChange}
            rows={2}
            placeholder="描述目标岗位，或让我改某一段经历…"
            className="w-full resize-none bg-transparent px-3 pt-3 pb-1 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <EditorAssistQuotaHint className="min-w-0 flex-1 text-left" />
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || !input.trim()}
              className="h-8 shrink-0 rounded-full bg-violet-600 px-3 text-white"
            >
              <SendHorizonal className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
