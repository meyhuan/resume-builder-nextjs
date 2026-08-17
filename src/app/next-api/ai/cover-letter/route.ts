import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { extractAIConfig, getModel, AIConfigError } from '@/lib/ai/provider';
import { withQuotaCheck } from '@/lib/quota/quota-guard';
import { coverLetterInputSchema } from '@/lib/ai/cover-letter-schema';
import { serializeResumeContext } from '@/lib/ai/resume-context';
import type { ResumeData } from '@/entities/resume/resume-data';

interface CoverLetterOutput {
  title: string;
  content: string;
}

const TONE_INSTRUCTIONS: Record<string, string> = {
  formal: 'Use a formal, professional tone. Be respectful and polished. Avoid casual language.',
  friendly: 'Use a warm, approachable tone while remaining professional. Show enthusiasm and personality.',
  confident: 'Use a confident, assertive tone. Highlight achievements boldly. Show strong conviction in your abilities.',
};

function getSystemPrompt(tone: string, language: string): string {
  const LANG_NAMES: Record<string, string> = {
    zh: 'Simplified Chinese', en: 'English', ja: 'Japanese', ko: 'Korean',
    fr: 'French', de: 'German', es: 'Spanish', pt: 'Portuguese', ru: 'Russian', ar: 'Arabic',
  };
  const lang = LANG_NAMES[language] || 'English';
  const toneInstruction = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.formal;

  return `You are an expert cover letter writer. Write a tailored cover letter in ${lang}.

Tone: ${toneInstruction}

Cover letter guidelines:
- Carefully analyze the resume data and job description to identify the strongest matching points
- Open with a compelling hook — not a generic "I am writing to apply"
- Connect specific resume achievements to job requirements
- Show knowledge of the company/role based on the JD
- Highlight 2-3 key accomplishments that directly relate to the position
- Close with a confident call to action
- Keep the letter concise (3-4 paragraphs, ~300-400 words)
- Generate an appropriate title like "Cover Letter for [Position] at [Company]"

Output format — use EXACTLY this structure:
TITLE: <your title here>
---CONTENT---
<your full cover letter here>

Do NOT use JSON. Do NOT use markdown code fences. Just follow the format above.`;
}

function parseCoverLetter(text: string): CoverLetterOutput {
  const separator = '---CONTENT---';
  const sepIndex = text.indexOf(separator);
  if (sepIndex !== -1) {
    const titlePart = text.slice(0, sepIndex).trim();
    const content = text.slice(sepIndex + separator.length).trim();
    const title = titlePart.replace(/^TITLE:\s*/i, '').trim();
    return { title, content };
  }
  const lines = text.trim().split('\n');
  const firstLine = lines[0].replace(/^#+\s*/, '').replace(/^TITLE:\s*/i, '').trim();
  const content = lines.slice(1).join('\n').trim();
  return { title: firstLine, content: content || text.trim() };
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    return withQuotaCheck('ai:editor-assist', async () => {
    const body = await request.json();
    const parsed = coverLetterInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: '请求格式不正确' }, { status: 400 });
    }

    const resumeData = parsed.data.resumeData as ResumeData;
    if (!resumeData?.sections) {
      return NextResponse.json({ error: '缺少简历数据' }, { status: 400 });
    }

    const { jobDescription, tone } = parsed.data;
    const language = parsed.data.language || 'zh';
    const aiConfig = extractAIConfig(request);
    const model = getModel(aiConfig);
    const resumeContext = serializeResumeContext(resumeData);

    const result = await generateText({
      model,
      maxOutputTokens: 4096,
      system: getSystemPrompt(tone, language),
      prompt: `## Resume Data
${resumeContext}

## Job Description
${jobDescription}

Based on this resume and job description, write a tailored cover letter. Use the TITLE:/---CONTENT--- format specified in the system prompt.`,
    });

    return NextResponse.json(parseCoverLetter(result.text));
    });
  } catch (error) {
    if (error instanceof AIConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error('POST /next-api/ai/cover-letter error:', error);
    return NextResponse.json({ error: '求职信生成失败' }, { status: 500 });
  }
}
