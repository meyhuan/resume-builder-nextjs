// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { generateText } from 'ai';
import { createOpenAIClient, getModelByName } from './ai-runtime-config';
import { getModel } from './provider';
import { officialCircuit } from './provider-failover';

it.skipIf(process.env.AI_FAILOVER_LIVE !== '1')('real official and Bailian responses through both SDKs, including injected failures', async () => {
  const nativeFetch = globalThis.fetch;
  const records: unknown[] = [];
  try {
    for (const scenario of ['official-stream', 'official-json', 'slow-primary-stream', 'unavailable-primary-json']) {
      officialCircuit.success();
      const calls: string[] = [];
      let cancelled = false;
      vi.stubEnv('AI_PRIMARY_FIRST_OUTPUT_MS', scenario === 'slow-primary-stream' ? '40' : '10000');
      vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(input instanceof Request ? input.url : String(input));
        calls.push(url.hostname);
        if (url.hostname === 'api.deepseek.com' && scenario === 'slow-primary-stream') {
          return new Response(new ReadableStream({ start(c) {
            init?.signal?.addEventListener('abort', () => { cancelled = true; c.error(init.signal!.reason); }, { once: true });
          } }));
        }
        if (url.hostname === 'api.deepseek.com' && scenario === 'unavailable-primary-json') {
          return new Response('', { status: 503 });
        }
        return nativeFetch(input, init);
      });
      const start = Date.now();
      let text = '';
      if (scenario.endsWith('stream')) {
        const client = createOpenAIClient(getModelByName('deepseek-flash'));
        const stream = await client.chat.completions.create({ model: 'deepseek-flash', stream: true,
          messages: [{ role: 'user', content: '仅润色这句话，不增加事实：使用 Excel 登记库存数量。' }], max_tokens: 128 });
        for await (const chunk of stream) text += chunk.choices[0]?.delta.content ?? '';
      } else {
        const result = await generateText({ model: getModel({ provider: 'dashscope', model: 'deepseek-flash', apiKey: '', baseURL: '' }),
          prompt: '仅返回 JSON：{"text":"使用 Excel 登记库存数量"}', maxOutputTokens: 128, maxRetries: 0 });
        text = result.text;
        expect(JSON.parse(text).text).toBeTruthy();
      }
      expect(text).toBeTruthy();
      expect(calls[0]).toBe('api.deepseek.com');
      if (scenario.startsWith('official')) expect(calls).toHaveLength(1);
      else {
        expect(calls).toHaveLength(2);
        expect(calls[1]).toContain('aliyuncs.com');
      }
      if (scenario === 'slow-primary-stream') expect(cancelled).toBe(true);
      records.push({ scenario, calls, text, elapsedMs: Date.now() - start, cancelled });
    }
  } finally {
    vi.unstubAllGlobals(); vi.unstubAllEnvs(); officialCircuit.success();
    mkdirSync('test-artifacts/provider-failover', { recursive: true });
    writeFileSync('test-artifacts/provider-failover/live.json', JSON.stringify(records, null, 2));
  }
}, 180000);
