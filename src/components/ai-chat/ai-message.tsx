'use client';

import type { UIMessage } from 'ai';
import type { ReactElement } from 'react';
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AiToolCard } from '@/components/ai-chat/ai-tool-card';
import { prepareAssistantMarkdown } from '@/lib/ai/chat-markdown';

function isToolPart(part: { type?: string }): boolean {
  return typeof part.type === 'string' && part.type.startsWith('tool-');
}

export function AiMessage(props: { readonly message: UIMessage }): ReactElement {
  const isUser = props.message.role === 'user';

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isUser ? 'bg-slate-200 text-slate-600' : 'bg-violet-100 text-violet-600'}`}>
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>
      <div className={`max-w-[86%] min-w-0 space-y-2 ${isUser ? 'items-end' : ''}`}>
        {props.message.parts?.map((part, index) => {
          if (isToolPart(part as { type?: string })) {
            return (
              <AiToolCard
                key={`${props.message.id}-tool-${index}`}
                part={part as Record<string, unknown>}
              />
            );
          }
          if (part.type !== 'text' || !part.text.trim()) return null;
          if (isUser) {
            return (
              <div
                key={`${props.message.id}-text-${index}`}
                className="whitespace-pre-wrap break-words rounded-2xl bg-violet-600 px-3 py-2 text-sm leading-relaxed text-white"
              >
                {part.text}
              </div>
            );
          }
          const markdown = prepareAssistantMarkdown(part.text);
          if (!markdown) return null;
          return (
            <div
              key={`${props.message.id}-text-${index}`}
              className="ai-chat-markdown break-words rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-700"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
            </div>
          );
        })}
      </div>
    </div>
  );
}
