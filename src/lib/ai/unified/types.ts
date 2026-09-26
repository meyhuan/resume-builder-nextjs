import { z } from 'zod';
import type { ChatChangeProposal } from '@/lib/ai/tools';

export const unifiedEnabled =
  process.env.NEXT_PUBLIC_UNIFIED_AI_ASSISTANT === 'true';
export const taskSchema = z
  .object({
    id: z.string().uuid(),
    resumeId: z.string().max(100),
    feature: z.enum(['chat', 'polish', 'generate']),
    blockId: z.string().max(100).optional(),
    label: z.string().max(200),
    entry: z.enum(['assistant', 'module']),
  })
  .refine(
    (task) => (task.feature === 'chat' ? !task.blockId : Boolean(task.blockId)),
    '模块任务必须指定目标',
  );
export type AssistantTask = z.infer<typeof taskSchema>;
export const questionSchema = z.object({
  question: z.string().min(1).max(300),
  options: z.array(z.string().max(100)).max(4).default([]),
});
export const draftSchema = z.object({
  answer: z.string().max(10000),
  questions: z.array(questionSchema).max(3).default([]),
  proposals: z
    .array(
      z.discriminatedUnion('action', [
        z.object({
          action: z.literal('updateBlock'),
          blockId: z.string(),
          html: z.string().max(16000),
          reason: z.string().max(200).optional(),
        }),
        z.object({
          action: z.literal('addSection'),
          type: z.string(),
          title: z.string().max(100),
          contentHtml: z.string().max(16000).optional(),
        }),
        z.object({
          action: z.literal('suggestSkills'),
          skills: z.array(z.string().max(100)).max(30),
          category: z.string().max(100),
        }),
      ]),
    )
    .max(30)
    .default([]),
  followups: z.array(z.string().min(1).max(100)).max(3).default([]),
});
export type DraftAnswer = z.infer<typeof draftSchema>;
// Browser-owned conversation context, never an authorization or billing record.
export const historyTurnSchema = draftSchema
  .pick({ answer: true, questions: true, proposals: true })
  .extend({ text: z.string().trim().min(1).max(6000) });
export type HistoryTurn = z.infer<typeof historyTurnSchema>;
export const MAX_TASK_TURNS = 60;
export const toHistory = (turns: AssistantTurn[]): HistoryTurn[] =>
  turns.map((turn) => historyTurnSchema.parse(turn));
export type CheckedProposal = ChatChangeProposal & {
  before: string;
  targetLabel: string;
  factChecked: true;
};
export interface AssistantTurn {
  requestId: string;
  text: string;
  answer: string;
  questions: DraftAnswer['questions'];
  proposals: CheckedProposal[];
  followups: string[];
  direct: boolean;
  charged: boolean;
  feature: AssistantTask['feature'];
}
export type ReviewStatus = 'applied' | 'kept' | 'undone' | 'conflict';
export interface AssistantSession {
  task: AssistantTask;
  turns: AssistantTurn[];
  reviews: Record<string, ReviewStatus>;
  updatedAt: number;
}
export const quotaFeature = (feature: AssistantTask['feature']) =>
  feature === 'polish'
    ? ('ai:polish-section' as const)
    : feature === 'generate'
      ? ('ai:generate-section' as const)
      : ('ai:editor-assist' as const);
