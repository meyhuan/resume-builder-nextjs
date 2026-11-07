// Local UI integration test. Every business API is intercepted; no account,
// quota, resume, storage service or deployment is changed by this script.
import puppeteer from 'puppeteer'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'

const base = process.env.EXPORT_E2E_BASE_URL || 'http://localhost:3127'
const quotaOnly = process.env.EXPORT_E2E_QUOTA_ONLY === '1'
assert.ok(new URL(base).hostname === 'localhost' || new URL(base).hostname === '127.0.0.1', 'Local server required')
const out = path.resolve('test-artifacts/export-formats')
await fs.mkdir(out, { recursive: true })
// Generate real Word fixtures with scripts/docx-preview.test.ts first.
for (const fixture of ['canva-minimal.docx', 'canva-minimal-1.jpg']) {
  await fs.access('test-artifacts/word-preview/' + fixture).catch(() => {
    throw new Error('Missing Word fixture. Set LIBREOFFICE_PATH and run: pnpm exec vitest run --config scripts/vitest.docx.config.ts scripts/docx-preview.test.ts')
  })
}
const wordBytes = await fs.readFile('test-artifacts/word-preview/canva-minimal.docx')
const wordPage = await fs.readFile('test-artifacts/word-preview/canva-minimal-1.jpg')
const browser = await puppeteer.launch({ headless: true, args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'], executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const fixturePage = await browser.newPage()
await fixturePage.setContent('<h1>林知夏 · 产品经理</h1><h2>工作经历</h2><p>负责产品需求分析与迭代交付。</p>')
const pdfBytes = Buffer.from(await fixturePage.pdf({ format: 'A4' }))
const pngBytes = Buffer.from(await fixturePage.screenshot())
await fixturePage.close()
const markdown = '# 林知夏\n\n## 工作经历\n负责产品需求分析与迭代交付。'
const jobs = new Map()
const resume = { id: 'local-fixture', name: '本地验证简历', baseInfo: { name: '林知夏', title: '产品经理', email: 'test@example.com' }, sections: [{ id: 'work', title: '工作经历', columns: 1, blocks: [{ id: 'text', type: 'text', html: '<p>负责产品需求分析与迭代交付。</p>' }] }] }
const requests = []
const errors = []
const diagnostics = []
const click = async (page, text) => {
  await page.waitForFunction(text => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === text && b.getBoundingClientRect().width > 0 && !b.disabled && Object.keys(b).some(k => k.startsWith('__reactProps'))), {}, text)
  await page.evaluate(text => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === text && b.getBoundingClientRect().width > 0).click(), text)
}
const select = async (page, format) => {
  await page.waitForFunction(format => [...document.querySelectorAll('[aria-label="导出格式"] button')].some(b => b.textContent.trim().startsWith(format) && !b.disabled), {}, format)
  await page.evaluate(format => [...document.querySelectorAll('[aria-label="导出格式"] button')].find(b => b.textContent.trim().startsWith(format)).click(), format)
}
async function checkMobilePreviewSpace(page) {
  const layout = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]').getBoundingClientRect()
    const preview = document.querySelector('[aria-label="导出预览"]').getBoundingClientRect()
    const formats = [...document.querySelectorAll('[aria-label="导出格式"] button')].map(b => b.getBoundingClientRect())
    const confirm = [...document.querySelectorAll('[role="dialog"] button')].find(b => b.textContent.trim().startsWith('确认导出 ')).getBoundingClientRect()
    return { screenHeight: innerHeight, dialogTop: dialog.top, dialogHeight: dialog.height, previewHeight: preview.height, sameRow: formats.every(r => r.top === formats[0].top), fits: formats.every(r => r.left >= 0 && r.right <= innerWidth), formatsBelowPreview: formats[0].top >= preview.bottom, formatsAboveConfirm: formats[0].bottom <= confirm.top, confirmVisible: confirm.bottom <= innerHeight }
  })
  assert.equal(layout.dialogTop, 0)
  assert.equal(layout.dialogHeight, layout.screenHeight)
  assert.ok(layout.sameRow && layout.fits, 'All four formats must fit in one row')
  assert.ok(layout.formatsBelowPreview && layout.formatsAboveConfirm && layout.confirmVisible, 'Format controls must stay below the preview and above the visible confirmation button')
  assert.ok(layout.previewHeight >= layout.screenHeight * 0.5, 'Preview must occupy at least half the available screen')
  return layout
}
async function makePage(mobile = false, failPdf = true, entitlement = { isVip: true, remaining: 'unlimited' }) {
  const page = await browser.newPage()
  await page.bringToFront()
  page.setDefaultTimeout(60_000)
  await page.setViewport(mobile ? { width: 390, height: 844, deviceScaleFactor: 1 } : { width: 1440, height: 960, deviceScaleFactor: 1 })
  page.on('pageerror', e => errors.push(e.stack || e.message))
  // The fixture editor has unsaved sample data; allow intentional fixture navigation.
  page.on('dialog', dialog => dialog.accept())
  page.on('console', m => { if (['error', 'warn'].includes(m.type())) diagnostics.push(m.text()) })
  page.on('requestfailed', r => diagnostics.push(`${r.url()} ${r.failure()?.errorText}`))
  await page.evaluateOnNewDocument(({ mobile, isVip }) => {
    window.__downloadClicks = 0
    const clickAnchor = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function () {
      if (this.download) window.__downloadClicks += 1
      return clickAnchor.call(this)
    }
    const originalFetch = window.fetch.bind(window)
    window.fetch = async (...args) => {
      const response = await originalFetch(...args)
      if (!String(args[0]).endsWith('/next-api/exports/mini')) return response
      const payload = JSON.parse(args[1]?.body || '{}')
      if (payload.type !== 'docx' || !response.ok) return response
      const job = await response.json()
      const encoder = new TextEncoder()
      return new Response(new ReadableStream({ start(controller) {
        const send = value => controller.enqueue(encoder.encode(JSON.stringify(value)+'\n'))
        send({event:'progress',stage:'converting'})
        setTimeout(() => send({event:'progress',stage:'rendering'}), 2000)
        setTimeout(() => {send({event:'result',status:200,data:job});controller.close()}, 2500)
      }}), {headers:{'Content-Type':'application/x-ndjson'}})
    }
    document.cookie = 'auth_uid=local-only; path=/'
    localStorage.setItem('token', 'local-only')
    localStorage.setItem('auth-storage', JSON.stringify({ state: { token: 'local-only', userInfo: { id: 'local', name: '本地验证', vip: { isVip } } }, version: 0 }))
    if (mobile) {
      window.__wxjs_environment = 'miniprogram'
      window.__nativeRoutes = []
      window.wx = { miniProgram: { navigateTo: ({ url }) => window.__nativeRoutes.push(url), getEnv: cb => cb({ miniprogram: true }) } }
    }
  }, { mobile, isVip: entitlement.isVip })
  await page.setRequestInterception(true)
  page.on('request', request => {
    const url = new URL(request.url())
    if (!['http:', 'https:'].includes(url.protocol)) { void request.continue(); return }
    if (url.origin !== base) {
      // Resolve beforeInteractive analytics scripts locally so Next can hydrate.
      if (request.resourceType() === 'script' || url.pathname.endsWith('.js')) void request.respond({ status: 200, contentType: 'application/javascript', body: '' })
      else void request.abort()
      return
    }
    if (url.pathname.startsWith('/next-api/') || url.pathname.startsWith('/api/')) {
      requests.push({ path: url.pathname, method: request.method(), body: request.postData() })
      const json = data => request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(data) })
      if (url.pathname === '/next-api/generate-pdf') {
        if (!failPdf) { void request.respond({ status: 200, contentType: 'application/pdf', body: pdfBytes }); return }
        // Deliberately fail PDF: other formats must remain usable.
        void request.respond({ status: 503, contentType: 'application/json', body: JSON.stringify({ details: '本地验证：PDF 暂不可用' }) }); return
      }
      if (url.pathname === '/next-api/quota') { void json(Object.fromEntries(['aiGenerateResume', 'aiImportSection', 'aiGenerateSection', 'aiPolishSection', 'aiEditorAssist', 'pdfExport'].map(k => [k, { ...entitlement, allowed: entitlement.isVip || entitlement.remaining !== 0 }]))); return }
      if (url.pathname === '/next-api/vip/poll') { void json({ data: { isVip: entitlement.isVip, vipStatus: entitlement.isVip ? 1 : 0, userId: 1 } }); return }
      if (url.pathname === '/next-api/consume-pdf-quota') {
        if (entitlement.denyConsume || (!entitlement.isVip && entitlement.remaining === 0)) {
          void request.respond({ status: 429, contentType: 'application/json', body: JSON.stringify({ quotaExceeded: true, error: '免费导出次数已用完' }) }); return
        }
        if (!entitlement.isVip) entitlement.remaining -= 1
        void json({ success: true, remaining: entitlement.remaining }); return
      }
      if (url.pathname === '/next-api/exports/mini') {
        const body = JSON.parse(request.postData())
        assert.equal(body.mode, 'preview')
        const id = body.type + '-' + jobs.size
        const job = { id, type: body.type, fileName: '本地预览简历', confirmed: false, downloadUrl: '/next-api/export-file/' + id, expiresAt: new Date(Date.now() + 3600000).toISOString(), isVip: entitlement.isVip, remaining: entitlement.remaining, previewImages: body.type === 'markdown' ? [] : ['/next-api/local-preview/' + body.type], markdownContent: body.type === 'markdown' ? markdown : undefined }
        jobs.set(id, job)
        void json(job); return
      }
      if (url.pathname.endsWith('/confirm')) {
        const id = url.pathname.split('/').at(-2)
        const job = jobs.get(id)
        assert.ok(job)
        if (!job.confirmed && job.type !== 'markdown' && !entitlement.isVip && entitlement.remaining === 0) {
          void request.respond({ status: 402, contentType: 'application/json', body: JSON.stringify({ error: '免费导出次数已用完', code: 'QUOTA_EXCEEDED' }) }); return
        }
        if (!job.confirmed && job.type !== 'markdown' && !entitlement.isVip) entitlement.remaining -= 1
        job.confirmed = true
        job.remaining = entitlement.remaining
        void json(job); return
      }
      if (url.pathname.startsWith('/next-api/local-preview/')) { void request.respond({ status: 200, contentType: 'image/jpeg', body: wordPage }); return }
      if (url.pathname.startsWith('/next-api/export-file/')) {
        const job = jobs.get(url.pathname.split('/').at(-1))
        assert.ok(job)
        if (!url.searchParams.has('inline')) assert.ok(job.confirmed, 'Must confirm before downloading')
        if (job.type === 'docx' && entitlement.failWordDownloadOnce) {
          entitlement.failWordDownloadOnce = false
          void request.respond({ status: 503, body: 'Local fixture: retry download' }); return
        }
        const contentType = { docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', pdf: 'application/pdf', image: 'image/png', markdown: 'text/markdown' }[job.type]
        const body = { docx: wordBytes, pdf: pdfBytes, image: pngBytes, markdown }[job.type]
        void request.respond({ status: 200, contentType, body }); return
      }
      if (url.pathname.startsWith('/next-api/resumes')) { void json({ id: 'local-fixture', content: resume, template: 'simple' }); return }
      void json({ success: true, data: [], items: [] }); return
    }
    if (url.pathname.startsWith('/resume-fonts/')) { void request.respond({ status: 404, body: '' }); return }
    void request.continue()
  })
  return page
}

