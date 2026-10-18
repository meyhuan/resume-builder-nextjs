// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchWithFailover, ProviderCircuit } from './provider-failover';

const policy = { firstOutputMs: 30, completionMs: 100, failureThreshold: 2, cooldownMs: 60 };
const event = (content: string) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
const stream = (text = 'hello') => new Response(event(text) + 'data: [DONE]\n\n');
const stalled = (signal: AbortSignal) => Promise.resolve(new Response(new ReadableStream({
  start(c) {
    c.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"role":"assistant"}}]}\n\n: heartbeat\n\n'));
    signal.addEventListener('abort', () => c.error(signal.reason), { once: true });
  },
})));
const run = (primary: (s: AbortSignal) => Promise<Response>, backup = vi.fn(async () => stream('backup')),
  extra: Partial<Parameters<typeof fetchWithFailover>[0]> = {}) =>
  fetchWithFailover({ primary, backup, policy, streaming: true, circuit: new ProviderCircuit(), ...extra });

afterEach(() => vi.restoreAllMocks());
describe('provider failover', () => {
  it('preserves all primary SSE bytes without calling backup', async () => {
    const backup = vi.fn(async () => stream('backup'));
    const response = await run(async () => stream(), backup);
    expect(await response.text()).toBe(event('hello') + 'data: [DONE]\n\n');
    expect(backup).not.toHaveBeenCalled();
  });
  it('ignores role and heartbeat chunks, aborts slow primary and switches once', async () => {
    let primarySignal: AbortSignal | undefined;
    const backup = vi.fn(async () => stream('backup'));
    const response = await run(s => { primarySignal = s; return stalled(s); }, backup);
    expect(await response.text()).toContain('backup');
    expect(primarySignal?.aborted).toBe(true);
    expect(backup).toHaveBeenCalledTimes(1);
  });
  it.each([401, 402, 403, 429, 503])('falls back on HTTP %s', async status => {
    expect(await (await run(async () => new Response('', { status }))).text()).toContain('backup');
  });
  it('does not hide invalid request errors', async () => {
    const backup = vi.fn(async () => stream('backup'));
    expect((await run(async () => new Response('invalid', { status: 400 }), backup)).status).toBe(400);
    expect(backup).not.toHaveBeenCalled();
  });
  it('does not retry user cancellations or poison circuit health', async () => {
    const controller = new AbortController();
    const backup = vi.fn(async () => stream('backup'));
    const pending = run(stalled, backup, { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toBeDefined();
    expect(backup).not.toHaveBeenCalled();
  });
  it('does not switch after output has been exposed', async () => {
    let source!: ReadableStreamDefaultController<Uint8Array>;
    const backup = vi.fn(async () => stream('backup'));
    const response = await run(async () => new Response(new ReadableStream({ start(c) {
      source = c; c.enqueue(new TextEncoder().encode(event('primary')));
    } })), backup);
    const reader = response.body!.getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).toContain('primary');
    source.error(new Error('connection lost'));
    await expect(reader.read()).rejects.toThrow('connection lost');
    expect(backup).not.toHaveBeenCalled();
  });
  it('opens circuit, allows one recovery probe, then restores primary', async () => {
    const circuit = new ProviderCircuit();
    const primary = vi.fn(async () => new Response('', { status: 503 }));
    const backup = vi.fn(async () => stream('backup'));
    for (let i = 0; i < 3; i++) await (await run(primary, backup, { circuit })).text();
    expect(primary).toHaveBeenCalledTimes(2);
    await new Promise(resolve => setTimeout(resolve, 70));
    expect(circuit.acquire()).toBe(true);
    expect(circuit.acquire()).toBe(false);
    circuit.success();
    expect(circuit.acquire()).toBe(true);
  });
  it('also deadlines non-streaming JSON completion', async () => {
    expect(await (await run(stalled, vi.fn(async () => new Response('{"ok":true}')), { streaming: false })).json()).toEqual({ ok: true });
  });
  it('stops when both providers fail', async () => {
    const backup = vi.fn(async () => new Response('', { status: 503 }));
    await expect(run(async () => new Response('', { status: 503 }), backup)).rejects.toThrow();
    expect(backup).toHaveBeenCalledTimes(1);
  });
});
