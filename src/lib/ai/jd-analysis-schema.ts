import { z } from 'zod';
import type { ResumeData } from '@/entities/resume/resume-data';

export const jdAnalysisInputSchema = z.object({
  resumeData: z.custom<ResumeData>(),
  jobDescription: z.string().min(1),
});

export type JdAnalysisInput = z.infer<typeof jdAnalysisInputSchema>;

const suggestionSchema = z.object({
  blockId: z.string().optional(),
  section: z.string(),
  current: z.string(),
  suggested: z.string(),
});

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export const jdAnalysisOutputSchema = z.object({
  overallScore: z.coerce.number().optional(),
  score: z.coerce.number().optional(),
  keywordMatches: z.array(z.string()).optional(),
  matchedKeywords: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  missingKeywords: z.array(z.string()).default([]),
  suggestions: z.array(suggestionSchema).default([]),
  atsScore: z.coerce.number(),
  summary: z.string().default(''),
}).transform((data) => ({
  overallScore: clampScore(data.overallScore ?? data.score ?? 0),
  keywordMatches: data.keywordMatches ?? data.matchedKeywords ?? data.keywords ?? [],
  missingKeywords: data.missingKeywords,
  suggestions: data.suggestions,
  atsScore: clampScore(data.atsScore),
  summary: data.summary,
}));

export type JdAnalysisOutput = z.infer<typeof jdAnalysisOutputSchema>;