try {
  let nativeRoute
  if (!quotaOnly) {
  const pc = await makePage()
  await pc.goto(base + '/editor?template=simple', { waitUntil: 'domcontentloaded', timeout: 180_000 })
  await pc.waitForSelector('header button[title="导出"]')
  await pc.waitForNetworkIdle({ idleTime: 1000 })
  await pc.waitForFunction(() => Object.keys(document.querySelector('header button[title="导出"]')).some(k => k.startsWith('__reactProps')))
  await pc.click('header button[title="导出"]')
  await pc.waitForSelector('[aria-label="导出格式"]')
  assert.equal(await pc.$$eval('[aria-label="导出格式"] button', els => els.length), 4)
  await pc.screenshot({ path: path.join(out, 'pc-formats.png') })
  await select(pc, 'Word')
  await pc.waitForFunction(() => [...document.querySelectorAll('[data-sonner-toast]')].some(el => el.textContent.includes('请返回模板列表，筛选')))
  assert.equal(await pc.$eval('[aria-label="导出格式"] button[aria-disabled="true"]', el => el.getAttribute('aria-pressed')), 'false')
  assert.ok(!requests.some(r => r.path === '/next-api/exports/mini' && JSON.parse(r.body).type === 'docx'))
  await pc.screenshot({ path: path.join(out, 'pc-word-unavailable.png') })
  await pc.goto(base + '/editor?template=canva-minimal', { waitUntil: 'domcontentloaded', timeout: 180_000 })
  await pc.waitForFunction(() => Object.keys(document.querySelector('header button[title="导出"]') || {}).some(k => k.startsWith('__reactProps')))
  await pc.click('header button[title="导出"]')
  await pc.waitForSelector('[aria-label="导出格式"]')
  await select(pc, 'Word')
  await pc.waitForFunction(() => document.body.innerText.includes('正在排版 Word 文档…'))
  await pc.screenshot({ path: path.join(out, 'pc-word-progress.png') })
  await pc.waitForFunction(() => { const img = document.querySelector('img[alt="Word 预览第 1 页"]'); return img?.complete && img.naturalWidth > 0 })
  assert.equal(requests.filter(r => r.path.endsWith('/confirm')).length, 0)
  await pc.screenshot({ path: path.join(out, 'pc-word-preview.png') })
  await click(pc, '确认下载 Word')
  await pc.waitForFunction(() => document.body.innerText.includes('Word 文件已生成'), { timeout: 90_000 })
  assert.ok(requests.some(r => r.path === '/next-api/exports/mini' && JSON.parse(r.body).type === 'docx'))
  await pc.screenshot({ path: path.join(out, 'pc-word-ready.png') })
  await select(pc, '图片')
  await pc.waitForFunction(() => { const img = document.querySelector('img[alt="实际 PNG 导出预览"]'); return img?.complete && img.naturalWidth > 0 })
  await pc.screenshot({ path: path.join(out, 'pc-image-preview.png') })
  await select(pc, 'Markdown')
  await pc.waitForSelector('[aria-label="导出预览"] pre')
  await pc.screenshot({ path: path.join(out, 'pc-markdown-preview.png') })
  await pc.close()

  const pdfPc = await makePage(false, false)
  await pdfPc.goto(base + '/editor?template=simple', { waitUntil: 'domcontentloaded', timeout: 180_000 })
  await pdfPc.waitForFunction(() => Object.keys(document.querySelector('header button[title="导出"]') || {}).some(k => k.startsWith('__reactProps')))
  await pdfPc.click('header button[title="导出"]')
  await pdfPc.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === '确认下载 PDF' && !b.disabled))
  assert.ok(await pdfPc.$('iframe[title="PDF 预览"]'))
  await pdfPc.screenshot({ path: path.join(out, 'pc-pdf-preview.png') })
  await pdfPc.close()

  const mobile = await makePage(true)
  await mobile.goto(base + '/m/preview?id=local-fixture&tpl=simple&miniVersion=2.0.1&miniDocx=1', { waitUntil: 'domcontentloaded', timeout: 180_000 })
  await click(mobile, '导出简历')
  await mobile.waitForSelector('[aria-label="导出格式"]')
  assert.ok(await mobile.$eval('[role="dialog"] h2', el => el.getBoundingClientRect().height <= 1), 'Native shell must not contain a second visible title bar')
  assert.equal(await mobile.$('button[aria-label="关闭导出预览"]'), null)
  assert.equal(await mobile.$('button[aria-label="返回简历"]'), null)
  assert.equal(await mobile.$$eval('[aria-label="导出格式"] button', els => els.length), 4)
  await mobile.screenshot({ path: path.join(out, 'mobile-formats.png') })
  await select(mobile, 'Word')
  await mobile.waitForFunction(() => [...document.querySelectorAll('[data-sonner-toast]')].some(el => el.textContent.includes('请返回模板列表，筛选')))
  await mobile.waitForFunction(() => {
    const toast = [...document.querySelectorAll('[data-sonner-toast]')].find(el => el.textContent.includes('请返回模板列表，筛选'))
    const formats = document.querySelector('[aria-label="导出格式"]')
    return toast && formats && getComputedStyle(toast).opacity === '1' && toast.getBoundingClientRect().top >= 0 && toast.getBoundingClientRect().bottom < formats.getBoundingClientRect().top
  })
  assert.equal(await mobile.$eval('[aria-label="导出格式"] button[aria-disabled="true"]', el => el.getAttribute('aria-pressed')), 'false')
  await mobile.screenshot({ path: path.join(out, 'mobile-word-unavailable.png') })
  await mobile.goBack()
  await mobile.waitForFunction(() => !document.querySelector('[role="dialog"]'))
  assert.ok(mobile.url().includes('/m/preview?'))
  assert.ok(!mobile.url().includes('exportPreview='))
  await mobile.goForward()
  await mobile.waitForSelector('[aria-label="导出格式"]')
  await mobile.goBack()
  await mobile.waitForFunction(() => !document.querySelector('[role="dialog"]'))
  await mobile.screenshot({ path: path.join(out, 'mobile-return-to-preview.png') })
  await mobile.goto(base + '/m/preview?id=local-fixture&tpl=canva-minimal&miniVersion=2.0.1&miniDocx=1', { waitUntil: 'domcontentloaded', timeout: 180_000 })
  await click(mobile, '导出简历')
  await mobile.waitForSelector('[aria-label="导出格式"]')
  await select(mobile, 'Word')
  await mobile.waitForFunction(() => document.body.innerText.includes('正在排版 Word 文档…'))
  await mobile.screenshot({ path: path.join(out, 'mobile-word-progress.png') })
  await mobile.waitForFunction(() => { const img = document.querySelector('img[alt="Word 预览第 1 页"]'); return img?.complete && img.naturalWidth > 0 })
  assert.equal(await mobile.evaluate(() => window.__nativeRoutes.length), 0)
  await mobile.screenshot({ path: path.join(out, 'mobile-word-preview.png') })
  const mobileLayouts = [await checkMobilePreviewSpace(mobile)]
  const confirmBeforeSwitch = requests.filter(r => r.path.endsWith('/confirm')).length
  for (const [label, alt] of [['PDF', 'PDF'], ['图片', 'PNG'], ['Markdown', null], ['Word', 'Word']]) {
    await select(mobile, label)
    if (alt) await mobile.waitForFunction(alt => { const img = document.querySelector(`img[alt="${alt} 预览第 1 页"]`); return img?.complete && img.naturalWidth > 0 }, {}, alt)
    else await mobile.waitForSelector('[aria-label="导出预览"] pre')
    await mobile.screenshot({ path: path.join(out, 'mobile-' + (alt || 'markdown').toLowerCase() + '-preview.png') })
    const visible = await mobile.evaluate(label => {
      const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '确认导出 ' + label)
      const rect = button.getBoundingClientRect()
      return rect.top >= 0 && rect.bottom <= innerHeight
    }, label)
    assert.ok(visible, 'Confirmation button must remain visible for ' + label)
  }
  assert.equal(requests.filter(r => r.path.endsWith('/confirm')).length, confirmBeforeSwitch)
  await mobile.goBack()
  await mobile.waitForFunction(() => !document.querySelector('[role="dialog"]'))
  assert.ok(mobile.url().includes('tpl=canva-minimal') && !mobile.url().includes('exportPreview='))
  await mobile.goForward()
  await mobile.waitForSelector('img[alt="Word 预览第 1 页"]')
  await mobile.setViewport({ width: 375, height: 667, deviceScaleFactor: 1 })
  await mobile.waitForFunction(() => {
    const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '确认导出 Word')
    return b && b.getBoundingClientRect().bottom <= innerHeight
  })
  await mobile.screenshot({ path: path.join(out, 'mobile-small-preview.png') })
  mobileLayouts.push(await checkMobilePreviewSpace(mobile))
  await mobile.setViewport({ width: 375, height: 560, deviceScaleFactor: 1 })
  mobileLayouts.push(await checkMobilePreviewSpace(mobile))
  await mobile.click('button[aria-label="放大预览"]')
  assert.ok(await mobile.$eval('[data-export-preview-pages]', el => el.scrollWidth > el.clientWidth), 'Zoom must allow horizontal scrolling within preview')
  assert.ok(await mobile.evaluate(() => document.querySelector('[role="dialog"]').scrollWidth <= innerWidth), 'Zoom must not widen the page')
  const zoomPosition = await mobile.$eval('button[aria-label="适应宽度"]', el => { const r = el.getBoundingClientRect(); return {x:r.x,y:r.y} })
  await mobile.$eval('[data-export-preview-pages]', el => { el.scrollTop = 200; el.scrollLeft = 150 })
  assert.deepEqual(await mobile.$eval('button[aria-label="适应宽度"]', el => { const r = el.getBoundingClientRect(); return {x:r.x,y:r.y} }), zoomPosition, 'Floating zoom control must stay visible while scrolling')
  await mobile.click('button[aria-label="适应宽度"]')
  await mobile.screenshot({ path: path.join(out, 'mobile-mini-viewport-preview.png') })
  await fs.writeFile(path.join(out, 'mobile-layout.json'), JSON.stringify(mobileLayouts, null, 2))
  await click(mobile, '确认导出 Word')
  await mobile.waitForFunction(() => window.__nativeRoutes.some(url => url.includes('type=docx')))
  nativeRoute = await mobile.evaluate(() => window.__nativeRoutes.at(-1))
  assert.match(nativeRoute, /templateId=canva-/)
  const lastSave = requests.filter(r => r.method === 'PUT' && r.path.includes('/resumes/')).at(-1)
  assert.match(JSON.parse(lastSave.body).template, /^canva-/)
  await mobile.goto(base + '/m/preview?id=local-fixture&tpl=canva-minimal&source=mini&miniVersion=2.0.1', { waitUntil: 'domcontentloaded' })
  await click(mobile, '导出简历')
  await mobile.waitForSelector('[aria-label="导出格式"]')
  await select(mobile, 'Word')
  await mobile.waitForFunction(() => document.body.innerText.includes('请更新小程序'))
  await mobile.screenshot({ path: path.join(out, 'mobile-legacy.png') })
  assert.equal(await mobile.evaluate(() => window.__nativeRoutes.length), 0)
  }
  console.log('Checking exhausted quota and restored membership in mobile preview')
  const depletedQuota = { isVip: false, remaining: 0 }
  const depleted = await makePage(true, false, depletedQuota)
  await depleted.goto(base + '/m/preview?id=local-fixture&tpl=canva-minimal&miniVersion=2.0.1&miniDocx=1', { waitUntil: 'domcontentloaded', timeout: 180_000 })
  await click(depleted, '导出简历')
  for (const label of ['PDF', 'Word', '图片']) {
    await select(depleted, label)
    await click(depleted, '开通会员，导出 ' + label)
    await depleted.waitForFunction(count => window.__nativeRoutes.length === count, {}, ['PDF', 'Word', '图片'].indexOf(label) + 1)
    assert.ok(await depleted.evaluate(() => window.__nativeRoutes.every(url => url === '/pages/payment/payment?from=export')))
    assert.equal(await depleted.$('[data-sonner-toast][data-type="error"]'), null, 'Quota exhaustion must not show an export error toast')
  }
  await select(depleted, 'PDF')
  await depleted.screenshot({ path: path.join(out, 'mobile-quota-depleted.png') })
  await select(depleted, 'Markdown')
  await click(depleted, '确认导出 Markdown')
  await depleted.waitForFunction(() => window.__nativeRoutes.some(url => url.includes('type=markdown')))
  await depleted.waitForNetworkIdle({ idleTime: 200 })
  // Simulate subscription completion; the cached preview must be confirmed
  // against current server entitlement, not rejected by its old quota snapshot.
  depletedQuota.isVip = true
  depletedQuota.remaining = 'unlimited'
  await depleted.evaluate(() => window.dispatchEvent(new Event('focus')))
  await select(depleted, 'Word')
  try {
    await click(depleted, '确认导出 Word')
  } catch (error) {
    console.log('Quota return state:', await depleted.evaluate(() => ({
      hidden: document.hidden,
      buttons: [...document.querySelectorAll('[role="dialog"] button')].map(b => ({ text: b.textContent.trim(), disabled: b.disabled, width: b.getBoundingClientRect().width })),
      images: [...document.images].map(img => ({ alt: img.alt, complete: img.complete, width: img.naturalWidth })),
    })))
    throw error
  }
  await depleted.waitForFunction(() => window.__nativeRoutes.some(url => url.includes('type=docx')))
  await depleted.close()

  console.log('Checking PC image quota consumption and stale-quota rejection')
  const pngQuota = { isVip: false, remaining: 1, denyConsume: false }
  const pngPc = await makePage(false, false, pngQuota)
  await pngPc.goto(base + '/editor?template=simple', { waitUntil: 'domcontentloaded', timeout: 180_000 })
  await pngPc.waitForFunction(() => Object.keys(document.querySelector('header button[title="导出"]') || {}).some(k => k.startsWith('__reactProps')))
  await pngPc.click('header button[title="导出"]')
  await select(pngPc, '图片')
  const consumeBefore = requests.filter(r => r.path === '/next-api/consume-pdf-quota').length
  await click(pngPc, '确认下载 图片')
  await pngPc.waitForFunction(() => window.__downloadClicks === 1)
  assert.equal(pngQuota.remaining, 0)
  assert.equal(requests.filter(r => r.path === '/next-api/consume-pdf-quota').length, consumeBefore + 1)
  await pngPc.waitForFunction(() => document.body.innerText.includes('开通会员，导出 图片'))
  await pngPc.screenshot({ path: path.join(out, 'pc-quota-depleted.png') })
  await pngPc.close()

  console.log('Checking retry after Word was confirmed but download failed')
  const wordQuota = { isVip: false, remaining: 1, failWordDownloadOnce: true }
  const retryPc = await makePage(false, false, wordQuota)
  await retryPc.goto(base + '/editor?template=canva-minimal', { waitUntil: 'domcontentloaded', timeout: 180_000 })
  await retryPc.waitForFunction(() => Object.keys(document.querySelector('header button[title="导出"]') || {}).some(k => k.startsWith('__reactProps')))
  await retryPc.click('header button[title="导出"]')
  await select(retryPc, 'Word')
  await click(retryPc, '确认下载 Word')
  await retryPc.waitForFunction(() => document.body.innerText.includes('Word 文件下载失败'))
  assert.equal(wordQuota.remaining, 0)
  assert.equal(await retryPc.evaluate(() => window.__downloadClicks), 0)
  await retryPc.waitForFunction(() => document.body.innerText.includes('该 Word 文件已确认，可再次下载'))
  await click(retryPc, '确认下载 Word')
  await retryPc.waitForFunction(() => window.__downloadClicks === 1)
  assert.equal(wordQuota.remaining, 0, 'Retrying an already confirmed Word file must not consume another allowance')
  await retryPc.close()

  const stalePc = await makePage(false, false, { isVip: false, remaining: 1, denyConsume: true })
  await stalePc.goto(base + '/editor?template=simple', { waitUntil: 'domcontentloaded', timeout: 180_000 })
  await stalePc.waitForFunction(() => Object.keys(document.querySelector('header button[title="导出"]') || {}).some(k => k.startsWith('__reactProps')))
  await stalePc.click('header button[title="导出"]')
  await select(stalePc, '图片')
  await click(stalePc, '确认下载 图片')
  await stalePc.waitForFunction(() => [...document.querySelectorAll('[role="dialog"]')].some(el => el.textContent.includes('升级会员无限次高清导出')))
  assert.equal(await stalePc.evaluate(() => window.__downloadClicks), 0, 'Stale client quota must not bypass server rejection')
  await stalePc.close()
  assert.deepEqual(errors, [])
  const quotaCases = ['Exhausted mobile PDF/Word/PNG route to membership without an error toast', 'Markdown remains free with zero quota', 'Restored membership updates the button and confirms the cached Word preview', 'PC PNG consumes one allowance before download', 'PC confirmed Word retries a failed download with zero remaining quota without charging again', 'PC stale quota is rejected before download']
  await fs.writeFile(path.join(out, quotaOnly ? 'quota-report.json' : 'report.json'), JSON.stringify({ passed: true, businessApisMocked: true, nativeRoute, errors, cases: [...(quotaOnly ? [] : ['PC four formats despite PDF failure', 'Unavailable Word only shows template-filter guidance without changing the selected format', 'Actual Word preview before same-file download', 'PC PNG and Markdown previews', 'Mobile all four previews without confirmation/charging on switch', 'Mobile same-file confirmation before native handoff', 'Legacy client update guidance']), ...quotaCases] }, null, 2))
  console.log('PASS: PC and mobile export journeys; screenshots in ' + out)
} catch (error) {
  console.error('Export UI verification failed:', error.message)
  for (const page of await browser.pages()) diagnostics.push(await page.evaluate(() => ({ ready: document.readyState, scripts: [...document.scripts].map(s => s.src || s.type), next: typeof window.next, react: Object.keys(document.querySelector('header button[title="导出"]') || {}) })))
  for (const [i, page] of (await browser.pages()).entries()) await page.screenshot({ path: path.join(out, 'failure-' + i + '.png') }).catch(() => {})
  await fs.writeFile(path.join(out, 'failure.json'), JSON.stringify({ error: error.message, errors, diagnostics, requests: requests.map(r => ({ path: r.path, method: r.method })) }, null, 2))
  throw error
} finally { await browser.close() }
