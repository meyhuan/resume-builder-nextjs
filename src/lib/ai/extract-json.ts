import { jsonrepair } from 'jsonrepair';
import type { ZodType } from 'zod';

/**
 * Repair unescaped double quotes inside JSON string values.
 *
 * AI models often output JSON like:
 *   "suggestion": "如"some text"more"
 * where the inner " are content quotes that should be escaped as \".
 */
function repairUnescapedQuotes(text: string): string {
  const len = text.length;
  const out: string[] = [];
  let inString = false;
  let i = 0;

  while (i < len) {
    const ch = text[i];

    if (inString && ch === '\\') {
      out.push(ch);
      if (i + 1 < len) {
        out.push(text[i + 1]);
        i += 2;
      } else {
        i++;
      }
      continue;
    }

    if (ch === '"') {
      if (!inString) {
        inString = true;
        out.push(ch);
      } else {
        let j = i + 1;
        while (j < len && (text[j] === ' ' || text[j] === '\t' || text[j] === '\n' || text[j] === '\r')) {
          j++;
        }
        const next = j < len ? text[j] : '';
        if (next === '' || next === ',' || next === '}' || next === ']' || next === ':') {
          inString = false;
          out.push(ch);
        } else {
          out.push('\\', '"');
        }
      }
    } else {
      out.push(ch);
    }
    i++;
  }

  return out.join('');
}

/** Strip <think>...</think> reasoning blocks (qwen3, deepseek-r1, etc.) */
function stripThinkBlocks(text: string): string {
  let out = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  out = out.replace(/^[\s\S]*?<\/think>/i, '');
  out = out.replace(/<\|?thinking\|?>[\s\S]*?<\|?\/?thinking\|?>/gi, '');
  return out.trim();
}

function stripFences(text: string): string {
  const m = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  return m ? m[1].trim() : text;
}

const KEY_ALIASES: Record<string, string> = {
  comprehensiveScore: 'overallScore',
  totalScore: 'overallScore',
  finalScore: 'overallScore',
  matchedKeywords: 'keywordMatches',
  keywords: 'keywordMatches',
};

function normalizeKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeKeys);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const nk = KEY_ALIASES[k] ?? k;
      out[nk] = normalizeKeys(v);
    }
    return out;
  }
  return value;
}

function tryParse<T>(text: string, schema: ZodType<T>): T | null {
  try {
    const parsed = JSON.parse(text);
    const original = schema.safeParse(parsed);
    if (original.success) return original.data;
    const aliased = schema.safeParse(normalizeKeys(parsed));
    if (aliased.success) return aliased.data;
    return null;
  } catch {
    return null;
  }
}

/**
 * Robustly extract and validate a JSON object from AI text output.
 * Handles: code fences, unescaped quotes, truncated JSON, extra text.
 */
export function extractJson<T>(text: string, schema: ZodType<T>): T {
  const trimmed = text.trim();
  const noThink = stripThinkBlocks(trimmed);
  const cleaned = stripFences(noThink);

  const direct = tryParse(cleaned, schema);
  if (direct !== null) return direct;

  const repaired = repairUnescapedQuotes(cleaned);
  const afterRepair = tryParse(repaired, schema);
  if (afterRepair !== null) return afterRepair;

  try {
    const jr = jsonrepair(repaired);
    const r = tryParse(jr, schema);
    if (r !== null) return r;
  } catch {
    /* ignore */
  }

  const braceStart = cleaned.indexOf('{');
  const braceEnd = cleaned.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    const slice = cleaned.slice(braceStart, braceEnd + 1);
    const repairedSlice = repairUnescapedQuotes(slice);
    const r = tryParse(repairedSlice, schema);
    if (r !== null) return r;
    try {
      const jr = jsonrepair(repairedSlice);
      const r2 = tryParse(jr, schema);
      if (r2 !== null) return r2;
    } catch {
      /* ignore */
    }
  }

  const bracketStart = cleaned.indexOf('[');
  const bracketEnd = cleaned.lastIndexOf(']');
  if (bracketStart !== -1 && bracketEnd > bracketStart) {
    const arrSlice = cleaned.slice(bracketStart, bracketEnd + 1);
    try {
      const parsed = JSON.parse(arrSlice);
      if (Array.isArray(parsed) && parsed.length === 1 && typeof parsed[0] === 'object') {
        const r = tryParse(JSON.stringify(parsed[0]), schema);
        if (r !== null) return r;
      }
    } catch {
      /* ignore */
    }
    try {
      const jr = jsonrepair(arrSlice);
      const parsed = JSON.parse(jr);
      if (Array.isArray(parsed) && parsed.length === 1 && typeof parsed[0] === 'object') {
        const r = tryParse(JSON.stringify(parsed[0]), schema);
        if (r !== null) return r;
      }
    } catch {
      /* ignore */
    }
  }

  console.error('[extractJson] FULL failed text:\n', cleaned);
  throw new Error(`Failed to extract valid JSON from AI response (length=${text.length})`);
}
