import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import MobileInterviewPrepClient from './interview-prep/interview-prep-client'
import { createDefaultResume } from '@/lib/default-resume'

vi.mock('./_components/career-quota', () => ({ useCareerQuota: () => ({ allow: () => true, handleError: () => false, refresh: vi.fn(), ui: null }) }))
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }))
const history = vi.hoisted(() => ({ enabled: false, items: [] as unknown[], loaded: [] as unknown[], fetchResume: vi.fn() }))
vi.mock('@/lib/ai/interview-prep-history', () => ({
  resolveInterviewPrepAccountId: () => history.enabled ? 'account' : null,
  listInterviewPrepHistory: async () => history.loaded,
  createInterviewPrepHistoryId: () => 'one-record',
  saveInterviewPrepHistory: async (_account: string, item: unknown) => { history.items.push(item); return [item] },
}))
vi.mock('@/lib/ai/interview-prep-resume', () => ({ fetchInterviewPrepResume: history.fetchResume }))
vi.mock('./_components/mobile-tool-header', () => ({ MobileToolHeader: ({ rightAction }: { rightAction: React.ReactNode }) => <div>{rightAction}</div> }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

afterEach(() => { cleanup(); vi.unstubAllGlobals(); history.enabled = false; history.items.length = 0; history.loaded.length = 0; history.fetchResume.mockReset() })

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
  fireEvent.click(screen.getByRole('button', { name: '生成自我介绍' }))
  await waitFor(() => expect(screen.getByText('我是测试求职者。')).toBeTruthy())
  fireEvent.click(screen.getByRole('button', { name: '提词背诵模式' }))
  expect(screen.getByRole('dialog')).toBeTruthy()
  expect(screen.getByRole('button', { name: '开始滚动' })).toBeTruthy()
})


it('generates each part on demand and merges it into one history record', async () => {
  history.enabled = true
  const base = { jobTitle: '产品', summary: '', greetings: [], selfIntro30s: '', selfIntro2min: '', questions: [], gaps: [], coverLetter: { title: '', content: '' } }
  const fetchMock = vi.fn(async (_url, options) => {
    const part = JSON.parse(options.body).part
    const data = part === 'greetings' ? { greetings: [{ style: 'highlight', text: '你好，期待沟通' }] } : part === 'intro' ? { selfIntro30s: '简短介绍', selfIntro2min: '完整介绍' } : { questions: [{ question: '介绍项目', category: 'project', why: '', experienceHint: '', starAnswer: '', followUps: [] }] }
    return new Response(JSON.stringify({ ...base, ...data }))
  })
  vi.stubGlobal('fetch', fetchMock)
  renderClient()
  fireEvent.click(screen.getByRole('button', { name: '生成打招呼文案' }))
  expect(await screen.findByText('你好，期待沟通')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '自我介绍' }))
  fireEvent.click(screen.getByRole('button', { name: '生成自我介绍' }))
  expect(await screen.findByText('简短介绍')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /面试题 \(0\)/ }))
  fireEvent.click(screen.getByRole('button', { name: '生成面试题' }))
  expect(await screen.findByText(/介绍项目/)).toBeTruthy()
  await waitFor(() => expect(history.items).toHaveLength(3))
  expect(fetchMock.mock.calls.map(([, options]) => JSON.parse(options.body).part)).toEqual(['greetings', 'intro', 'questions'])
  expect(history.items[2]).toMatchObject({ id: 'one-record', result: { greetings: [{ text: '你好，期待沟通' }], selfIntro30s: '简短介绍', questions: [{ question: '介绍项目' }] } })
  fireEvent.click(screen.getByRole('button', { name: /打招呼 \(1\)/ }))
  expect(screen.getByText('你好，期待沟通')).toBeTruthy()
})


it('continues a restored record using its original resume and job description', async () => {
  history.enabled = true
  const savedResume = createDefaultResume()
  const base = { jobTitle: '产品', summary: '', greetings: [{ style: 'concise', text: '历史文案' }], selfIntro30s: '', selfIntro2min: '', questions: [], gaps: [], coverLetter: { title: '', content: '' } }
  history.loaded.push({ id: 'previous', createdAt: 100, result: base, jobDescription: '历史岗位', resumeId: 'other-resume', resumeTitle: '原简历' })
  history.fetchResume.mockResolvedValue({ resume: savedResume, title: '原简历' })
  const fetchMock = vi.fn<(url: string, options: { body: string }) => Promise<Response>>(async () => new Response(JSON.stringify({ ...base, greetings: [], selfIntro30s: '历史简历生成', selfIntro2min: '历史完整介绍' })))
  vi.stubGlobal('fetch', fetchMock)
  renderClient()
  fireEvent.click(await screen.findByRole('button', { name: /历史 \(1\)/ }))
  fireEvent.click(screen.getByText('原简历'))
  fireEvent.click(screen.getByRole('button', { name: '自我介绍' }))
  fireEvent.click(screen.getByRole('button', { name: '生成自我介绍' }))
  expect(await screen.findByText('历史简历生成')).toBeTruthy()
  expect(history.fetchResume).toHaveBeenCalledWith('other-resume')
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ part: 'intro', jobDescription: '历史岗位', resumeData: JSON.parse(JSON.stringify(savedResume)) })
  expect(history.items[0]).toMatchObject({ id: 'previous', resumeId: 'other-resume' })
})
