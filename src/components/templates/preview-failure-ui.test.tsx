import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import EditorError from '@/app/editor/error'

afterEach(cleanup)

it('offers recovery when the editor route fails', () => {
  const reset = vi.fn()
  render(<EditorError error={new Error('private details')} reset={reset} />)
  expect(screen.getByRole('alert').textContent).toContain('简历加载失败')
  expect(screen.queryByText('private details')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '重新加载简历' }))
  expect(reset).toHaveBeenCalledOnce()
})
