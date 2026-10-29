import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import AnalyticsAdminPage from './page'

vi.mock('@/lib/admin-auth', () => ({ getStoredAdminPassword: () => 'test' }))

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('keeps the applied filter label until refresh and explains sampled and independent counts', async () => {
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as { type: string; days: number }
    const payload: Record<string, unknown> = {
      overview: { todayDau: 2, visitorIdentityVersion: 2, eventCounts: [{ eventName: 'page_view', count: body.days }], platforms: [] },
      lifecycle: { steps: [], notes: [] },
      pay: { steps: [{ eventName: 'pay_page_view', count: 2, users: 1, conversionFromFirst: 1 }] },
      export: { steps: [] }, create: { steps: [] },
      errors: { errors: [], total: 501, sampled: 500, truncated: true },
      revenue: { paidOrders: 1, totalAmount: 9, plans: [], channels: [], conversion: [] },
      channels: { attributionVersion: 2, channels: [{ source: 'unattributed', channel: 'unknown', pageViewUsers: 0, loginUsers: 0, exportUsers: 0, paidUsers: 1, paidOrders: 1 }] },
      acquisitionSources: { sources: [] }, templates: { rows: [], notes: [] },
    }
    return { ok: true, json: async () => ({ status: 100, data: payload[body.type] }) }
  })
  vi.stubGlobal('fetch', fetchMock)
  render(<AnalyticsAdminPage />)
  await screen.findByText('7 天事件数 · 全部端')
  await screen.findByText('无法归因')
  expect(screen.getByText('1 人 / 1 单')).toBeTruthy()
  expect(screen.getByText(/仅按最近 500 条聚合/)).toBeTruthy()
  expect(screen.queryByRole('option', { name: '生命周期：浏览器插件' })).toBeNull()
  const payment = screen.getByText('支付事件分布').closest('div')!.parentElement!
  expect(within(payment).getByText('2 次')).toBeTruthy()
  expect(within(payment).queryByText('100%')).toBeNull()
  const dates = screen.getAllByRole('combobox')[0]
  fireEvent.change(dates, { target: { value: '30' } })
  expect(screen.getByText('7 天事件数 · 全部端')).toBeTruthy()
  expect(screen.getByText(/筛选条件已更改/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '刷新数据' }))
  await waitFor(() => expect(screen.getByText('30 天事件数 · 全部端')).toBeTruthy())
  expect(fetchMock.mock.calls.some(([, init]) => JSON.parse(String(init.body)).days === 30)).toBe(true)
})

it('does not display old visitor and attribution numbers as the new metrics', async () => {
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
    const type = (JSON.parse(String(init.body)) as { type: string }).type
    const payload: Record<string, unknown> = {
      overview: { todayDau: 99, eventCounts: [], platforms: [] },
      lifecycle: { steps: [], notes: [] }, pay: { steps: [] }, export: { steps: [] }, create: { steps: [] },
      errors: { errors: [] }, revenue: { plans: [], channels: [], conversion: [] },
      channels: { channels: [{ source: 'direct', channel: 'direct', pageViewUsers: 0, loginUsers: 0, exportUsers: 0, paidUsers: 99, paidOrders: 99 }] },
      acquisitionSources: { sources: [] }, templates: { rows: [], notes: [] },
    }
    return { ok: true, json: async () => ({ status: 100, data: payload[type] }) }
  }))
  render(<AnalyticsAdminPage />)
  await screen.findByText(/统计服务尚未更新，今日访问 UV 暂不展示/)
  expect(screen.getByText(/统计服务尚未更新，渠道付费数据暂不展示/)).toBeTruthy()
  expect(screen.getByText(/统计服务未返回采样状态/)).toBeTruthy()
  expect(screen.queryByText('99')).toBeNull()
  expect(screen.queryByText('99 人 / 99 单')).toBeNull()
})

it('limits one dashboard refresh to three concurrent requests', async () => {
  let active = 0
  let maximum = 0
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    const type = (JSON.parse(String(init.body)) as { type: string }).type
    active++
    maximum = Math.max(maximum, active)
    await new Promise(resolve => setTimeout(resolve, 5))
    active--
    const payload: Record<string, unknown> = {
      overview: { todayDau: 0, visitorIdentityVersion: 2, eventCounts: [], platforms: [] },
      lifecycle: { steps: [], notes: [] }, pay: { steps: [] }, export: { steps: [] }, create: { steps: [] },
      errors: { errors: [], truncated: false }, revenue: { plans: [], channels: [], conversion: [] },
      channels: { attributionVersion: 2, channels: [] }, acquisitionSources: { sources: [] }, templates: { rows: [], notes: [] },
    }
    return { ok: true, json: async () => ({ status: 100, data: payload[type] }) }
  })
  vi.stubGlobal('fetch', fetchMock)
  render(<AnalyticsAdminPage />)
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(10))
  await waitFor(() => expect(screen.getByRole('button', { name: '刷新数据' })).toBeTruthy())
  expect(maximum).toBe(3)
})
