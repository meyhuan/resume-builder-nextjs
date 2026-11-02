import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createDefaultResume } from '@/lib/default-resume';
import { InterviewPrepDialog } from '@/components/interview-prep/interview-prep-dialog';

const state = vi.hoisted(() => ({ saved: [] as unknown[], refresh: vi.fn(async () => {}) }));
vi.mock('@/hooks/use-vip-check', () => ({ useVipCheck: () => ({ requireAiFeature: () => true, refreshQuota: state.refresh, showUpgrade: false, setShowUpgrade: vi.fn() }) }));
vi.mock('@/hooks/use-require-auth', () => ({ useRequireAuth: () => ({ isLoginOpen: false, requireAuth: (fn: () => void) => fn(), handleLoginSuccess: vi.fn(), handleLoginClose: vi.fn() }) }));
vi.mock('@/state/store', () => ({ useAppStore: (fn: (s: unknown) => unknown) => fn({ resume: null }) }));
vi.mock('@/state/editor-ui-store', () => ({ useEditorUiStore: (fn: (s: unknown) => unknown) => fn({ activeModal: null, closeModal: vi.fn(), pendingJobDescription: '', clearPendingJobDescription: vi.fn() }) }));
vi.mock('@/lib/ai/assist-client', () => ({ handleAssistQuotaError: () => false, parseAssistErrorPayload: (v: unknown) => v, trackAssistBlocked: vi.fn(), trackAssistFailed: vi.fn(), trackAssistStart: vi.fn(), trackAssistSuccess: vi.fn(), refreshEditorAssistQuota: vi.fn() }));
vi.mock('@/lib/ai/interview-prep-history', () => ({ resolveInterviewPrepAccountId: () => 'account', listInterviewPrepHistory: async () => [], createInterviewPrepHistoryId: () => 'record', saveInterviewPrepHistory: async (_: string, item: unknown) => { state.saved.push(item); return [item]; }, deleteInterviewPrepHistory: async () => [] }));
vi.mock('@/lib/ai/interview-prep-resume', () => ({ listInterviewPrepResumes: async () => [], fetchInterviewPrepResume: vi.fn() }));
vi.mock('@/components/ai/jd-paste-field', () => ({ JdPasteField: () => null }));
vi.mock('@/components/auth/WxLoginDialog', () => ({ WxLoginDialog: () => null }));
vi.mock('@/components/vip/vip-upgrade-dialog', () => ({ default: () => null }));
vi.mock('@/components/ai/editor-assist-quota-hint', () => ({ EditorAssistQuotaHint: () => null }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); state.saved.length = 0; });
const empty = { jobTitle: '产品经理', summary: '', greetings: [], selfIntro30s: '', selfIntro2min: '', questions: [], gaps: [], coverLetter: { title: '', content: '' } };
it('shows greetings first and merges on-demand results in the same history record', async () => {
  const fetchMock = vi.fn(async (_url, options) => {
    const part = JSON.parse(options.body).part;
    const data = part === 'greetings' ? { greetings: [{ style: 'concise', text: '你好，希望沟通' }] } : part === 'intro' ? { selfIntro30s: '短介绍', selfIntro2min: '长介绍' } : { questions: [{ question: '介绍项目', category: 'project', why: '', experienceHint: '', starAnswer: '', followUps: [] }] };
    return new Response(JSON.stringify({ ...empty, ...data }), { headers: { 'content-type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fetchMock);
  render(<InterviewPrepDialog embedded open resume={createDefaultResume()} resumeId="r1" />);
  fireEvent.click(screen.getByRole('button', { name: '生成打招呼语' }));
  expect(await screen.findByText('你好，希望沟通')).toBeTruthy();
  await waitFor(() => expect(screen.getByRole('button', { name: '生成自我介绍' }).hasAttribute('disabled')).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: '生成自我介绍' }));
  expect(await screen.findByText('短介绍')).toBeTruthy();
  await waitFor(() => expect(screen.getByRole('button', { name: '生成面试题' }).hasAttribute('disabled')).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: '生成面试题' }));
  expect(await screen.findByText('介绍项目')).toBeTruthy();
  await waitFor(() => expect(state.saved).toHaveLength(3));
  expect(fetchMock.mock.calls.map(([, options]) => JSON.parse(options.body).part)).toEqual(['greetings', 'intro', 'questions']);
  expect(state.saved[2]).toMatchObject({ id: 'record', result: { greetings: [{ text: '你好，希望沟通' }], selfIntro30s: '短介绍', questions: [{ question: '介绍项目' }] } });
});

it('keeps generated greetings when a later request fails', async () => {
  vi.stubGlobal('fetch', vi.fn(async (_url, options) => {
    const part = JSON.parse(options.body).part;
    return part === 'greetings'
      ? new Response(JSON.stringify({ ...empty, greetings: [{ style: 'concise', text: '保留打招呼' }] }), { headers: { 'content-type': 'application/json' } })
      : new Response(JSON.stringify({ error: '请求失败' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }));
  render(<InterviewPrepDialog embedded open resume={createDefaultResume()} resumeId="r1" />);
  fireEvent.click(screen.getByRole('button', { name: '生成打招呼语' }));
  expect(await screen.findByText('保留打招呼')).toBeTruthy();
  await waitFor(() => expect(screen.getByRole('button', { name: '生成自我介绍' }).hasAttribute('disabled')).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: '生成自我介绍' }));
  expect((await screen.findByRole('alert')).textContent).toContain('请求失败');
  expect(screen.getByText('保留打招呼')).toBeTruthy();
});
