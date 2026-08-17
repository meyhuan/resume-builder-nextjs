import { generateText } from 'ai';
import {
  getJsonProviderOptions,
  getModel,
  type AIConfig,
} from '@/lib/ai/provider';
import {
  jdAnalysisOutputSchema,
  type JdAnalysisOutput,
} from '@/lib/ai/jd-analysis-schema';
import { extractJson } from '@/lib/ai/extract-json';
import { formatJdSuggestionSection } from '@/lib/ai/jd-section-label';
import { serializeResumeContext } from '@/lib/ai/resume-context';
import type { ResumeData } from '@/entities/resume/resume-data';

const JD_ANALYSIS_PROMPT = `You are an expert resume analyst and career coach. Analyze the match between the provided resume and job description.

IMPORTANT: Detect the primary language of the resume content. You MUST respond entirely in the same language as the resume. If the resume is written in Chinese, all your output (summary, suggestions, keywords) must be in Chinese. If in English, respond in English. Match the resume's language exactly.

Your analysis should be thorough and actionable. You MUST return a JSON object with these exact fields:
- overallScore (number 0-100): Overall match rating
- keywordMatches (string[]): Keywords from the JD that ARE present in the resume
- missingKeywords (string[]): Important keywords from the JD that are NOT in the resume
- suggestions (array of {blockId, section, current, suggested}): Actionable improvement suggestions
  - section MUST be a human-readable label from the resume, such as the section title or "求职意向". NEVER use JSON paths or field keys like "jobIntention", "baseInfo", or "sections[1].blocks[0].content".
  - blockId: copy the blockId from the resume context when the suggestion targets a content block
- atsScore (number 0-100): ATS compatibility rating
- summary (string): Concise overall assessment

CRITICAL: You are a JSON API. Your entire response must be a single valid JSON object starting with { and ending with }. Do NOT use markdown syntax. Do NOT wrap in code fences. Do NOT add any text before or after the JSON.`;

export async function analyzeJdMatch(params: {
  resumeData: ResumeData;
  jobDescription: string;
  aiConfig: AIConfig;
}): Promise<JdAnalysisOutput> {
  const { resumeData, jobDescription, aiConfig } = params;
  const model = getModel(aiConfig);
  const resumeContext = serializeResumeContext(resumeData);

  const result = await generateText({
    model,
    maxOutputTokens: 8192,
    system: JD_ANALYSIS_PROMPT,
    prompt: `Resume:\n${resumeContext}\n\nJob Description:\n${jobDescription}\n\nRespond with JSON only.`,
    providerOptions: getJsonProviderOptions(aiConfig),
  });

  const analysisData = extractJson(result.text, jdAnalysisOutputSchema);
  return {
    ...analysisData,
    suggestions: analysisData.suggestions.map((item) => ({
      ...item,
      section: formatJdSuggestionSection(item.section, resumeData, item.blockId),
    })),
  };
}
