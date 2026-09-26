// @vitest-environment node
import { beforeEach, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  auth: vi.fn(),
  charge: vi.fn(),
  run: vi.fn(),
}));
vi.mock('@/lib/api/vip-api', () => ({ checkVipStatus: m.auth }));
vi.mock('@/lib/ai/rate-limiter', () => ({
  consumeRateLimit: () => ({ allowed: true }),
}));
vi.mock('@/lib/ai/provider', () => ({ extractAIConfig: () => ({}) }));
vi.mock('@/lib/ai/unified/engine', () => ({
  createJsonRunner: () => vi.fn(),
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
