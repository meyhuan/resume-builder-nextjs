import { z } from 'zod';

export const grammarCheckInputSchema = z.object({
  resumeData: z.unknown(),
});

const ISSUE_TYPES = ['grammar', 'weak_verb', 'vague', 'quantify', 'spelling'] as const;
const SEVERITIES = ['high', 'medium', 'low'] as const;

const grammarIssueSchema = z.object({
  blockId: z.string().optional(),
  sectionId: z.string().optional(),
  sectionTitle: z.string().default(''),
  type: z.enum(ISSUE_TYPES).catch('vague'),
  original: z.string(),
  suggestion: z.string(),
  severity: z.enum(SEVERITIES).catch('medium'),
});

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export const grammarCheckOutputSchema = z.object({
  issues: z.array(z.unknown()).default([]),
  summary: z.string().default(''),
  score: z.coerce.number().optional(),
  overallScore: z.coerce.number().optional(),
}).transform((data) => {
  const issues = data.issues.flatMap((item) => {
    const parsed = grammarIssueSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
  return {
    issues,
    summary: data.summary,
    score: clampScore(data.score ?? data.overallScore ?? (issues.length === 0 ? 100 : 70)),
  };
});

export type GrammarCheckOutput = z.infer<typeof grammarCheckOutputSchema>;
export type GrammarIssue = z.infer<typeof grammarIssueSchema>;
