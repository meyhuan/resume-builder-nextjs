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
const markdown = '# 林知夏\n\n产品经理 | test@example.com\n\n## 求职意向\n意向岗位：产品经理 | 意向城市：北京\n\n## 教育经历\n### 某大学（2016.09 - 2020.06）\n**计算机科学与技术**\n\n主修课程：数据结构与算法、计算机网络、数据库系统、软件工程。\n\n## 工作经历\n### 产品科技公司（2022.07 - 至今）\n**产品经理**\n\n- 负责产品需求分析与迭代交付。\n- 结合用户反馈和数据分析制定迭代计划。\n- 协调设计、研发及测试，推进项目落地。\n\n## 项目经历\n### 用户增长分析平台\n负责需求访谈、指标梳理和方案设计，组织上线验收。\n\n- 梳理业务流程，明确优先级与验收标准。\n- 建立效果评估机制，持续跟踪使用反馈。\n\n## 专业技能\n- 产品设计、用户研究、数据分析。\n- 熟悉 SQL、Figma 和项目管理工具。'
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
const settledMembership = async page => {
  await page.waitForFunction(() => {
    const sheet = document.querySelector('[data-export-membership-sheet][data-state="open"]')
    return sheet && sheet.getAnimations().every(animation => animation.playState === 'finished')
  })
}
const closeMembership = async page => {
  await settledMembership(page)
  await page.tap('[aria-label="关闭会员弹窗"]')
}
async function checkMobilePreviewSpace(page) {
  const layout = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]').getBoundingClientRect()
    const preview = document.querySelector('[aria-label="导出预览"]').getBoundingClientRect()
    const formats = [...document.querySelectorAll('[aria-label="导出格式"] button')].map(b => b.getBoundingClientRect())
    const confirm = [...document.querySelectorAll('[role="dialog"] button')].find(b => /^(确认导出 |开通会员，导出 )/.test(b.textContent.trim())).getBoundingClientRect()
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
  await page.setViewport(mobile ? { width: 390, height: 844, deviceScaleFactor: 1, hasTouch: true, isMobile: true } : { width: 1440, height: 960, deviceScaleFactor: 1 })
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
    if (mobile) localStorage.removeItem('auth-storage') // SSO sets only the API cookie, not the PC profile.
    else localStorage.setItem('auth-storage', JSON.stringify({ state: { token: 'local-only', userInfo: { id: 'local', name: '本地验证', vip: { isVip } } }, version: 0 }))
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
      requests.push({ page, path: url.pathname, method: request.method(), body: request.postData() })
      const json = data => request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(data) })
      if (url.pathname === '/next-api/generate-pdf') {
        if (!failPdf) { void request.respond({ status: 200, contentType: 'application/pdf', body: pdfBytes }); return }
        // Deliberately fail PDF: other formats must remain usable.
        void request.respond({ status: 503, contentType: 'application/json', body: JSON.stringify({ details: '本地验证：PDF 暂不可用' }) }); return
      }
      if (url.pathname === '/next-api/quota') { void json(Object.fromEntries(['aiGenerateResume', 'aiImportSection', 'aiGenerateSection', 'aiPolishSection', 'aiEditorAssist', 'pdfExport'].map(k => [k, { ...entitlement, allowed: entitlement.isVip || entitlement.remaining !== 0 }]))); return }
      if (url.pathname === '/next-api/vip/poll') { void json({ data: { isVip: entitlement.isVip, vipStatus: entitlement.isVip ? 1 : 0, userId: 1 } }); return }
      if (url.pathname === '/next-api/vip/info') { void json({ data: { isVip: entitlement.isVip, userId: 1, plans: [
        { id: 3, vipType: 3, vipName: '终身会员', price: 99.9, duration: 30000, sort: 3 },
        { id: 2, vipType: 2, vipName: '年会员', price: 59.9, duration: 365, sort: 2 },
        { id: 1, vipType: 1, vipName: '月会员', price: 29.9, duration: 30, sort: 1 },
      ] } }); return }
      if (url.pathname === '/next-api/vip/mini-plans') { void json({ data: { plans: [
        { vipType: 3, vipName: '终身会员(永久)', price: 69.9, duration: 30000, lifetime: true, sort: 3 },
        { vipType: 2, vipName: '1 年会员', price: 39.9, duration: 365, sort: 2 },
        { vipType: 1, vipName: '1 个月会员', price: 19.9, duration: 30, sort: 1 },
      ] } }); return }
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
        if (entitlement.previewGate) void entitlement.previewGate.then(() => json(job))
        else void json(job)
        return
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
  await pc.waitForSelector('[aria-label="Markdown 预览"] h1')
  await pc.screenshot({ path: path.join(out, 'pc-markdown-preview.png') })
  await pc.click('[role="tab"][data-state="inactive"]')
  await pc.waitForSelector('[aria-label="Markdown 源码"] pre')
  await pc.screenshot({ path: path.join(out, 'pc-markdown-source.png') })
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
    else await mobile.waitForSelector('[aria-label="Markdown 预览"] h1')
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
  await mobile.setViewport({ width: 375, height: 667, deviceScaleFactor: 1, hasTouch: true, isMobile: true })
  await mobile.waitForFunction(() => {
    const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '确认导出 Word')
    return b && b.getBoundingClientRect().bottom <= innerHeight
  })
  await mobile.screenshot({ path: path.join(out, 'mobile-small-preview.png') })
  mobileLayouts.push(await checkMobilePreviewSpace(mobile))
  await mobile.setViewport({ width: 375, height: 560, deviceScaleFactor: 1, hasTouch: true, isMobile: true })
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
  let releasePreview
  depletedQuota.previewGate = new Promise(resolve => { releasePreview = resolve })
  const depleted = await makePage(true, false, depletedQuota)
  await depleted.goto(base + '/m/preview?id=local-fixture&tpl=canva-minimal&miniVersion=2.0.1&miniDocx=1', { waitUntil: 'domcontentloaded', timeout: 180_000 })
  await click(depleted, '导出简历')
  await depleted.waitForSelector('[data-export-waiting]')
  await depleted.waitForFunction(() => {
    const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '开通会员，导出 PDF')
    return button && !button.disabled && document.querySelector('[aria-label="求职小提示"] h3')
  })
  assert.equal(await depleted.$('img[alt="PDF 预览第 1 页"]'), null, 'Membership must be usable before the preview response arrives')
  await depleted.waitForSelector('[aria-label="暂停自动轮播"]')
  const initialTip = await depleted.$eval('[aria-label="求职小提示"]', el => el.dataset.tipId)
  await depleted.waitForFunction(first => document.querySelector('[aria-label="求职小提示"]')?.dataset.tipId !== first, { timeout: 15_000 }, initialTip)
  await depleted.screenshot({ path: path.join(out, 'mobile-preview-waiting.png') })
  const progressTop = await depleted.$eval('[data-export-progress]', el => el.getBoundingClientRect().top)
  const firstTip = await depleted.$eval('[aria-label="求职小提示"]', el => el.dataset.tipId)
  const touchPoint = await depleted.$eval('[aria-label="求职小提示"]', el => { const r = el.getBoundingClientRect(); return { x: r.right - 35, y: r.top + r.height / 2 } })
  const touchSession = await depleted.createCDPSession()
  await touchSession.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touchPoint] })
  for (let dx = 30; dx <= 180; dx += 30) await touchSession.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touchPoint.x - dx, y: touchPoint.y }] })
  await touchSession.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await depleted.waitForFunction(first => document.querySelector('[aria-label="求职小提示"]')?.dataset.tipId !== first, {}, firstTip)
  assert.equal(await depleted.$eval('[data-export-progress]', el => el.getBoundingClientRect().top), progressTop, 'Swiping tips must keep progress fixed')
  await touchSession.detach()
  const confirmBeforePaywall = requests.filter(r => r.path.endsWith('/confirm')).length
  let openingPlansMs
  for (const label of ['PDF', 'Word', '图片']) {
    await select(depleted, label)
    const openedAt = performance.now()
    await click(depleted, '开通会员，导出 ' + label)
    await depleted.waitForSelector('[data-export-membership-sheet]')
    await depleted.waitForSelector('[aria-label="会员套餐"] button')
    if (label === 'PDF') openingPlansMs = Math.round(performance.now() - openedAt)
    assert.equal(requests.filter(r => r.path.endsWith('/confirm')).length, confirmBeforePaywall, 'Known exhausted quota must open plans without a rejected export request')
    await settledMembership(depleted)
    assert.equal(await depleted.evaluate(() => window.__nativeRoutes.length), 0, 'Opening plans must not navigate out of the preview')
    const bounds = await depleted.$eval('[data-export-membership-sheet]', el => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: innerHeight } })
    assert.ok(bounds.top > bounds.height * 0.3 && bounds.bottom === bounds.height, 'Paywall must remain a bottom sheet with preview visible above')
    if (label === 'PDF') {
      assert.equal(await depleted.$eval('[data-export-membership-sheet]', el => getComputedStyle(el).animationDuration), '0.3s')
      await depleted.$eval('[data-export-membership-sheet]', el => el.addEventListener('animationstart', () => {
        if (el.dataset.state === 'closed') window.__membershipExitDuration = getComputedStyle(el).animationDuration
      }))
      assert.match(await depleted.$eval('[aria-label="会员套餐"] button', b => b.textContent), /推荐开通.*终身会员/)
      assert.deepEqual(await depleted.$$eval('[aria-label="会员套餐"] button', buttons => buttons.map(b => b.textContent.match(/终身会员|1 年会员|1 个月会员/)[0])), ['终身会员', '1 年会员', '1 个月会员'])
      assert.equal(await depleted.$eval('[aria-label="会员套餐"] button', b => b.getAttribute('aria-pressed')), 'true')
      await depleted.screenshot({ path: path.join(out, 'mobile-membership-sheet.png') })
    }
    if (label === 'Word') await depleted.goBack()
    else if (label === '图片') await depleted.touchscreen.tap(20, Math.max(20, bounds.top - 30))
    else await closeMembership(depleted)
    if (label === 'PDF') {
      await depleted.waitForFunction(() => window.__membershipExitDuration)
      assert.equal(await depleted.evaluate(() => window.__membershipExitDuration), '0.24s')
    }
    await depleted.waitForFunction(() => !document.querySelector('[data-export-membership-sheet]') && !history.state?.exportMembershipSheet)
    assert.ok(new URL(depleted.url()).searchParams.get('exportPreview') === '1', 'Closing membership must keep the export preview open')
    await depleted.waitForSelector('[aria-label="导出格式"]', { visible: true })
    assert.ok(await depleted.$eval('[aria-label="导出格式"] button[aria-pressed="true"]', (b, expected) => b.textContent.trim().startsWith(expected), label), 'Closing membership must preserve the selected format')
    assert.equal(await depleted.$('[data-sonner-toast][data-type="error"]'), null, 'Quota exhaustion must not show an export error toast')
    if (label === 'PDF') {
      await depleted.waitForSelector('[data-export-retention]')
      await checkMobilePreviewSpace(depleted)
      await depleted.screenshot({ path: path.join(out, 'mobile-retention.png') })
      await depleted.setViewport({ width: 375, height: 560, deviceScaleFactor: 1, hasTouch: true, isMobile: true })
      for (let i = 0; i < 5; i++) {
        const fits = await depleted.evaluate(() => {
          const tips = document.querySelector('[aria-label="求职小提示"]')
          const preview = document.querySelector('[aria-label="导出预览"]')
          const progress = document.querySelector('[data-export-progress]').getBoundingClientRect()
          const description = tips.querySelector('h3 + p').getBoundingClientRect()
          const button = tips.querySelector('button').getBoundingClientRect()
          return description.bottom <= button.top && tips.scrollHeight <= tips.clientHeight + 1 && preview.scrollHeight <= preview.clientHeight + 1 && progress.top >= 0
        })
        assert.ok(fits, 'Tips, progress and controls must fit without vertical scrolling on a short screen with retention')
        if (i < 4) await depleted.click('[aria-label="下一条求职提示"]')
      }
      await depleted.screenshot({ path: path.join(out, 'mobile-waiting-tips-small.png') })
      await depleted.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, hasTouch: true, isMobile: true })
      releasePreview()
      delete depletedQuota.previewGate
      await depleted.waitForSelector('img[alt="PDF 预览第 1 页"]')
      assert.equal(await depleted.$('[data-export-waiting]'), null, 'Real preview must replace the waiting tips')
      await click(depleted, '查看月会员')
      await depleted.waitForSelector('[aria-label="会员套餐"] button[aria-pressed="true"]')
      await depleted.waitForFunction(() => document.querySelector('[aria-label="会员套餐"] button[aria-pressed="true"]')?.textContent.includes('1 个月会员'))
      assert.match(await depleted.$eval('[aria-label="会员套餐"] button', b => b.textContent), /终身会员/, 'Retention must not reorder plans')
      assert.equal(await depleted.evaluate(() => window.__nativeRoutes.length), 0, 'Retention must not invoke payment')
      await depleted.evaluate(() => [...document.querySelectorAll('[aria-label="会员套餐"] button')].find(b => b.textContent.includes('终身会员')).click())
      await closeMembership(depleted)
      await depleted.waitForFunction(() => !document.querySelector('[data-export-membership-sheet]') && !history.state?.exportMembershipSheet)
      assert.equal(await depleted.$('[data-export-retention]'), null, 'Retention is shown only once')
      await click(depleted, '开通会员，导出 PDF')
      await depleted.waitForFunction(() => document.querySelector('[aria-label="会员套餐"] button[aria-pressed="true"]')?.textContent.includes('终身会员'))
      await closeMembership(depleted)
      await depleted.waitForFunction(() => !document.querySelector('[data-export-membership-sheet]') && !history.state?.exportMembershipSheet)
    }

  }
  assert.equal(requests.filter(r => r.page === depleted && r.path === '/next-api/vip/mini-plans').length, 1, 'Prefetch and repeated open in the same page must reuse the fresh catalogue')
  await fs.writeFile(path.join(out, 'mobile-membership-performance.json'), JSON.stringify({ businessApisMocked: true, openingPlansMs, openAnimationMs: 300, closeAnimationMs: 240, catalogueRequests: 1, rejectedExportRequestsBeforePaywall: 0 }, null, 2))
  await select(depleted, 'PDF')
  await depleted.screenshot({ path: path.join(out, 'mobile-quota-depleted.png') })
  await click(depleted, '开通会员，导出 PDF')
  await depleted.waitForSelector('[aria-label="会员套餐"] button')
  await depleted.evaluate(() => [...document.querySelectorAll('[aria-label="会员套餐"] button')].find(b => b.textContent.includes('1 个月')).click())
  await click(depleted, '确认开通 · ¥19.9')
  await depleted.waitForFunction(() => window.__nativeRoutes.length === 1)
  assert.match(await depleted.evaluate(() => window.__nativeRoutes[0]), /from=export&checkout=1&vipType=1&price=19.9/)
  await depleted.evaluate(() => window.dispatchEvent(new Event('focus')))
  await depleted.waitForFunction(() => !document.querySelector('[data-export-membership-sheet]') && !history.state?.exportMembershipSheet)
  await select(depleted, 'Markdown')
  await depleted.waitForSelector('[aria-label="Markdown 预览"] h1')
  const markdownTabsTop = await depleted.$eval('[aria-label="Markdown 查看方式"]', el => el.getBoundingClientRect().top)
  await depleted.$eval('[aria-label="Markdown 预览"]', el => { el.scrollTop = el.scrollHeight })
  assert.equal(await depleted.$eval('[aria-label="Markdown 查看方式"]', el => el.getBoundingClientRect().top), markdownTabsTop, 'Scrolling Markdown keeps the preview/source switch visible')
  await depleted.$eval('[aria-label="Markdown 预览"]', el => { el.scrollTop = 0 })
  await depleted.screenshot({ path: path.join(out, 'mobile-markdown-preview.png') })
  await depleted.click('[role="tab"][data-state="inactive"]')
  await depleted.waitForSelector('[aria-label="Markdown 源码"] pre')
  assert.equal(await depleted.$eval('[aria-label="Markdown 源码"] pre', el => el.textContent), markdown)
  await depleted.screenshot({ path: path.join(out, 'mobile-markdown-source.png') })
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

  console.log('Checking PC lifetime recommendation and one-time monthly retention')
  const retentionPc = await makePage(false, false, { isVip: false, remaining: 0 })
  await retentionPc.goto(base + '/editor?template=simple', { waitUntil: 'domcontentloaded', timeout: 180_000 })
  await retentionPc.waitForFunction(() => Object.keys(document.querySelector('header button[title="导出"]') || {}).some(k => k.startsWith('__reactProps')))
  await retentionPc.click('header button[title="导出"]')
  await click(retentionPc, '开通会员，导出 PDF')
  await retentionPc.waitForFunction(() => document.body.innerText.includes('推荐开通'))
  assert.equal(await retentionPc.$$eval('[data-vip-upgrade-dialog]', els => els.length), 1, 'Only the export owner may show its paywall')
  assert.equal(await retentionPc.$eval('[role="button"][aria-label="终身会员"]', el => el.getAttribute('aria-pressed')), 'true')
  assert.deepEqual(await retentionPc.$$eval('[data-vip-upgrade-dialog] [role="button"][aria-pressed]', els => els.map(el => el.getAttribute('aria-label'))), ['终身会员', '年会员', '月会员'])
  await retentionPc.screenshot({ path: path.join(out, 'pc-membership-sheet.png') })
  await retentionPc.click('[role="button"][aria-label="年会员"]')
  await retentionPc.keyboard.press('Escape')
  await retentionPc.waitForSelector('[data-export-retention]')
  assert.match(await retentionPc.$eval('[data-export-retention]', el => el.textContent), /29.9/)
  await retentionPc.screenshot({ path: path.join(out, 'pc-retention.png') })
  await click(retentionPc, '查看月会员')
  await retentionPc.waitForSelector('[role="button"][aria-label="月会员"][aria-pressed="true"]')
  assert.deepEqual(await retentionPc.$$eval('[data-vip-upgrade-dialog] [role="button"][aria-pressed]', els => els.map(el => el.getAttribute('aria-label'))), ['终身会员', '年会员', '月会员'])
  await retentionPc.click('[role="button"][aria-label="年会员"]')
  await retentionPc.keyboard.press('Escape')
  await retentionPc.waitForFunction(() => !document.body.innerText.includes('推荐开通'))
  await click(retentionPc, '开通会员，导出 PDF')
  await retentionPc.waitForSelector('[role="button"][aria-label="年会员"][aria-pressed="true"]')
  await retentionPc.waitForFunction(() => document.body.innerText.includes('推荐开通'))
  await retentionPc.keyboard.press('Escape')
  await retentionPc.waitForFunction(() => !document.body.innerText.includes('推荐开通'))
  assert.equal(await retentionPc.$('[data-export-retention]'), null)
  await retentionPc.close()

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
  const quotaCases = ['Exhausted mobile PDF/Word/PNG opens a bottom membership sheet without native navigation', 'Closing or back dismisses only membership and preserves export preview', 'Only explicit plan confirmation hands off selected plan and price to native checkout', 'Returning from checkout refreshes entitlement', 'Markdown remains free with zero quota', 'Restored membership updates the button and confirms the cached Word preview', 'PC PNG consumes one allowance before download', 'PC confirmed Word retries a failed download with zero remaining quota without charging again', 'PC stale quota is rejected before download', 'PC and mini export paywalls recommend lifetime first, followed by annual and monthly, with independent prices', 'Dismiss shows one inline retention card without obscuring format controls', 'Retention CTA only reopens monthly selection without invoking payment', 'Manual plan choice persists within the same preview', 'Repeated dismiss does not show retention again']
  await fs.writeFile(path.join(out, quotaOnly ? 'quota-report.json' : 'report.json'), JSON.stringify({ passed: true, businessApisMocked: true, nativeRoute, errors, cases: [...(quotaOnly ? [] : ['PC four formats despite PDF failure', 'Unavailable Word only shows template-filter guidance without changing the selected format', 'Actual Word preview before same-file download', 'PC PNG and Markdown previews', 'Mobile all four previews without confirmation/charging on switch', 'Mobile same-file confirmation before native handoff', 'Legacy client update guidance']), ...quotaCases] }, null, 2))
  console.log('PASS: PC and mobile export journeys; screenshots in ' + out)
} catch (error) {
  console.error('Export UI verification failed:', error.message)
  for (const page of await browser.pages()) diagnostics.push(await page.evaluate(() => ({ ready: document.readyState, scripts: [...document.scripts].map(s => s.src || s.type), next: typeof window.next, react: Object.keys(document.querySelector('header button[title="导出"]') || {}) })))
  for (const [i, page] of (await browser.pages()).entries()) await page.screenshot({ path: path.join(out, 'failure-' + i + '.png') }).catch(() => {})
  await fs.writeFile(path.join(out, 'failure.json'), JSON.stringify({ error: error.message, errors, diagnostics, requests: requests.map(r => ({ path: r.path, method: r.method })) }, null, 2))
  throw error
} finally { await browser.close() }
