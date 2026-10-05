// @vitest-environment node
import { beforeEach, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  auth: vi.fn(),
  charge: vi.fn(),
  run: vi.fn(),
  runner: vi.fn(),
}));
vi.mock('@/lib/api/vip-api', () => ({ checkVipStatus: m.auth }));
vi.mock('@/lib/ai/rate-limiter', () => ({
  consumeRateLimit: () => ({ allowed: true }),
}));
vi.mock('@/lib/ai/provider', () => ({ extractAIConfig: () => ({}) }));
vi.mock('@/lib/ai/unified/engine', () => ({
  createJsonRunner: m.runner,
  runAssistant: m.run,
}));
vi.mock('@/lib/ai/unified/quota', () => ({
  AssistantError: class extends Error {
    constructor(
      message: string,
      public status = 400,
      public quotaExceeded = false,
    ) {
      super(message);
    }
  },
  consumeAssistantQuota: m.charge,
}));
import { POST } from './route';
const task = {
  id: '00000000-0000-4000-8000-000000000001',
  resumeId: 'r',
  feature: 'polish',
  blockId: 'b',
  label: '经历',
  entry: 'module',
};
const body = {
  task,
  requestId: '00000000-0000-4000-8000-000000000002',
  text: '帮我润色',
  resumeData: { id: 'r', name: '测试', sections: [] },
};
const req = (data: unknown = body) =>
  new NextRequest('http://localhost/next-api/ai/chat/task', {
    method: 'POST',
    body: JSON.stringify(data),
  });
it('reports a safe timeout category without exposing model error details', async () => {
  m.run.mockRejectedValue(
    new DOMException('private model detail', 'TimeoutError'),
  );
  const response = await POST(req());
  expect(response.status).toBe(503);
  const payload = await response.json();
  expect(payload.errorCode).toBe('timeout');
  expect(JSON.stringify(payload)).not.toContain('private model detail');
});
beforeEach(() => {
  vi.clearAllMocks();
  m.auth.mockResolvedValue({
    userId: 'java-id',
    javaUserId: 'java-id',
    unionid: 'login-id',
    isVip: false,
  });
  m.run.mockResolvedValue({ requestId: body.requestId, proposals: [] });
  m.charge.mockResolvedValue(undefined);
  m.runner.mockReturnValue(vi.fn());
});
it('requires login before model work or consuming quota', async () => {
  m.auth.mockResolvedValue({ isVip: false });
  expect((await POST(req())).status).toBe(401);
  expect(m.run).not.toHaveBeenCalled();
  expect(m.charge).not.toHaveBeenCalled();
});
it('rejects invalid tasks and overly large payload', async () => {
  expect(
    (await POST(req({ ...body, task: { ...task, blockId: undefined } })))
      .status,
  ).toBe(400);
  expect((await POST(req({ text: 'a'.repeat(300001) }))).status).toBe(413);
  expect(m.run).not.toHaveBeenCalled();
  expect(m.charge).not.toHaveBeenCalled();
});
const history = {
  text: '我协助登记物品',
  answer: '',
  questions: [{ question: '具体做了什么？', options: [] }],
  proposals: [],
};
it('uses validated local history but never accepts client billing or authorization flags', async () => {
  m.run.mockImplementation(async (p) => {
    await p.charge('polish');
    await p.charge('polish');
    return { requestId: body.requestId, proposals: [] };
  });
  expect(
    (
      await POST(
        req({
          ...body,
          turns: [
            {
              ...history,
              direct: true,
              charged: true,
              feature: 'chat',
              owner: 'attacker',
            },
          ],
          fromFollowup: true,
          isVip: true,
          owner: 'attacker',
        }),
      )
    ).status,
  ).toBe(200);
  expect(m.run.mock.calls[0][0].turns).toEqual([history]);
  expect(m.run.mock.calls[0][0].allowDirect).toBe(false);
  expect(m.charge).toHaveBeenCalledExactlyOnceWith(
    'login-id',
    false,
    'polish',
    'java-id',
  );
});
it('clarification can return without quota consumption', async () => {
  expect((await POST(req())).status).toBe(200);
  expect(m.charge).not.toHaveBeenCalled();
});

