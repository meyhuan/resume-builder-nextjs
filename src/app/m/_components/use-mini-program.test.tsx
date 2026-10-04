import { act } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { hydrateRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { useInMiniProgram } from './use-mini-program'

const runtime = vi.hoisted(() => ({ hasStandaloneHint: vi.fn(), rememberCurrentUrl: vi.fn(), rememberMiniProgram: vi.fn() }))
vi.mock('./mini-program-runtime', () => ({ miniProgramRuntime: runtime }))
afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = '' })

it('hydrates a standalone mobile page without changing the server-rendered navigation structure', async () => {
  function Surface() { return <div>{useInMiniProgram() ? '小程序模式' : <button>返回</button>}</div> }
  runtime.hasStandaloneHint.mockReturnValue(false)
  const container = document.createElement('div')
  container.innerHTML = renderToString(<Surface />)
  document.body.appendChild(container)
  expect(container.textContent).toBe('小程序模式')
  // Browser URL/session hints are unavailable to the server.
  runtime.hasStandaloneHint.mockReturnValue(true)
  const errors: unknown[] = []
  let root!: ReturnType<typeof hydrateRoot>
  await act(async () => { root = hydrateRoot(container, <Surface />, { onRecoverableError: error => errors.push(error) }) })
  expect(container.querySelector('button')?.textContent).toBe('返回')
  expect(errors).toEqual([])
  act(() => root.unmount())
})
