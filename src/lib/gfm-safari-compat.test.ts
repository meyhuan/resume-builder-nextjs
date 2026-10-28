import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { beforeAll, describe, expect, it } from 'vitest'

const fromGfm = createRequire(createRequire(import.meta.url).resolve('remark-gfm'))
const fromMdastGfm = createRequire(fromGfm.resolve('mdast-util-gfm'))
const autolinkEntry = fromMdastGfm.resolve('mdast-util-gfm-autolink-literal')

interface TestNode {
  type: string
  value?: string
  url?: string
  children?: TestNode[]
}

let transform: (tree: TestNode) => void
beforeAll(async () => {
  const module = await import(pathToFileURL(autolinkEntry).href)
  transform = module.gfmAutolinkLiteralFromMarkdown().transforms[0]
})

function textOf(node: TestNode): string {
  return node.value ?? node.children?.map(textOf).join('') ?? ''
}

describe('GFM compatibility with iOS 15', () => {
  it('does not ship unsupported regular-expression lookbehind in the autolink module', () => {
    const source = readFileSync(join(dirname(autolinkEntry), 'lib/index.js'), 'utf8')
    expect(source).not.toContain('(?<=')
    expect(source).not.toContain('(?<!')
  })

  it.each<[string, string[]]>([
    ['hello@example.com', ['hello@example.com']],
    ['邮箱：hello@example.com，', ['hello@example.com']],
    ['$hello@example.com', ['hello@example.com']],
    ['+hello@example.com', ['+hello@example.com']],
    ['中abc+hello@example.com', ['hello@example.com']],
    ['hello@example.com test@example.org', ['hello@example.com', 'test@example.org']],
    ['hello@example.com+test@example.org', ['hello@example.com', 'test@example.org']],
    ['hello@example.com/test@example.org', ['hello@example.com']],
    ['/hello@example.com', []],
    ['中hello@example.com', []],
    ['éhello@example.com', []],
    ['hello@example.123', []],
    ['hello@example.com.', ['hello@example.com']],
  ])('preserves email boundaries and surrounding text: %s', (input, emails) => {
    const tree: TestNode = { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', value: input }] }] }
    transform(tree)
    const links = tree.children![0].children!.filter(node => node.type === 'link').map(node => node.url)
    expect(links).toEqual(emails.map(email => `mailto:${email}`))
    expect(textOf(tree)).toBe(input)
  })

  it('does not hang on surrogate pairs or rescan long plain tokens quadratically', () => {
    // Use a subprocess so an accidental surrogate-pair retry loop can be terminated.
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      const module = await import(${JSON.stringify(pathToFileURL(autolinkEntry).href)});
      const transform = module.gfmAutolinkLiteralFromMarkdown().transforms[0];
      for (const [value, expected] of [
        ['🙂hello@example.com', []],
        ['🙂 hello@example.com', ['mailto:hello@example.com']],
        ['🙂+hello@example.com', ['mailto:hello@example.com']],
      ]) {
        const tree = {type: 'root', children: [{type: 'paragraph', children: [{type: 'text', value}]}]};
        transform(tree);
        assert.deepEqual(tree.children[0].children.filter(node => node.type === 'link').map(node => node.url), expected);
      }
      const tree = {type: 'root', children: [{type: 'paragraph', children: [{type: 'text', value: 'a'.repeat(100000)}]}]};
      const started = performance.now();
      transform(tree);
      assert.ok(performance.now() - started < 500, 'Long non-email text must not cause quadratic rescanning');
    `], { timeout: 5000, encoding: 'utf8' })
    expect(result.error, result.stderr).toBeUndefined()
    expect(result.status, result.stderr).toBe(0)
  })

  it('still renders GFM links, tables and strikethrough', () => {
    const html = renderToStaticMarkup(createElement(Markdown, {
      remarkPlugins: [remarkGfm],
      children: '邮箱：hello@example.com，另一个 test@example.org。\n\n| 项目 | 状态 |\n| --- | --- |\n| 简历 | ~~旧版~~ |',
    }))
    expect(html).toContain('href="mailto:hello@example.com"')
    expect(html).toContain('href="mailto:test@example.org"')
    expect(html).toContain('<table>')
    expect(html).toContain('<del>旧版</del>')
  })
})
