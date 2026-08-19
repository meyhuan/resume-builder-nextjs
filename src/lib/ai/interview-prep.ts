import { generateText } from 'ai';
import {
  getJsonProviderOptions,
  getModel,
  type AIConfig,
} from '@/lib/ai/provider';
import {
  interviewPrepOutputSchema,
  type InterviewPrepOutput,
} from '@/lib/ai/interview-prep-schema';
import { extractJson } from '@/lib/ai/extract-json';
import { serializeResumeContext } from '@/lib/ai/resume-context';
import type { ResumeData } from '@/entities/resume/resume-data';

const INTERVIEW_PREP_PROMPT = `You are a Chinese job-search coach helping candidates prepare for BOSS Zhipin / domestic interviews. Generate a practical interview-prep pack from the resume and optional job description.

IMPORTANT: Detect the primary language of the resume content. selfIntro30s, selfIntro2min, questions, summary, gaps, and coverLetter MUST use that language. greetings MUST always be Simplified Chinese, because they are for BOSS直聘.

Hard rules:
- Use ONLY facts, numbers, projects, and skills that appear in the resume. Never invent experience, metrics, companies, or titles.
- If a job description is provided: tailor greetings, questions, and gaps to that JD. Gaps are JD requirements missing from the resume.
- If NO job description is provided: use resume.jobIntention (position, city, industry) as the target. If jobIntention is also empty, infer a likely target role from the resume and state that in summary. Greetings should still mention the inferred/intended role. Gaps should be typical interview probes for that role, not invented JD keywords. In summary, clearly say this pack is generic because no JD was given, and pasting a JD would make greetings and questions more specific.
- If the resume lacks something the target role/JD requires, put it in gaps and tell the candidate how to answer honestly (transferable experience or "简历未体现"). Do not fabricate a STAR story.
- Target all Chinese job types (campus, operations, product, sales, design, teaching, etc.). Do NOT default to software-engineering system design or coding trivia unless the JD or intended role is clearly a software role.
- Tune questions using jobIntention and the JD when present.

You MUST return a JSON object with exactly these fields:
- jobTitle (string): inferred role name
- summary (string): 2-4 sentences on interview risk and what to emphasize
- greetings (array of exactly 3 { style, text }):
  - styles MUST be "concise", "polite", "highlight" (one each)
  - each text is a BOSS直聘 first message: 40-80 Chinese characters
  - include the target role + one matching point from the resume + a request to chat
  - no "尊敬的HR", no email letter format, no long self-intro, no hashtags
  - the three texts must not repeat the same sentence
- selfIntro30s (string): ~80-120 Chinese characters or equivalent spoken 30 seconds
- selfIntro2min (string): spoken 2-minute intro, still concise
- questions (array of 8-12 items): { question, category, why, experienceHint, starAnswer, followUps }
  - category MUST be one of: hr, professional, behavioral, project, weakness
  - mix categories; include at least one weakness/gap follow-up
  - experienceHint: which resume section/item to cite, or "简历未体现"
  - starAnswer: a suggested answer grounded in resume facts
  - followUps: 1-3 likely interviewer follow-ups
- gaps (string[]): missing requirements interviewers will probe
- coverLetter: { title, content } — a short email cover letter for rare email/foreign applications. Secondary; keep it usable but shorter than a full marketing letter.

CRITICAL: You are a JSON API. Your entire response must be a single valid JSON object starting with { and ending with }. Do NOT use markdown syntax. Do NOT wrap in code fences. Do NOT add any text before or after the JSON.`;

export async function generateInterviewPrep(params: {
  resumeData: ResumeData;
  jobDescription: string;
  aiConfig: AIConfig;
}): Promise<InterviewPrepOutput> {
  const { resumeData, jobDescription, aiConfig } = params;
  const model = getModel(aiConfig);
  const resumeContext = serializeResumeContext(resumeData);

  const result = await generateText({
    model,
    maxOutputTokens: 8192,
    system: INTERVIEW_PREP_PROMPT,
    prompt: `Resume:\n${resumeContext}\n\nJob Description:\n${jobDescription.trim() ? jobDescription : '(not provided — use jobIntention or infer the target role from the resume)'}\n\nRespond with JSON only.`,
    providerOptions: getJsonProviderOptions(aiConfig),
  });

  return extractJson(result.text, interviewPrepOutputSchema);
}
