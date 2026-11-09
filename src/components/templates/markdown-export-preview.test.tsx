import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MarkdownExportPreview } from '@/components/markdown-export-preview'

afterEach(cleanup)

it('renders Markdown by default and shows the unchanged source on request', () => {
  const content = '# 张明\n\n\n## 教育经历\n\n**计算机科学**\n\n- 完成项目\n\n| 技能 | 熟练度 |\n| --- | --- |\n| TypeScript | 熟练 |'
  const { container } = render(<MarkdownExportPreview content={content} />)
  expect(screen.getByRole('heading', { name: '张明', level: 1 })).toBeTruthy()
  expect(screen.getByRole('heading', { name: '教育经历', level: 2 })).toBeTruthy()
  expect(container.querySelector('strong')?.textContent).toBe('计算机科学')
  expect(screen.getByRole('listitem').textContent).toBe('完成项目')
  expect(screen.getByRole('table')).toBeTruthy()
  expect(container.querySelector('pre')).toBeNull()
  fireEvent.mouseDown(screen.getByRole('tab', { name: '源码' }), { button: 0, ctrlKey: false })
  expect(screen.getByRole('tabpanel', { name: '源码' }).querySelector('pre')?.textContent).toBe(content)
  fireEvent.mouseDown(screen.getByRole('tab', { name: '预览' }), { button: 0, ctrlKey: false })
  expect(screen.getByRole('heading', { name: '张明' })).toBeTruthy()
})

it('does not render raw HTML or unsafe link protocols from resume content', () => {
  const { container } = render(<MarkdownExportPreview content={'# 简历\n\n<script>alert(1)</script>\n\n[链接](javascript:alert%281%29)'} />)
  expect(container.querySelector('script')).toBeNull()
  expect(container.querySelector('a')?.getAttribute('href') || '').not.toMatch(/^javascript:/)
})
