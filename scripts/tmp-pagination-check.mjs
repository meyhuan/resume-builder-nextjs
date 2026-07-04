/**
 * 临时脚本：验证 PDF 分页行为
 * 模拟 /print/[id] 的 CSS 环境 + simple 模板的 DOM 结构，
 * 对比三种情况下的分页结果（页数 + 手动检查生成的 PDF）：
 *  A) 现状：仅 h2/h3 break-after: avoid（块可拆分）
 *  B) 整块 break-inside: avoid（模拟"整块经历不许拆"）
 *  C) 现状 + 一条超长工作经历（多段）
 */
import puppeteer from 'puppeteer'
import { writeFileSync, mkdirSync } from 'node:fs'

const OUT_DIR = new URL('../tmp/', import.meta.url).pathname.replace(/^\//, '')

function paragraphs(n, label) {
  return Array.from({ length: n }, (_, i) =>
    `<p>${label} 第${i + 1}段：负责核心模块的设计与开发，推动项目按期交付，优化性能指标提升30%，与团队协作完成多项关键任务。</p>`
  ).join('')
}

function block(title, paraCount, cls = 'block') {
  return `
    <div class="${cls}">
      <h3>${title}</h3>
      <div class="content">${paragraphs(paraCount, title)}</div>
    </div>`
}

function buildHtml({ avoidInside }) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 22mm 0; }
  @page :first { margin-top: 0; }
  html, body { margin: 0; padding: 0; font-family: sans-serif; font-size: 15px; line-height: 1.5; }
  .page { width: 210mm; padding: 0 15mm; box-sizing: border-box; }
  main { display: flex; flex-direction: column; gap: 18px; }
  section { margin-bottom: 4px; padding: 4px; }
  h2 { border-bottom: 2px solid #333; padding-bottom: 4px; break-after: avoid; page-break-after: avoid; }
  h3 { margin: 8px 0 4px; break-after: avoid; page-break-after: avoid; }
  p { margin: 4px 0; orphans: 2; widows: 2; }
  .block { border-left: 3px solid #7c3aed; padding-left: 8px; margin-bottom: 12px; ${avoidInside ? 'break-inside: avoid; page-break-inside: avoid;' : ''} }
</style></head><body>
<div class="page">
  <main>
    <section>
      <h2>教育经历</h2>
      ${block('某大学 · 本科', 4)}
    </section>
    <section>
      <h2>工作经历</h2>
      ${block('公司A · 前端工程师', 6)}
      ${block('公司B · 高级工程师（多段长内容）', 26)}
      ${block('公司C · 技术专家', 6)}
    </section>
    <section>
      <h2>项目经历</h2>
      ${block('项目X', 5)}
    </section>
  </main>
</div>
</body></html>`
}

function countPages(pdfBuffer) {
  const text = pdfBuffer.toString('latin1')
  const matches = text.match(/\/Type\s*\/Page[^s]/g)
  return matches ? matches.length : -1
}

// Mirrors src/utils/paginate-html.ts getClientPaginationScript()
const SMART_PAGINATION_SCRIPT = `
  (function() {
    if (document.querySelector('[data-one-page="true"], [data-bleed="true"]')) return;
    const USABLE_HEIGHT = 1123 - 2 * 22 * 3.7795;
    const SHORT_BLOCK_MAX = USABLE_HEIGHT / 3;
    document.querySelectorAll('.block').forEach((el) => {
      const height = el.getBoundingClientRect().height;
      if (height > 0 && height <= SHORT_BLOCK_MAX) {
        el.style.breakInside = 'avoid';
        el.style.pageBreakInside = 'avoid';
      } else {
        el.style.breakInside = 'auto';
        el.style.pageBreakInside = 'auto';
      }
    });
  })();
`

const browser = await puppeteer.launch()
try {
  mkdirSync('tmp', { recursive: true })
  for (const [name, opts, smart] of [
    ['A-current-rules', { avoidInside: false }, false],
    ['B-avoid-inside', { avoidInside: true }, false],
    ['C-smart-pagination', { avoidInside: false }, true],
  ]) {
    const page = await browser.newPage()
    await page.setContent(buildHtml(opts), { waitUntil: 'load' })
    if (smart) await page.evaluate(SMART_PAGINATION_SCRIPT)
    const pdf = Buffer.from(await page.pdf({ printBackground: true, preferCSSPageSize: true }))
    const file = `tmp/pagination-${name}.pdf`
    writeFileSync(file, pdf)
    console.log(`[${name}] pages=${countPages(pdf)} bytes=${pdf.length} -> ${file}`)
    await page.close()
  }
} finally {
  await browser.close()
}
