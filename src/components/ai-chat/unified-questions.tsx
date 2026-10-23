'use client';

import { Check, PencilLine } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { AssistantTurn } from '@/lib/ai/unified/types';
import { KEEP_ORIGINAL_ANSWER } from '@/lib/ai/unified/types';
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
  const inputHint =
    question.inputHint ||
    (/成果|结果|提升|增长|效率|数字|数量|规模/.test(question.question)
      ? '补充一句真实结果即可，例如：完成了什么、带来什么变化；没有数字也可以。'
      : '补充一句真实职责即可，例如：你具体负责什么、完成了什么。');
  const control =
    'rounded-lg px-3 py-2 text-xs leading-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div className="space-y-2.5" data-testid="question-stepper">
      {/* 步骤指示器 */}
      {turn.questions.length > 1 && (
        <div className="flex items-center justify-between px-1 text-xs">
          <div className="flex items-center gap-1.5">
            {turn.questions.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  idx === progress.index
                    ? 'w-5 bg-violet-600'
                    : idx < progress.index
                      ? 'w-2 bg-violet-300'
                      : 'w-2 bg-slate-200'
                }`}
                aria-hidden="true"
              />
            ))}
            <span aria-live="polite" className="ml-1 text-slate-500 font-medium">
              问题 {progress.index + 1} / {turn.questions.length}
            </span>
          </div>
          {progress.index > 0 && (
            <button
              type="button"
              disabled={busy}
              className="text-violet-600 hover:text-violet-800 text-xs font-medium"
              onClick={() => onEdit(progress.index - 1)}
            >
              ← 上一题
            </button>
          )}
        </div>
      )}

      {/* 当前问题核心卡片 */}
      <div
        role="group"
        aria-label={question.question}
        className="space-y-3 rounded-xl border border-violet-100 bg-violet-50/30 p-3.5 shadow-xs"
      >
        {turn.questions.length === 1 && (
          <p aria-live="polite" className="text-xs text-slate-500">
            问题 1 / 1
          </p>
        )}
        <div className="flex items-start gap-2">
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-semibold text-violet-700">
            {progress.index + 1}
          </span>
          <p
            ref={heading}
            tabIndex={-1}
            className="text-sm font-medium leading-6 text-slate-800 outline-none"
          >
            {question.question}
          </p>
        </div>

        {question.originalText && (
          <div className="rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 text-xs leading-5 text-slate-600">
            <p className="mb-1 font-medium text-slate-400">对应简历原文</p>
            <p className="max-h-24 overflow-y-auto whitespace-pre-wrap break-words text-slate-600">
              {question.originalText}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {question.options.map((option) => {
            const selected =
              answer === option ||
              answer.split('、').map((s) => s.trim()).includes(option);
            return (
              <button
                key={option}
                type="button"
                disabled={busy}
                aria-pressed={selected}
                className={`${control} inline-flex items-center gap-1.5 border text-left shadow-2xs transition-all ${
                  selected
                    ? 'border-violet-600 bg-violet-600 font-medium text-white shadow-violet-200 ring-1 ring-violet-600'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-700 active:bg-violet-50'
                }`}
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
            className={`${control} inline-flex items-center gap-1.5 border border-dashed border-violet-200 bg-white text-violet-700 hover:border-violet-400 hover:bg-violet-50/50 active:bg-violet-100`}
            aria-expanded={customIndex === progress.index}
            onClick={() => {
              setCustomIndex(progress.index);
              customInput.current?.focus();
            }}
          >
            <PencilLine aria-hidden="true" className="h-3.5 w-3.5" />
            自己填写
          </button>
          {question.canKeepOriginal ? (
            <button
              type="button"
              disabled={busy}
              aria-pressed={answer === KEEP_ORIGINAL_ANSWER}
              className={`${control} border ${
                answer === KEEP_ORIGINAL_ANSWER
                  ? 'border-violet-500 bg-violet-50 text-violet-700 font-medium'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300'
              }`}
              onClick={() =>
                onChange(
                  updateQuestionReply(
                    draft,
                    question.question,
                    answer === KEEP_ORIGINAL_ANSWER ? null : KEEP_ORIGINAL_ANSWER,
                    turn.questions,
                  ),
                )
              }
            >
              保留原文
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              aria-pressed={answer === '暂不确定，请保留原有事实，不自行补全'}
              className={`${control} border ${
                answer === '暂不确定，请保留原有事实，不自行补全'
                  ? 'border-violet-500 bg-violet-50 text-violet-700 font-medium'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300'
              }`}
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
          )}
        </div>

        {(customIndex === progress.index ||
          (answer &&
            !question.options.includes(answer) &&
            answer !== KEEP_ORIGINAL_ANSWER &&
            answer !== '暂不确定，请保留原有事实，不自行补全')) && (
          <label className="block space-y-1.5 text-xs text-slate-600">
            <span className="font-medium text-slate-700">补充你的真实经历</span>
            <textarea
              ref={customInput}
              autoFocus={customIndex === progress.index}
              aria-label="你的回答"
              disabled={busy}
              rows={2}
              className="block w-full resize-y rounded-lg border border-violet-300 bg-white p-2.5 text-xs leading-5 text-slate-800 shadow-2xs outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 disabled:opacity-50"
              placeholder={inputHint}
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

        <div className="flex items-center justify-between gap-2 border-t border-violet-100/80 pt-2.5">
          <p className="text-xs text-slate-400">
            {last ? '确认后提交开始生成' : '每题可单独选择或输入'}
          </p>
          <button
            type="button"
            disabled={busy || !answer.trim()}
            className={`${control} shrink-0 bg-violet-600 font-medium text-white shadow-xs hover:bg-violet-700 active:bg-violet-800 disabled:opacity-40`}
            onClick={onContinue}
          >
            {last ? '提交回答' : '确认，下一题'}
          </button>
        </div>
      </div>
      {/* 已回答问题紧凑折叠摘要（非当前问题） */}
      {turn.questions.slice(0, progress.confirmed).map(
        (item, index) =>
          index !== progress.index && (
            <div
              key={index}
              className="flex items-center justify-between gap-2 rounded-lg bg-slate-50/80 border border-slate-100 px-3 py-1.5 text-xs"
            >
              <div className="min-w-0 flex-1 truncate text-slate-600">
                <span className="text-slate-400 font-medium">{index + 1}.</span>{' '}
                <span className="text-slate-700 font-medium">{item.question}</span>：
                <span className="text-slate-500">
                  {questionReplyRange(draft, item.question, turn.questions).answer || '待补充'}
                </span>
              </div>
              <button
                type="button"
                disabled={busy}
                className="shrink-0 text-violet-600 hover:text-violet-800 text-xs font-medium px-1.5 py-0.5 rounded hover:bg-violet-50"
                aria-label={`修改第 ${index + 1} 题回答`}
                onClick={() => onEdit(index)}
              >
                修改
              </button>
            </div>
          ),
      )}

    </div>
  );
}
