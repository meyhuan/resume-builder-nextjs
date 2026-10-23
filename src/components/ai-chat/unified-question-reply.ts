// Keep the editable composer as the single source of truth for question choices.
export function questionReplyRange(
  draft: string,
  question: string,
  questions?: readonly { question: string }[],
) {
  const prefix = `${question.replace(/\s+/g, ' ').trim()}：`;
  let start = draft.indexOf(prefix);
  while (start > 0 && draft[start - 1] !== '\n') {
    start = draft.indexOf(prefix, start + prefix.length);
  }
  if (start < 0)
    return { prefix, start: -1, answerStart: -1, end: -1, answer: '' };
  const answerStart = start + prefix.length;
  const newline = questions
    ? Math.min(
        ...questions.map((q) => {
          const next = draft.indexOf(
            `\n${q.question.replace(/\s+/g, ' ').trim()}：`,
            answerStart,
          );
          return next < 0 ? draft.length : next;
        }),
      )
    : draft.indexOf('\n', answerStart);
  const end = newline < 0 ? draft.length : newline;
  return {
    prefix,
    start,
    answerStart,
    end,
    answer: draft.slice(answerStart, end),
  };
}

export function updateQuestionReply(
  draft: string,
  question: string,
  answer: string | null,
  questions?: readonly { question: string }[],
) {
  const range = questionReplyRange(draft, question, questions);
  if (range.start < 0) {
    return answer === null
      ? draft
      : `${draft}${draft && !draft.endsWith('\n') ? '\n' : ''}${range.prefix}${answer}`;
  }
  if (answer === null) {
    // Remove only this answer, preserving other questions and any free-form notes.
    const start =
      range.end === draft.length && range.start > 0
        ? range.start - 1
        : range.start;
    const end = range.end < draft.length ? range.end + 1 : range.end;
    return draft.slice(0, start) + draft.slice(end);
  }
  return draft.slice(0, range.answerStart) + answer + draft.slice(range.end);
}

const OPTION_SEP = '、';

export function splitQuestionOptions(answer: string): string[] {
  return answer
    .split(OPTION_SEP)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function toggleQuestionOption(
  draft: string,
  question: string,
  option: string,
  allOptions: readonly string[],
  questions?: readonly { question: string }[],
): string {
  const current = questionReplyRange(draft, question, questions).answer.trim();
  const currentParts = splitQuestionOptions(current);
  const allMatchOptions =
    currentParts.length > 0 &&
    currentParts.every((part) => allOptions.includes(part));
  const nextParts = allMatchOptions
    ? currentParts.includes(option)
      ? currentParts.filter((part) => part !== option)
      : [...currentParts, option]
    : current === option
      ? []
      : [option];
  return updateQuestionReply(
    draft,
    question,
    nextParts.length > 0 ? nextParts.join(OPTION_SEP) : null,
    questions,
  );
}
