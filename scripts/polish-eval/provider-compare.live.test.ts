// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
vi.mock('server-only', () => ({}));
import { createOpenAIClient, getModelByName, type AiModelConfig } from '@/lib/ai/ai-runtime-config';
import { buildPolishSystemPrompt, buildPolishUserPrompt } from '@/lib/ai/section-prompt-builder';
import { sanitizePolishedHtml, stripHtml, ungroundedNumbers, newTechTerms, placeholderCount, styleIssues } from '@/lib/ai/output-guards';
import type { SectionModuleType } from '@/lib/ai/section-types';

const moduleTypes: Record<string, SectionModuleType> = {
  教育背景: 'education', 工作经历: 'experience', 实习经历: 'internship', 项目经历: 'project',
  校园经历: 'campus', 个人技能: 'skills', 个人总结: 'self-evaluation',
};
type Sample = { role: string; modules: { module: string; original: string }[] };
type Usage = { prompt_tokens: number; completion_tokens: number; prompt_cache_hit_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } };

function costs(usage: Usage, provider: string) {
  const cached = usage.prompt_cache_hit_tokens ?? usage.prompt_tokens_details?.cached_tokens;
  const estimate = (hits: number, peak: boolean) => (
    (usage.prompt_tokens - hits) * (peak ? 2 : 1) + hits *
    (provider === 'bailian' ? (peak ? 0.2 : 0.1) : (peak ? 0.04 : 0.02)) +
    usage.completion_tokens * (peak ? 8 : 4)
  ) / 1e6;
  // Missing cache usage is not treated as proof of zero cache hits.
  return { currency: 'CNY', cachedTokens: cached ?? null,
    offPeak: cached === undefined ? null : estimate(cached, false),
    peak: cached === undefined ? null : estimate(cached, true),
    noCacheOffPeakUpperBound: estimate(0, false), noCachePeakUpperBound: estimate(0, true),
  };
}

it.skipIf(process.env.AI_PROVIDER_COMPARE !== '1')('compares both providers with identical prompts, streaming and usage accounting', async () => {
  // Fail before either provider incurs charges if credentials are incomplete.
  if (!process.env.DEEPSEEK_API_KEY) throw new Error('Configure DEEPSEEK_API_KEY locally before running this comparison');
  const bailian = getModelByName('deepseek-v4.1-flash');
  if (!process.env[bailian.apiKeyEnv]) throw new Error('Missing Bailian credential');
  const official: AiModelConfig = { name: 'deepseek-flash', displayName: 'DeepSeek official',
    baseUrl: 'https://api.deepseek.com', apiKeyEnv: 'DEEPSEEK_API_KEY', thinkingProtocol: 'deepseek', supportsThinking: true, allowFallback: false };
  const providers = [{ id: 'bailian', config: bailian }, { id: 'official', config: official }];
  const clients = providers.map(p => createOpenAIClient(p.config, 'disabled', { timeout: 120000 }).withOptions({ maxRetries: 0 }));
  const samples: Sample[] = JSON.parse(readFileSync('docs/wps-polish-samples-2026-10-18/samples.json', 'utf8'));
  const jobs = samples.flatMap(s => s.modules.map(m => ({ role: s.role, ...m })));
  const limit = Number(process.env.AI_COMPARE_LIMIT || jobs.length);
  const rounds = Number(process.env.AI_COMPARE_ROUNDS || '1');
  const output = process.env.AI_COMPARE_OUT || 'test-artifacts/provider-comparison';
  mkdirSync(output, { recursive: true });
  const results: Record<string, unknown>[] = [];
  const report = { startedAt: new Date().toISOString(), mode: 'disabled', temperature: 0.35, maxTokens: 4096,
    concurrencyPerProvider: 1, automaticRetries: 0, rounds, results,
    pricingAsOf: '2026-10-18', pricingSources: ['https://help.aliyun.com/zh/model-studio/deepseek-v4-1-flash', 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing/'],
    limitations: 'Public-price estimates, not invoices; peak calendars differ. Cached-token absence produces upper bounds. Rule flags are not a factual-quality verdict. Same product settings, not proof of identical underlying model version. Local-network latency, not production-server latency.',
  };
  const save = () => writeFileSync(`${output}/results.json`, JSON.stringify(report, null, 2));
  for (let round = 0; round < rounds; round++) for (const [index, job] of jobs.slice(0, limit).entries()) {
    const moduleType = moduleTypes[job.module] || 'generic';
    const messages = [
      { role: 'system' as const, content: buildPolishSystemPrompt('graduate', moduleType, 'professional', false) },
      { role: 'user' as const, content: buildPolishUserPrompt(job.original) },
    ];
    // Each pair starts together; one active request per provider avoids local queue bias.
    await Promise.all(providers.map(async (provider, pi) => {
      const started = performance.now();
      const row: Record<string, unknown> = { index, round, ...job, provider: provider.id, requestedModel: provider.config.name,
        startedAt: new Date().toISOString(), promptHash: createHash('sha256').update(JSON.stringify(messages)).digest('hex') };
      let raw = '', firstContentMs: number | null = null;
      let usage: Usage | undefined;
      try {
        const stream = await clients[pi].chat.completions.create({ model: provider.config.name, messages,
          temperature: 0.35, max_tokens: 4096, stream: true, stream_options: { include_usage: true } });
        for await (const chunk of stream) {
          row.returnedModel = chunk.model;
          if (chunk.usage) usage = chunk.usage;
          const delta = chunk.choices[0]?.delta.content;
          if (delta) { firstContentMs ??= performance.now() - started; raw += delta; }
          if (chunk.choices[0]?.finish_reason) row.finishReason = chunk.choices[0].finish_reason;
        }
        const elapsedMs = performance.now() - started;
        const cleaned = sanitizePolishedHtml(job.original, raw, moduleType, false);
        const evaluate = (text: string) => ({ numbers: ungroundedNumbers(job.original, text), terms: newTechTerms(job.original, stripHtml(text)),
          placeholders: placeholderCount(text), style: styleIssues(text, moduleType), characters: stripHtml(text).length,
          bullets: (text.match(/<li\b/gi) || []).length,
          skillEscalation: !/熟练|精通/.test(job.original) && /熟练|精通/.test(text),
        });
        Object.assign(row, { ok: Boolean(raw) && row.finishReason === 'stop', raw, cleaned, firstContentMs, elapsedMs,
          usage: usage || null, costs: usage ? costs(usage, provider.id) : null, rawFlags: evaluate(raw), cleanedFlags: evaluate(cleaned) });
      } catch (error) {
        // Never persist headers, request configuration or credentials in errors.
        Object.assign(row, { ok: false, errorName: error instanceof Error ? error.name : 'UnknownError',
          status: typeof error === 'object' && error && 'status' in error ? error.status : null,
          raw, firstContentMs, elapsedMs: performance.now() - started, usage: usage || null });
      }
      results.push(row); save();
    }));
    console.log(`Provider comparison round ${round + 1}: ${index + 1}/${Math.min(limit, jobs.length)}`);
    // Stop expensive batches promptly on authentication or access failures.
    if (results.slice(-2).some(r => [401, 402, 403].includes(Number(r.status)))) throw new Error('Provider authentication, balance or access failed; see sanitized results');
  }
  save();
  expect(results.every(r => r.ok)).toBe(true);
}, 3600000);
