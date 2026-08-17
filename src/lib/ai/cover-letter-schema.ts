import { z } from 'zod';
import { LANGUAGE_VALUES } from '@/lib/ai/translate-schema';

export const coverLetterInputSchema = z.object({
  resumeData: z.unknown(),
  jobDescription: z.string().min(1),
  tone: z.enum(['formal', 'friendly', 'confident']),
  language: z.enum(LANGUAGE_VALUES).optional().default('zh'),
});

export type CoverLetterInput = z.infer<typeof coverLetterInputSchema>;
