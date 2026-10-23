// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { createThinkingFetch, getModelByName, getVisionModel, resolveApiKey } from './ai-runtime-config';
import { officialCircuit } from './provider-failover';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); officialCircuit.success(); });

it('rewrites credentials, model and reasoning protocol only for the backup request', async () => {
  vi.stubEnv('DEEPSEEK_API_KEY', 'test-official');
  vi.stubEnv('DASHSCOPE_API_KEY', 'test-backup');
  vi.stubEnv('AI_PROVIDER_FALLBACK', 'true');
  const requests: { url: string; headers: Headers; body: Record<string, unknown> }[] = [];
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    requests.push({ url, headers: new Headers(init.headers), body: JSON.parse(init.body as string) });
    return requests.length === 1 ? new Response('', { status: 503 }) : new Response('{"ok":true}');
  });
  await createThinkingFetch(getModelByName('deepseek-flash'), 'low')('https://api.deepseek.com/chat/completions', {
    method: 'POST', headers: { authorization: 'Bearer test-official' },
    body: JSON.stringify({ model: 'deepseek-flash', messages: [], thinking: { type: 'enabled' } }),
  });
  expect(requests[0].body.thinking).toEqual({ type: 'enabled' });
  expect(requests[0].headers.get('authorization')).toBe('Bearer test-official');
  expect(requests[1].url).toContain('aliyuncs.com/compatible-mode/v1/chat/completions');
  expect(requests[1].headers.get('authorization')).toBe('Bearer test-backup');
  expect(requests[1].body.model).toBe('deepseek-v4.1-flash');
  expect(requests[1].body.thinking).toBeUndefined();
  expect(requests[1].body.enable_thinking).toBe(true);
  expect(requests[1].body.thinking_budget).toBe(2048);
});

it('does not send a Bailian credential to the official host when the official key is missing', async () => {
  vi.stubEnv('DEEPSEEK_API_KEY', '');
  vi.stubEnv('DASHSCOPE_API_KEY', 'test-backup');
  vi.stubEnv('AI_PROVIDER_FALLBACK', 'true');
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const fetcher = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () => new Response('{"ok":true}'));
  vi.stubGlobal('fetch', fetcher);
  expect(resolveApiKey(getModelByName('deepseek-flash'))).not.toBe('test-backup');
  await createThinkingFetch(getModelByName('deepseek-flash'), 'disabled')('https://api.deepseek.com/chat/completions', {
    method: 'POST', body: JSON.stringify({ model: 'deepseek-flash', messages: [] }),
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(String(fetcher.mock.calls[0]?.[0])).toContain('aliyuncs.com');
  expect(warn).toHaveBeenCalledWith(expect.stringContaining('reason=missing key'));
  expect(warn.mock.calls.flat().join(' ')).not.toContain('test-backup');
});

it('keeps OCR on Bailian and does not apply the text-model failover', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const fetcher = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () => new Response('{"ok":true}'));
  vi.stubGlobal('fetch', fetcher);
  const vision = getVisionModel();
  expect(vision.name).toBe('qwen3.5-ocr');
  expect(vision.baseUrl).not.toContain('api.deepseek.com');
  await createThinkingFetch(vision, 'disabled')('https://vision.example/chat/completions', {
    method: 'POST', body: JSON.stringify({ model: vision.name, messages: [] }),
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(String(fetcher.mock.calls[0]?.[0])).toBe('https://vision.example/chat/completions');
  expect(warn).not.toHaveBeenCalled();
});
