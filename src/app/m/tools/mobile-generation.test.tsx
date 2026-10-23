import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import MobileInterviewPrepClient from './interview-prep/interview-prep-client'
import { createDefaultResume } from '@/lib/default-resume'

vi.mock('./_components/career-quota', () => ({ useCareerQuota: () => ({ allow: () => true, handleError: () => false, refresh: vi.fn(), ui: null }) }))
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }))
vi.mock('@/lib/ai/interview-prep-history', () => ({
  resolveInterviewPrepAccountId: () => null,
  listInterviewPrepHistory: async () => [],
}))
vi.mock('./_components/mobile-tool-header', () => ({ MobileToolHeader: () => null }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const output = {
  greetings: [{ style: 'highlight', text: '期待加入贵司' }],
  selfIntro30s: '我是测试求职者。',
  selfIntro2min: '这是更完整的自我介绍。',
  questions: [],
}
function renderClient(initialTab: 'greetings' | 'intro' = 'greetings') {
  return render(<MobileInterviewPrepClient initialResume={{ id: 'test-resume', title: '测试简历', content: createDefaultResume() }} resumeOptions={[]} initialTab={initialTab} />)
}

it('retains JD after cancellation and ignores an aborted response that arrives late', async () => {
  let finish!: (response: Response) => void
  let signal!: AbortSignal
  vi.stubGlobal('fetch', vi.fn((_url, options) => {
    signal = options.signal
    return new Promise<Response>(resolve => { finish = resolve })
  }))
  renderClient()
  fireEvent.change(screen.getByRole('textbox', { name: '目标岗位职位描述' }), { target: { value: '测试岗位要求' } })
  fireEvent.click(screen.getByRole('button', { name: '生成打招呼文案' }))
  fireEvent.click(await screen.findByRole('button', { name: '取消生成' }))
  expect(signal.aborted).toBe(true)
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('测试岗位要求')
  await act(async () => { finish(new Response(JSON.stringify(output))); await Promise.resolve() })
  expect(screen.queryByText('期待加入')).toBeNull()
  expect(screen.getByRole('button', { name: '生成打招呼文案' })).toBeTruthy()
})

it('uses the interview entry intent to open intro results and the teleprompter', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(output))))
  renderClient('intro')
  fireEvent.click(screen.getByRole('button', { name: '生成面试准备' }))
  await waitFor(() => expect(screen.getByText('我是测试求职者。')).toBeTruthy())
  fireEvent.click(screen.getByRole('button', { name: '提词背诵模式' }))
  expect(screen.getByRole('dialog')).toBeTruthy()
  expect(screen.getByRole('button', { name: '开始滚动' })).toBeTruthy()
})