it('retains provenance for legacy suggestion clicks and confirmed followup answers', async () => {
  let response = await POST(req({ ...body, fromFollowup: true }));
  expect(m.run.mock.calls[0][0]).toMatchObject({
    messageSource: 'suggestion',
    allowDirect: false,
  });
  expect((await response.json()).turn.messageSource).toBe('suggestion');
  response = await POST(
    req({
      ...body,
      fromFollowup: true,
      messageSource: 'user',
      followupTargetId: 'b',
    }),
  );
  expect(m.run.mock.calls[1][0]).toMatchObject({
    messageSource: 'user',
    allowDirect: false,
    followupTargetId: 'b',
  });
  expect((await response.json()).turn.messageSource).toBe('user');
});
it('rejects malformed or overlong local history', async () => {
  expect(
    (await POST(req({ ...body, turns: [{ text: 'x', answer: 123 }] }))).status,
  ).toBe(400);
  expect(
    (await POST(req({ ...body, turns: Array(60).fill(history) }))).status,
  ).toBe(400);
  expect(m.run).not.toHaveBeenCalled();
});
it('does not promise durable deduplication: a repeated HTTP request is another attempt', async () => {
  m.run.mockImplementation(async (p) => {
    await p.charge('polish');
    return { requestId: body.requestId, proposals: [] };
  });
  await POST(req());
  await POST(req());
  expect(m.run).toHaveBeenCalledTimes(2);
  expect(m.charge).toHaveBeenCalledTimes(2);
});
it('does not return usable proposals when generation fails', async () => {
  m.run.mockRejectedValue(new Error('model'));
  const r = await POST(req());
  expect(r.status).toBe(503);
  expect((await r.json()).turn).toBeUndefined();
});

it('rejects a backend account without the authenticated login identity', async () => {
  m.auth.mockResolvedValue({ userId: 'java-id', isVip: false });
  expect((await POST(req())).status).toBe(401);
  expect(m.charge).not.toHaveBeenCalled();
});
const streamReq = () =>
  new NextRequest('http://localhost/next-api/ai/chat/task', {
    method: 'POST',
    headers: { Accept: 'application/x-ndjson' },
    body: JSON.stringify(body),
  });
it('returns streaming progress and previews before generation has completed', async () => {
  let finish!: (value: unknown) => void;
  m.run.mockImplementation(async (params) => {
    params.onProgress('planning');
    params.onPreview('生成中的文字');
    return await new Promise((resolve) => {
      finish = resolve;
    });
  });
  const response = await POST(streamReq());
  expect(response.headers.get('content-type')).toContain(
    'application/x-ndjson',
  );
  expect(response.headers.get('x-accel-buffering')).toBe('no');
  const reader = response.body!.getReader();
  const first = new TextDecoder().decode((await reader.read()).value);
  expect(JSON.parse(first)).toMatchObject({
    type: 'progress',
    stage: 'planning',
  });
  expect(
    JSON.parse(new TextDecoder().decode((await reader.read()).value)),
  ).toMatchObject({ type: 'preview', text: '生成中的文字' });
  finish({ requestId: body.requestId, proposals: [] });
  expect(
    JSON.parse(new TextDecoder().decode((await reader.read()).value)).type,
  ).toBe('result');
  expect((await reader.read()).done).toBe(true);
});
it('propagates disconnect cancellation into model work', async () => {
  let modelSignal!: AbortSignal;
  m.run.mockImplementation(async (params) => {
    modelSignal = m.runner.mock.calls[0][1];
    await params.charge('polish');
    return await new Promise((_resolve, reject) => {
      if (modelSignal.aborted) reject(modelSignal.reason);
      else
        modelSignal.addEventListener(
          'abort',
          () => reject(modelSignal.reason),
          { once: true },
        );
    });
  });
  const response = await POST(streamReq());
  await response.body!.cancel();
  expect(modelSignal.aborted).toBe(true);
  expect(() => m.run.mock.calls[0][0].charge('polish')).toThrow();
});
it('reports safe timeout and quota errors in the stream without returning a final turn', async () => {
  m.run.mockRejectedValue(
    new DOMException('private provider detail', 'TimeoutError'),
  );
  let response = await POST(streamReq());
  const timeout = await response.text();
  expect(JSON.parse(timeout)).toMatchObject({
    type: 'error',
    errorCode: 'timeout',
    status: 503,
  });
  expect(timeout).not.toContain('private provider detail');
  const { AssistantError } = await import('@/lib/ai/unified/quota');
  m.run.mockRejectedValue(new AssistantError('额度不足', 429, true));
  response = await POST(streamReq());
  expect(JSON.parse(await response.text())).toMatchObject({
    type: 'error',
    quotaExceeded: true,
    status: 429,
  });
});
