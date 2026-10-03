import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { toPng } from 'html-to-image'
import { exportImage } from './export-image'
import { buildResumeHtml } from './html-export'

vi.mock('html-to-image', () => ({ toPng: vi.fn() }))
const png = 'data:image/png;base64,cG5n'

beforeEach(() => { vi.mocked(toPng).mockReset() })
afterEach(() => { document.body.innerHTML = '' })

function fixture(): HTMLDivElement {
  const root = document.createElement('div')
  root.innerHTML = '<section data-resume-edit-region="section" tabindex="0"><div data-resume-edit-region="block" data-resume-edit-state="active" tabindex="0"><span data-resume-edit-field="true" tabindex="0">江城大学</span><div data-export-hide="true"><button>删除条目</button></div></div></section>'
  document.body.appendChild(root)
  return root
}

it('suspends decoration during image capture and filters editor actions', async () => {
  const root = fixture()
  vi.mocked(toPng).mockImplementation(async (node, options) => {
    expect(node.getAttribute('data-resume-exporting')).toBe('true')
    expect(options?.filter?.(root.querySelector('[data-export-hide]')!)).toBe(false)
    expect(options?.filter?.(root.querySelector('span')!)).toBe(true)
    return png
  })
  expect(await exportImage({ current: root }, { returnBase64: true })).toBe(png)
  expect(root.hasAttribute('data-resume-exporting')).toBe(false)
})

it.each([null, 'previous'])('restores the prior decoration state after a failed capture (%s)', async (previous) => {
  const root = fixture()
  if (previous !== null) root.setAttribute('data-resume-exporting', previous)
  vi.mocked(toPng).mockRejectedValue(new Error('image failed'))
  await expect(exportImage({ current: root }, { returnBase64: true })).rejects.toThrow('image failed')
  expect(root.getAttribute('data-resume-exporting')).toBe(previous)
})

it('keeps decoration suspended until overlapping captures both finish', async () => {
  const root = fixture()
  const complete: Array<(value: string) => void> = []
  vi.mocked(toPng).mockImplementation(() => new Promise((resolve) => complete.push(resolve)))
  const first = exportImage({ current: root }, { returnBase64: true })
  const second = exportImage({ current: root }, { returnBase64: true })
  complete[0](png)
  await first
  expect(root.getAttribute('data-resume-exporting')).toBe('true')
  complete[1](png)
  await second
  expect(root.hasAttribute('data-resume-exporting')).toBe(false)
})

it('exports saved content without action controls, hover markers, or new focus stops', () => {
  const root = fixture()
  const html = buildResumeHtml(root)
  expect(html).toContain('江城大学')
  expect(html).not.toContain('删除条目')
  expect(html).not.toContain('data-resume-edit-')
  expect(html).not.toContain('tabindex=')
  expect(root.querySelector('[data-resume-edit-state="active"]')).not.toBeNull()
})
