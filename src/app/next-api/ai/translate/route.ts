import { NextRequest } from 'next/server';
import { generateText, type LanguageModel } from 'ai';
import { extractAIConfig, getJsonProviderOptions, getModel, AIConfigError, type AIConfig } from '@/lib/ai/provider';
import { extractJson } from '@/lib/ai/extract-json';
import { withQuotaCheck } from '@/lib/quota/quota-guard';
import {
  translateInputSchema,
  translatedHeaderSchema,
  translatedSectionSchema,
} from '@/lib/ai/translate-schema';
import type { ResumeData } from '@/entities/resume/resume-data';

const LANGUAGE_NAMES: Record<string, string> = {
  zh: 'Simplified Chinese',
  en: 'English',
  ja: 'Japanese',
  ko: 'Korean',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
  pt: 'Portuguese',
  ru: 'Russian',
  ar: 'Arabic',
};

const MAX_CONCURRENCY = 4;

function getTranslatePrompt(targetLanguage: string): string {
  const langName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
  return `You are a professional resume translator. Translate the given resume section into ${langName}.

Rules:
- Use professional, formal ${langName} appropriate for resumes
- Translate job titles, descriptions, and achievements naturally
- Keep proper nouns in their commonly recognized form. If no standard translation exists, keep original
- Dates remain in the same format (YYYY-MM)
- Technical terms and programming languages stay in English (e.g., JavaScript, React, AWS)
- Section titles should use standard resume headings in the target language
- Preserve the exact JSON structure and all field names — only translate string values
- Keep all IDs, URLs, emails, phone numbers unchanged
- CRITICAL: Return a single valid JSON object. No markdown, no code fences, no extra text.`;
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
  onSettled?: (index: number, result: PromiseSettledResult<R>) => void,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      try {
        const value = await fn(items[i]);
        results[i] = { status: 'fulfilled', value };
      } catch (reason) {
        results[i] = { status: 'rejected', reason };
      }
      onSettled?.(i, results[i]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    return withQuotaCheck('ai:editor-assist', async () => {
    const body = await request.json();
    const parsed = translateInputSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: '请求格式不正确' }), { status: 400 });
    }

    const resumeData = parsed.data.resumeData as ResumeData;
    if (!resumeData?.sections) {
      return new Response(JSON.stringify({ error: '缺少简历数据' }), { status: 400 });
    }

    const { targetLanguage } = parsed.data;
    const aiConfig = extractAIConfig(request);
    const model = getModel(aiConfig);
    const encoder = new TextEncoder();

    const units: Array<{ type: 'header' } | { type: 'section'; sectionId: string }> = [
      { type: 'header' },
      ...resumeData.sections.map((section) => ({ type: 'section' as const, sectionId: section.id })),
    ];

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>): void => {
          try {
            controller.enqueue(encoder.encode(`${JSON.stringify(data)}\n`));
          } catch {
            // client cancelled
          }
        };

        let completed = 0;
        const total = units.length;
        let failedCount = 0;

        await runWithConcurrency(units, MAX_CONCURRENCY, async (unit) => {
          if (unit.type === 'header') {
            return translateHeader(resumeData, targetLanguage, model, aiConfig);
          }
          const section = resumeData.sections.find((item) => item.id === unit.sectionId);
          if (!section) throw new Error(`Section not found: ${unit.sectionId}`);
          return translateSection(section, targetLanguage, model, aiConfig);
        }, (_index, result) => {
          completed += 1;
          if (result.status === 'rejected') {
            failedCount += 1;
            send({ type: 'progress', completed, total });
            return;
          }
          send({ type: 'progress', completed, total, unit: result.value });
        });

        send({
          type: 'done',
          language: targetLanguage,
          failedCount,
        });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
      },
    });
    });
  } catch (error) {
    if (error instanceof AIConfigError) {
      return new Response(JSON.stringify({ error: error.message }), { status: 503 });
    }
    console.error('POST /next-api/ai/translate error:', error);
    return new Response(JSON.stringify({ error: '翻译失败' }), { status: 500 });
  }
}

async function translateHeader(
  resume: ResumeData,
  targetLanguage: string,
  model: LanguageModel,
  aiConfig: AIConfig,
) {
  const payload = {
    kind: 'header',
    name: resume.name,
    baseInfo: resume.baseInfo
      ? { ...resume.baseInfo, avatarUrl: undefined }
      : undefined,
    jobIntention: resume.jobIntention,
  };
  const result = await generateText({
    model,
    maxOutputTokens: 2048,
    system: getTranslatePrompt(targetLanguage),
    prompt: `Translate this resume header. Return JSON with keys: kind ("header"), name, baseInfo, jobIntention.\n\n${JSON.stringify(payload)}`,
    providerOptions: getJsonProviderOptions(aiConfig),
  });
  return extractJson(result.text, translatedHeaderSchema);
}

async function translateSection(
  section: ResumeData['sections'][number],
  targetLanguage: string,
  model: LanguageModel,
  aiConfig: AIConfig,
) {
  const payload = {
    sectionId: section.id,
    title: section.title,
    blocks: section.blocks,
  };
  const result = await generateText({
    model,
    maxOutputTokens: 4096,
    system: getTranslatePrompt(targetLanguage),
    prompt: `Translate this resume section. Return JSON with keys: sectionId, title, blocks.\n\n${JSON.stringify(payload)}`,
    providerOptions: getJsonProviderOptions(aiConfig),
  });
  return extractJson(result.text, translatedSectionSchema);
}
