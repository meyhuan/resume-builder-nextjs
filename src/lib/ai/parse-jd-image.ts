import 'server-only';

import OpenAI from 'openai';
import { getVisionModel, resolveApiKey } from '@/lib/ai/ai-runtime-config';

const EXTRACT_PROMPT = 'Please output only the text content from the image without any additional descriptions or formatting.';

function readMessageText(message: {
  readonly content?: unknown;
  readonly refusal?: string | null;
}): string {
  const content = message.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === 'string' ? text : '';
        }
        return '';
      })
      .join('\n')
      .trim();
  }
  if (typeof message.refusal === 'string') return message.refusal.trim();
  return '';
}

function looksLikeHtml(text: string): boolean {
  return /<(?:html|body|p|ol|ul|li|div|h[1-6])\b/i.test(text);
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function htmlToPlainText(html: string): string {
  let listIndex = 0;
  const text = html
    .replace(/```(?:html|xml)?\s*/gi, '')
    .replace(/```/g, '')
    .replace(/<!doctype[^>]*>/gi, '')
    .replace(/<\/?(?:html|head|body)[^>]*>/gi, '')
    .replace(/<\/ol>/gi, () => {
      listIndex = 0;
      return '\n';
    })
    .replace(/<ol\b[^>]*>/gi, () => {
      listIndex = 0;
      return '\n';
    })
    .replace(/<li\b[^>]*>/gi, () => {
      listIndex += 1;
      return `${listIndex}. `;
    })
    .replace(/<\/(?:p|div|h[1-6]|li)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
  return decodeEntities(text).trim();
}

function normalizeExtractedText(raw: string): string {
  let text = raw
    .replace(/^```(?:text|markdown|html)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  if (!text) return '';
  if (looksLikeHtml(text)) {
    text = htmlToPlainText(text);
  }
  if (/^(empty|none|n\/a|无内容|未识别|没有职位描述)[.。!！]?$/i.test(text)) {
    return '';
  }
  return text;
}

export async function extractJdTextFromImage(params: {
  readonly buffer: Buffer;
  readonly mimeType: string;
}): Promise<string> {
  const model = getVisionModel();
  const client = new OpenAI({
    apiKey: resolveApiKey(model),
    baseURL: model.baseUrl,
    timeout: 90_000,
  });
  const dataUrl = `data:${params.mimeType};base64,${params.buffer.toString('base64')}`;

  const response = await client.chat.completions.create({
    model: model.name,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: EXTRACT_PROMPT },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 4096,
  });

  const choice = response.choices[0];
  const text = normalizeExtractedText(readMessageText(choice?.message ?? {}));
  if (!text) {
    console.warn('[parse-jd-image] empty extraction', {
      model: response.model,
      finish: choice?.finish_reason,
      usage: response.usage,
    });
  }
  return text;
}
