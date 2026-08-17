import { z } from 'zod';

export const LANGUAGE_VALUES = ['zh', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'pt', 'ru', 'ar'] as const;

export const translateInputSchema = z.object({
  resumeData: z.unknown(),
  targetLanguage: z.enum(LANGUAGE_VALUES),
  mode: z.enum(['overwrite', 'copy']).default('overwrite'),
});

export const translatedHeaderSchema = z.object({
  kind: z.literal('header'),
  name: z.string(),
  baseInfo: z.record(z.string(), z.unknown()).optional(),
  jobIntention: z.record(z.string(), z.unknown()).optional(),
});

export const translatedSectionSchema = z.object({
  kind: z.literal('section').optional(),
  sectionId: z.string(),
  title: z.string(),
  blocks: z.array(z.unknown()),
});
