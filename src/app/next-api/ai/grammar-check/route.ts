import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { extractAIConfig, getJsonProviderOptions, getModel, AIConfigError } from '@/lib/ai/provider';
import { withQuotaCheck } from '@/lib/quota/quota-guard';
import { extractJson } from '@/lib/ai/extract-json';
import { grammarCheckInputSchema, grammarCheckOutputSchema } from '@/lib/ai/grammar-check-schema';
import { serializeResumeContext } from '@/lib/ai/resume-context';
import type { ResumeData } from '@/entities/resume/resume-data';

const GRAMMAR_CHECK_PROMPT = `You are an expert resume reviewer and writing coach. Analyze the provided resume sections for writing quality issues.

IMPORTANT: Detect the primary language of the resume content. You MUST respond entirely in the same language as the resume. If the resume is written in Chinese, all your output (summary, suggestions, sectionTitle) must be in Chinese. If in English, respond in English. Match the resume's language exactly.

You must detect and report these types of issues:
- grammar: Grammatical errors, incorrect tense, subject-verb disagreement, article misuse
- spelling: Misspelled words or typos
- weak_verb: Weak or passive verbs that should be replaced with strong action verbs
- vague: Vague or generic descriptions that lack specificity
- quantify: Descriptions that could be improved with quantifiable metrics

Analysis guidelines:
- Check every text field in every section: titles, descriptions, highlights, summary text
- For each issue, provide the exact original text and a concrete suggestion
- Set severity: "high" for grammar/spelling errors, "medium" for weak verbs and vague descriptions, "low" for quantify suggestions
- Be thorough but practical — only flag genuinely improvable items
- Provide a brief overall summary of the writing quality
- Assign a score from 0-100 (100 = perfect, no issues found)

You MUST return a JSON object with exactly these fields:
- issues: array of { blockId, sectionTitle, type, original, suggestion, severity }
- summary: string with overall assessment
- score: number from 0 to 100

CRITICAL: You are a JSON API. Your entire response must be a single valid JSON object starting with { and ending with }. Do NOT use markdown syntax. Do NOT wrap in code fences. Do NOT add any text before or after the JSON.`;

export async function POST(request: NextRequest): Promise<Response> {
  try {
    return withQuotaCheck('ai:editor-assist', async () => {
    const body = await request.json();
    const parsed = grammarCheckInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: '请求格式不正确' }, { status: 400 });
    }

    const resumeData = parsed.data.resumeData as ResumeData;
    if (!resumeData?.sections) {
      return NextResponse.json({ error: '缺少简历数据' }, { status: 400 });
    }

    const aiConfig = extractAIConfig(request);
    const model = getModel(aiConfig);
    const resumeContext = serializeResumeContext(resumeData);

    const result = await generateText({
      model,
      maxOutputTokens: 8192,
      system: GRAMMAR_CHECK_PROMPT,
      prompt: `Analyze the following resume sections. Use blockId from the resume data. Respond with JSON only.\n\n${resumeContext}`,
      providerOptions: getJsonProviderOptions(aiConfig),
    });

    const checkResult = extractJson(result.text, grammarCheckOutputSchema);
    return NextResponse.json(checkResult);
    });
  } catch (error) {
    if (error instanceof AIConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error('POST /next-api/ai/grammar-check error:', error);
    return NextResponse.json({ error: '语法检查失败' }, { status: 500 });
  }
}
