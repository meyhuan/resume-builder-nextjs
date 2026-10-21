import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { JdInput } from './_components/jd-input'
vi.mock('sonner', () => ({ toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() } }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const file = (name: string) => new File(['image'], name, { type: 'image/png' })
const upload = (files: File[]) => fireEvent.change(screen.getByLabelText('选择岗位截图'), { target: { files } })

it('preserves existing JD until recognized text is explicitly appended', async () => {
  const change = vi.fn()
  const fetch = vi.fn(async () => Response.json({ text: '负责产品需求分析和跨团队协作' }))
  vi.stubGlobal('fetch', fetch)
  render(<JdInput value="原有岗位描述" onChange={change} maxLength={5000} />)
  upload([file('jd.png')])
  await screen.findByRole('button', { name: '追加到原文' })
  expect(change).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '追加到原文' }))
  expect(change).toHaveBeenCalledWith('原有岗位描述\n\n负责产品需求分析和跨团队协作')
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(fetch).toHaveBeenCalledWith('/next-api/ai/parse-jd-image', expect.objectContaining({ method: 'POST' }))
})

it('retries only failed images and preserves selection order', async () => {
  const change = vi.fn()
  const fetch = vi.fn()
    .mockResolvedValueOnce(Response.json({ text: '第一张' }))
    .mockResolvedValueOnce(Response.json({ error: '暂时失败' }, { status: 500 }))
    .mockResolvedValueOnce(Response.json({ text: '第二张' }))
  vi.stubGlobal('fetch', fetch)
  render(<JdInput value="" onChange={change} maxLength={5000} />)
  upload([file('one.png'), file('two.png')])
  fireEvent.click(await screen.findByRole('button', { name: '重试失败图片' }))
  await waitFor(() => expect(screen.queryByRole('button', { name: '重试失败图片' })).toBeNull())
  fireEvent.click(screen.getByRole('button', { name: '填入 JD' }))
  expect(change).toHaveBeenCalledWith('第一张\n\n第二张')
  expect(fetch).toHaveBeenCalledTimes(3)
})

it('rejects too many files without calling OCR', () => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  render(<JdInput value="" onChange={vi.fn()} maxLength={5000} />)
  upload([file('1.png'), file('2.png'), file('3.png'), file('4.png')])
  expect(fetch).not.toHaveBeenCalled()
})

it('does not silently truncate an oversized append', async () => {
  const change = vi.fn()
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ text: '识别到的长文本' })))
  render(<JdInput value="原文" onChange={change} maxLength={5} />)
  upload([file('jd.png')])
  fireEvent.click(await screen.findByRole('button', { name: '追加到原文' }))
  expect(change).not.toHaveBeenCalled()
  expect(screen.getByText('识别到的长文本')).toBeTruthy()
})
