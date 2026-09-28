'use client';

import { Check, PencilLine } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { AssistantTurn } from '@/lib/ai/unified/types';
import {
  questionReplyRange,
  updateQuestionReply,
} from './unified-question-reply';

export interface QuestionProgress {
  index: number;
  confirmed: number;
}
export const INITIAL_QUESTION_PROGRESS: QuestionProgress = {
  index: 0,
  confirmed: 0,
};

export function UnifiedQuestions({
  turn,
  draft,
  busy,
  progress,
  onChange,
  onEdit,
  onContinue,
}: {
  turn: AssistantTurn;
  draft: string;
  busy: boolean;
  progress: QuestionProgress;
  onChange: (draft: string) => void;
  onEdit: (index: number) => void;
  onContinue: () => void;
}) {
  const heading = useRef<HTMLParagraphElement>(null);
  const customInput = useRef<HTMLTextAreaElement>(null);
  const [customIndex, setCustomIndex] = useState<number | null>(null);
  const previousIndex = useRef(progress.index);
  useEffect(() => {
    if (previousIndex.current !== progress.index) {
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView({ block: 'nearest' });
      previousIndex.current = progress.index;
    }
  }, [progress.index]);
  const question = turn.questions[progress.index];
  if (!question) return null;
  const structured = turn.questions.some(
    (q) => questionReplyRange(draft, q.question).start >= 0,
  );
  const answer = structured
    ? questionReplyRange(draft, question.question, turn.questions).answer
    : draft.trim();
  const last = progress.index === turn.questions.length - 1;
  const control =
    'rounded-lg px-3 py-2 text-xs leading-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div className="space-y-2" data-testid="question-stepper">
      {turn.questions.slice(0, progress.confirmed).map(
        (item, index) =>
          index !== progress.index && (
            <div
              key={index}
              className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2"
            >
              <div className="min-w-0 flex-1 text-xs leading-5">
                <p className="break-words text-slate-500">
                  {index + 1}. {item.question}
                </p>
                <p className="break-words text-slate-700">
                  {questionReplyRange(draft, item.question, turn.questions)
                    .answer || '待补充'}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                className={`${control} shrink-0 text-violet-700 hover:bg-violet-50`}
                aria-label={`修改第 ${index + 1} 题回答`}
                onClick={() => onEdit(index)}
              >
                修改
              </button>
            </div>
          ),
      )}
      <div
        role="group"
        aria-label={question.question}
        className="space-y-3 rounded-xl border border-amber-100 bg-amber-50/50 p-3"
      >
        <p aria-live="polite" className="text-xs text-slate-500">
          问题 {progress.index + 1} / {turn.questions.length}
        </p>
        <p
          ref={heading}
          tabIndex={-1}
          className="text-sm leading-6 text-slate-800 outline-none"
        >
          {question.question}
        </p>
        <div className="flex flex-wrap gap-2">
          {question.options.map((option) => {
            const selected = answer === option && !!answer;
            return (
              <button
                key={option}
                type="button"
                disabled={busy}
                aria-pressed={selected}
                className={`${control} inline-flex items-center gap-1.5 border text-left ${selected ? 'border-violet-500 bg-violet-50 font-medium text-violet-700 ring-1 ring-violet-500' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-700 active:bg-violet-50'}`}
                onClick={() => {
                  setCustomIndex(null);
                  onChange(
                    updateQuestionReply(
                      draft,
                      question.question,
                      selected ? null : option,
                      turn.questions,
                    ),
                  );
                }}
              >
                {selected && (
                  <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                )}
                {option}
              </button>
            );
          })}
          <button
            type="button"
            disabled={busy}
            className={`${control} inline-flex items-center gap-1.5 text-violet-700 hover:bg-violet-50 active:bg-violet-100`}
            aria-expanded={customIndex === progress.index}
            onClick={() => {
              setCustomIndex(progress.index);
              customInput.current?.focus();
            }}
          >
            <PencilLine aria-hidden="true" className="h-3.5 w-3.5" />
            自己填写
          </button>
          <button
            type="button"
            disabled={busy}
            aria-pressed={answer === '暂不确定，请保留原有事实，不自行补全'}
            className={`${control} border ${answer === '暂不确定，请保留原有事实，不自行补全' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300'}`}
            onClick={() =>
              onChange(
                updateQuestionReply(
                  draft,
                  question.question,
                  answer === '暂不确定，请保留原有事实，不自行补全'
                    ? null
                    : '暂不确定，请保留原有事实，不自行补全',
                  turn.questions,
                ),
              )
            }
          >
            暂不确定
          </button>
        </div>
        {customIndex === progress.index && (
          <label className="block space-y-1 text-xs text-slate-600">
            <span>你的回答</span>
            <textarea
              ref={customInput}
              autoFocus
              aria-label="你的回答"
              disabled={busy}
              rows={3}
              className="block w-full resize-y rounded-lg border border-violet-300 bg-white p-3 text-sm leading-6 text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
              placeholder="用自己的话描述，不确定的地方也可以说明…"
              value={answer}
              onChange={(e) =>
                onChange(
                  updateQuestionReply(
                    structured ? draft : '',
                    question.question,
                    e.target.value,
                    turn.questions,
                  ),
                )
              }
            />
          </label>
        )}
        <div className="flex items-center justify-between gap-2 border-t border-amber-100 pt-2">
          <p className="text-xs leading-5 text-slate-500">
            {last ? '确认后统一提交回答' : '下一步前仍可修改答案'}
          </p>
          <button
            type="button"
            disabled={busy || !answer.trim()}
            className={`${control} shrink-0 bg-violet-600 text-white hover:bg-violet-700 active:bg-violet-800`}
            onClick={onContinue}
          >
            {last ? '提交回答' : '确认，下一题'}
          </button>
        </div>
      </div>
    </div>
  );
}
