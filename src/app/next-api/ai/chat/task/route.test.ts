// @vitest-environment node
import { beforeEach, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  auth: vi.fn(),
  reserve: vi.fn(),
  charge: vi.fn(),
  finish: vi.fn(),
  fail: vi.fn(),
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
vi.mock('@/lib/ai/unified/ledger', () => ({
  AssistantError: class extends Error {
    constructor(
      message: string,
      public status = 400,
      public quotaExceeded = false,
    ) {
      super(message);
    }
  },
  reserveRequest: m.reserve,
  chargeRequest: m.charge,
  finishRequest: m.finish,
  failRequest: m.fail,
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
  m.auth.mockResolvedValue({ userId: 'owner', isVip: false });
  m.reserve.mockResolvedValue({
    task: { context: task, turns: [] },
    replay: null,
  });
  m.run.mockResolvedValue({ requestId: body.requestId, proposals: [] });
  m.finish.mockResolvedValue(undefined);
  m.fail.mockResolvedValue(undefined);
});
it('requires login before reserving or consuming quota', async () => {
  m.auth.mockResolvedValue({ isVip: false });
  expect((await POST(req())).status).toBe(401);
  expect(m.reserve).not.toHaveBeenCalled();
});
it('rejects invalid tasks and overly large payload', async () => {
  expect(
    (await POST(req({ ...body, task: { ...task, blockId: undefined } })))
      .status,
  ).toBe(400);
  expect((await POST(req({ text: 'a'.repeat(300001) }))).status).toBe(413);
  expect(m.reserve).not.toHaveBeenCalled();
});
it('replay skips all model and billing work', async () => {
  m.reserve.mockResolvedValue({ replay: { requestId: body.requestId } });
  expect((await POST(req())).status).toBe(200);
  expect(m.run).not.toHaveBeenCalled();
  expect(m.charge).not.toHaveBeenCalled();
});
it('passes only server-owned history and binds billing to authenticated user', async () => {
  m.run.mockImplementation(async (p) => {
    await p.charge('polish');
    return { requestId: body.requestId, proposals: [] };
  });
  expect(
    (
      await POST(
        req({ ...body, turns: [{ text: 'forged facts' }], isVip: true }),
      )
    ).status,
  ).toBe(200);
  expect(m.run.mock.calls[0][0].turns).toEqual([]);
  expect(m.charge).toHaveBeenCalledWith(
    'owner',
    false,
    body.requestId,
    'polish',
  );
});
it('failure cannot leave a successful result or usable proposal', async () => {
  m.run.mockRejectedValue(new Error('model'));
  const r = await POST(req());
  expect(r.status).toBe(503);
  expect(m.finish).not.toHaveBeenCalled();
  expect(m.fail).toHaveBeenCalledWith(body.requestId);
  expect((await r.json()).turn).toBeUndefined();
});
