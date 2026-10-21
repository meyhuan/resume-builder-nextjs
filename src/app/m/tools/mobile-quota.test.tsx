import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import Interview from './interview-prep/interview-prep-client'
import JdMatch from './jd-match/jd-match-client'
import Translate from './translate/translate-client'
import { createDefaultResume } from '@/lib/default-resume'

const navigation = vi.hoisted(() => ({ push: vi.fn(), back: vi.fn() }))
vi.mock('@/hooks/use-vip-check', () => ({ useVipCheck: () => ({ quota: { aiEditorAssist: { allowed: true, isVip: false, remaining: 19, limit: 20 } }, quotaLoaded: true, refreshQuota: vi.fn(), setShowUpgrade: vi.fn(), showUpgrade: false }) }))
vi.mock('../_components/use-mini-program', () => ({ useInMiniProgram: () => true }))
vi.mock('@/components/vip/vip-upgrade-dialog', () => ({ default: () => null }))
vi.mock('next/navigation', () => ({ useRouter: () => navigation }))
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }))
vi.mock('@/lib/ai/interview-prep-history', () => ({
  resolveInterviewPrepAccountId: () => null, listInterviewPrepHistory: async () => [],
}))
vi.mock('@/lib/ai/analysis-history', () => ({ listAnalysisHistory: async () => [] }))
vi.mock('./_components/mobile-tool-header', () => ({ MobileToolHeader: () => null }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks() })

it('keeps quota below generation and reveals charging rules only on request', () => {
  const initialResume = { id: 'quota-test', title: '测试简历', template: 'simple', content: createDefaultResume() }
  render(<Interview initialResume={initialResume} resumeOptions={[]} initialTab="greetings" />)
  const generate = screen.getByRole('button', { name: '生成打招呼文案' })
  const hint = screen.getByText(/本次消耗 1 次/)
  expect(generate.parentElement?.contains(hint)).toBe(true)
  expect(generate.compareDocumentPosition(hint) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(screen.queryByRole('button', { name: '开通会员' })).toBeNull()
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.queryByText(/主动取消或离开页面不退次/)).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '查看扣次规则' }))
  expect(screen.getByRole('dialog')).toBeTruthy()
  expect(screen.getByText(/主动取消或离开页面不退次/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '知道了' }))
  expect(screen.queryByRole('dialog')).toBeNull()
})

it.each(['greetings', 'intro', 'jd', 'translate'] as const)(
  'audits the current exhausted-quota UI for %s without spending real quota', async tool => {
    const message = 'AI助手次数已达上限（20次/天），升级VIP可无限使用'
    const fetch = vi.fn(async () => new Response(JSON.stringify({
      error: message, quotaExceeded: true, remaining: 0,
    }), { status: 429 }))
    vi.stubGlobal('fetch', fetch)
    const initialResume = { id: 'quota-test', title: '测试简历', template: 'simple', content: createDefaultResume() }
    if (tool === 'jd') {
      render(<JdMatch initialResume={initialResume} resumeOptions={[]} />)
      fireEvent.change(screen.getByRole('textbox'), { target: { value: '负责用户研究、产品需求分析和项目沟通，具有良好的表达能力。' } })
      fireEvent.click(screen.getByRole('button', { name: /开始岗位匹配度测试/ }))
    } else if (tool === 'translate') {
      render(<Translate initialResume={initialResume} resumeOptions={[]} />)
      fireEvent.click(screen.getByRole('button', { name: /一键翻译为/ }))
    } else {
      render(<Interview initialResume={initialResume} resumeOptions={[]} initialTab={tool} />)
      fireEvent.click(screen.getByRole('button', { name: tool === 'greetings' ? '生成打招呼文案' : '生成面试准备' }))
    }
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(navigation.push).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '明日再试' })).toBeTruthy()
    const navigateTo = vi.fn()
    vi.stubGlobal('wx', { miniProgram: { navigateTo } })
    fireEvent.click(screen.getAllByRole('button', { name: '开通会员' }).at(-1)!)
    expect(navigateTo).toHaveBeenCalledWith({ url: '/pages/payment/payment?from=ai' })
    expect(toast.error).not.toHaveBeenCalled()
  },
)
