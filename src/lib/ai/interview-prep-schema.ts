import { z } from 'zod';
import type { ResumeData } from '@/entities/resume/resume-data';

export const MAX_INTERVIEW_PREP_JD_LENGTH = 5000;

export const interviewPrepInputSchema = z.object({
  resumeData: z.custom<ResumeData>(),
  jobDescription: z.string().optional().default(''),
});

export type InterviewPrepInput = z.infer<typeof interviewPrepInputSchema>;

export const GREETING_STYLES = ['concise', 'polite', 'highlight'] as const;
export const QUESTION_CATEGORIES = [
  'hr',
  'professional',
  'behavioral',
  'project',
  'weakness',
] as const;

const greetingSchema = z.object({
  style: z.enum(GREETING_STYLES).catch('concise'),
  text: z.string().min(1),
});

const questionSchema = z.object({
  question: z.string().min(1),
  category: z.enum(QUESTION_CATEGORIES).catch('professional'),
  why: z.string().default(''),
  experienceHint: z.string().default(''),
  starAnswer: z.string().default(''),
  followUps: z.array(z.string()).default([]),
});

const coverLetterSchema = z.object({
  title: z.string().default(''),
  content: z.string().default(''),
});

export const interviewPrepOutputSchema = z.object({
  jobTitle: z.string().default(''),
  summary: z.string().default(''),
  greetings: z.array(z.unknown()).default([]),
  selfIntro30s: z.string().default(''),
  selfIntro2min: z.string().default(''),
  questions: z.array(z.unknown()).default([]),
  gaps: z.array(z.string()).default([]),
  coverLetter: z.unknown().optional(),
}).transform((data) => {
  const greetings = data.greetings.flatMap((item) => {
    const parsed = greetingSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
  const questions = data.questions.flatMap((item) => {
    const parsed = questionSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
  const coverLetterParsed = coverLetterSchema.safeParse(data.coverLetter);
  return {
    jobTitle: data.jobTitle,
    summary: data.summary,
    greetings,
    selfIntro30s: data.selfIntro30s,
    selfIntro2min: data.selfIntro2min,
    questions,
    gaps: data.gaps.filter((item) => item.trim().length > 0),
    coverLetter: coverLetterParsed.success
      ? coverLetterParsed.data
      : { title: '', content: '' },
  };
});

export type InterviewPrepOutput = z.infer<typeof interviewPrepOutputSchema>;
export type InterviewPrepGreeting = InterviewPrepOutput['greetings'][number];
export type InterviewPrepQuestion = InterviewPrepOutput['questions'][number];
