import { expect, it, vi } from 'vitest';
import { track } from '@/lib/analytics';
import { failureForStatus, trackAssistant } from './analytics';
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));

it.each([
  [401, false, 'auth'],
  [403, false, 'auth'],
  [429, false, 'rate_limit'],
  [429, true, 'quota'],
  [400, false, 'invalid_request'],
  [413, false, 'invalid_request'],
  [404, false, 'unavailable'],
  [503, false, 'server'],
  [504, false, 'timeout'],
] as const)('classifies HTTP %s quota=%s as %s', (status, quota, reason) => {
  expect(failureForStatus(status, quota)).toBe(reason);
});

it('telemetry failure cannot prevent an edit', () => {
  vi.mocked(track).mockImplementationOnce(() => {
    throw new Error('storage disabled');
  });
  expect(() =>
    trackAssistant('apply', { requestId: 'r', proposalId: 'r:proposal:0' }),
  ).not.toThrow();
});
