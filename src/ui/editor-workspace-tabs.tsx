'use client';

import { PanelRightClose, Sparkles } from 'lucide-react';
import type { PanelId } from '@/ui/editor-toolbar';
import { trackAssistant } from '@/lib/ai/unified/analytics';
import { useAiImpression } from '@/lib/ai/unified/use-impression';

const ITEMS = [
  { id: 'ai', label: 'AI 助手' },
  { id: 'sections', label: '模块' },
  { id: 'templates', label: '模板' },
  { id: 'layout', label: '样式' },
] as const;

type WorkspacePanel = PanelId | 'ai' | 'polish' | 'generate' | null;

export default function EditorWorkspaceTabs({ activePanel, onChange }: {
  readonly activePanel: WorkspacePanel;
  readonly onChange: (panel: WorkspacePanel) => void;
}) {
  const selected = activePanel === 'polish' || activePanel === 'generate' ? 'ai' : activePanel;
  const aiRef = useAiImpression<HTMLButtonElement>('assistant-workspace', () => {
    trackAssistant('entry_view', { entry: 'assistant', surface: 'workspace', feature: 'chat' });
  }, !!activePanel);

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 bg-white px-3 py-2">
      <nav aria-label="切换编辑工具" className="flex min-w-0 flex-1 items-center rounded-xl border border-violet-100/70 bg-violet-50/60 p-1">
        {ITEMS.map((item) => {
          const active = selected === item.id;
          return (
            <button
              key={item.id}
              ref={item.id === 'ai' ? aiRef : undefined}
              type="button"
              aria-pressed={active}
              onClick={() => {
                if (item.id === 'ai' && activePanel !== 'ai')
                  trackAssistant('entry_open', { entry: 'assistant', surface: 'workspace', feature: 'chat' });
                onChange(item.id);
              }}
              className={`relative flex h-9 min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-1 text-xs font-medium transition-[color,background-color,box-shadow] duration-150 motion-reduce:transition-none focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 active:bg-violet-100 ${
                active
                  ? 'bg-white text-violet-700 shadow-[0_1px_4px_rgba(76,29,149,0.10)] ring-1 ring-violet-200/60'
                  : 'text-slate-500 hover:bg-white/70 hover:text-violet-700'
              }`}
            >
              {item.id === 'ai' && <Sparkles aria-hidden="true" className="h-3 w-3 shrink-0" />}
              {item.label}
            </button>
          );
        })}
      </nav>
      <button
        type="button"
        aria-label="收起工具，返回简历"
        title="收起工具，返回简历"
        onClick={() => onChange(null)}
        className="flex h-9 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 active:bg-slate-200"
      >
        <PanelRightClose aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}
