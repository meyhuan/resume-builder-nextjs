import { useEditorUiStore } from '@/state/editor-ui-store';
import { useAppStore, separateAiHistory } from '@/state/store';
import { applyChangeProposal } from './apply-block-change';
import { targetSnapshot } from '@/lib/ai/unified/policy';
import type { CheckedProposal } from '@/lib/ai/unified/types';
import type { ResumeData } from '@/entities/resume/resume-data';

export interface UndoReceipt {
  resumeId: string;
  before: ResumeData;
  after: ResumeData;
  targets: string[];
}
export function applyChecked(
  proposals: CheckedProposal[],
  resumeId: string,
): UndoReceipt | null {
  const state = useAppStore.getState();
  if (
    state.readOnly ||
    (useEditorUiStore.getState().assistantResumeId ||
      state.resume.id ||
      'local') !== resumeId ||
    !proposals.length
  )
    return null;
  const before = state.resume;
  if (
    proposals.some(
      (p) =>
        !p.factChecked ||
        p.before !==
          targetSnapshot(
            before,
            p.action === 'updateBlock' ? p.blockId : undefined,
          ),
    )
  )
    return null;
  const ids = proposals
    .filter((p) => p.action === 'updateBlock')
    .map((p) => (p.action === 'updateBlock' ? p.blockId : ''));
  if (new Set(ids).size !== ids.length) return null;
  separateAiHistory();
  try {
    for (const p of proposals)
      if (!applyChangeProposal(p)) throw new Error('Target cannot be modified');
    const after = useAppStore.getState().resume;
    useAppStore.setState({
      pastStates: [...state.pastStates, before].slice(-50),
      futureStates: [],
    });
    separateAiHistory();
    return {
      resumeId,
      before,
      after,
      targets: proposals.every((p) => p.action === 'updateBlock') ? ids : [],
    };
  } catch {
    useAppStore.setState({
      resume: before,
      pastStates: state.pastStates,
      futureStates: state.futureStates,
    });
    separateAiHistory();
    return null;
  }
}
export function undoChecked(receipt: UndoReceipt): boolean {
  const state = useAppStore.getState();
  if (
    state.readOnly ||
    (useEditorUiStore.getState().assistantResumeId ||
      state.resume.id ||
      'local') !== receipt.resumeId
  )
    return false;
  if (!receipt.targets.length) {
    if (JSON.stringify(state.resume) !== JSON.stringify(receipt.after))
      return false;
    separateAiHistory();
    state.setResume(() => receipt.before);
    separateAiHistory();
    return true;
  }
  if (
    receipt.targets.some(
      (id) =>
        targetSnapshot(state.resume, id) !== targetSnapshot(receipt.after, id),
    )
  )
    return false;
  separateAiHistory();
  state.setResume((draft) => {
    for (const section of draft.sections)
      for (let i = 0; i < section.blocks.length; i++) {
        const id = section.blocks[i].id;
        if (receipt.targets.includes(id)) {
          const original = receipt.before.sections
            .flatMap((s) => s.blocks)
            .find((b) => b.id === id);
          if (original) section.blocks[i] = structuredClone(original);
        }
      }
  });
  separateAiHistory();
  return true;
}
/** Bounded LCS diff for Chinese, falling back to whole paragraphs for long content. */
export function textDiff(
  before: string,
  after: string,
): Array<{ kind: 'same' | 'remove' | 'add'; text: string }> {
  const a = Array.from(before),
    b = Array.from(after);
  if (a.length * b.length > 400000)
    return [
      { kind: 'remove', text: before },
      { kind: 'add', text: after },
    ];
  const rows = Array.from(
    { length: a.length + 1 },
    () => new Uint16Array(b.length + 1),
  );
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      rows[i][j] =
        a[i] === b[j]
          ? rows[i + 1][j + 1] + 1
          : Math.max(rows[i + 1][j], rows[i][j + 1]);
  const result: Array<{ kind: 'same' | 'remove' | 'add'; text: string }> = [];
  const append = (kind: 'same' | 'remove' | 'add', text: string) => {
    const last = result[result.length - 1];
    if (last?.kind === kind) last.text += text;
    else result.push({ kind, text });
  };
  let i = 0,
    j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      append('same', a[i++]);
      j++;
    } else if (
      j < b.length &&
      (i === a.length || rows[i][j + 1] >= rows[i + 1][j])
    )
      append('add', b[j++]);
    else append('remove', a[i++]);
  }
  return result;
}
