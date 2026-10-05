'use client';

import { useState } from 'react';
import type { FactTopic } from '@/lib/ai/unified/followups';

const fields = [
  {
    topic: 'scale',
    label: '实际服务规模',
    hint: '可填写能确认的人数、人次或场次，注明单位。',
  },
  {
    topic: 'tools',
    label: '实际使用的工具和用途',
    hint: '只填写用过的工具；有证据时再补充效率变化。',
  },
  {
    topic: 'output',
    label: '实际形成的交付物',
    hint: '如有真实交付物，填写名称和用途。',
  },
] as const;

export function UnifiedFollowupForm({
  topic,
  targets,
  onSubmit,
  onCancel,
}: {
  topic: FactTopic;
  targets: { id: string; label: string }[];
  onSubmit: (text: string, targetId: string) => void;
  onCancel: () => void;
}) {
  const [targetId, setTargetId] = useState(targets[0]?.id || '');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const visible = fields.filter((f) => topic === 'all' || topic === f.topic);
  const target = targets.find((t) => t.id === targetId);
  const lines = visible.flatMap((f) =>
    answers[f.topic]?.trim() ? [`${f.label}：${answers[f.topic].trim()}`] : [],
  );
  return (
    <form
      aria-label="补充真实信息"
      className="space-y-3 rounded-xl border border-violet-200 bg-white p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!target || !lines.length) return;
        onSubmit(
          `请根据以下我确认的真实信息，重新润色选中的段落（blockId=${target.id}）。先展示修改建议。未填写或不确定的信息请保留原文，不自行补全。\n${lines.join('\n')}`,
          target.id,
        );
      }}
    >
      <p className="text-sm font-medium text-slate-800">补充真实信息</p>
      <p className="text-xs leading-5 text-slate-500">
        所有项目都可留空。填写后提交给 AI，暂不补充不会发起生成。
      </p>
      {targets.length > 1 ? (
        <label className="block space-y-1 text-xs text-slate-700">
          <span>补充到哪段经历</span>
          <select
            className="w-full rounded-lg border border-slate-200 p-2"
            value={targetId}
            onChange={(event) => {
              setTargetId(event.target.value);
              setAnswers({});
            }}
          >
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="text-xs text-violet-700">{target?.label}</p>
      )}
      {visible.map((f, i) => (
        <div key={f.topic} className="space-y-1.5">
          <label className="block space-y-1 text-xs text-slate-700">
            <span>{f.label}</span>
            <textarea
              autoFocus={i === 0}
              rows={2}
              maxLength={1500}
              value={answers[f.topic] || ''}
              onChange={(event) =>
                setAnswers({ ...answers, [f.topic]: event.target.value })
              }
              className="w-full resize-y rounded-lg border border-slate-200 p-2 text-sm leading-6 outline-none focus:border-violet-400"
              placeholder={f.hint}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {['没有', '暂不确定'].map((answer) => (
              <button
                key={answer}
                type="button"
                className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:border-violet-300"
                onClick={() =>
                  setAnswers({
                    ...answers,
                    [f.topic]:
                      answer === '没有'
                        ? '没有可补充的信息，请保留原文'
                        : '暂不确定，请保留原文',
                  })
                }
              >
                {answer}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={!target || !lines.length}
          className="rounded-lg bg-violet-600 px-3 py-2 text-xs text-white disabled:opacity-40"
        >
          提交补充并润色
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600"
        >
          暂不补充
        </button>
      </div>
    </form>
  );
}
