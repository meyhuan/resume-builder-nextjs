import assert from 'node:assert/strict'
import fs from 'node:fs'
import puppeteer from 'puppeteer'

// Isolated local fixtures. This does not verify a real login or remote persistence.
const baseUrl = process.env.DISPLAY_TITLE_QA_URL || 'http://127.0.0.1:3013'
if (!['127.0.0.1', 'localhost'].includes(new URL(baseUrl).hostname)) throw new Error('Local fixture test only')
const output = 'test-artifacts/display-title'
fs.mkdirSync(output, { recursive: true })
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
const results = { runtimeErrors: [] }
const clickText = async (page, text) => {
  const button = await page.waitForFunction((label) => [...document.querySelectorAll('button')].find((node) => node.textContent.trim() === label), {}, text)
  await button.asElement().click()
}
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1600, height: 1400 })
  await page.goto(`${baseUrl}/dev/scenario-loader?tpl=simple&scenario=display-titles&panel=sections`, { waitUntil: 'networkidle0' })
  await page.waitForSelector('aside button[aria-label^="修改"]')
  await page.click('aside button[aria-label^="修改"]')
  let input = await page.waitForSelector('aside input[aria-label="模块名称"]')
  assert.equal(await input.evaluate((node) => node === document.activeElement), true)
  await input.click({ clickCount: 3 }); await input.type('Manager Career History'); await input.press('Enter')
  await page.waitForFunction(() => [...document.querySelectorAll('[data-section-display-title]')].some((node) => node.textContent === 'Manager Career History'))
  await page.screenshot({ path: `${output}/pc-manager.png` })
  await clickText(page, '恢复默认名称')
  await page.waitForFunction(() => !document.querySelector('[data-scenario-preview]')?.textContent.includes('Manager Career History'))
  results.pcManagerRenameReset = true
  await page.close()

  const mobile = await browser.newPage()
  mobile.on('pageerror', (error) => results.runtimeErrors.push(error.message))
  mobile.on('console', (message) => {
    if (message.type() === 'error' && !/font|CORS|Failed to load resource/i.test(message.text())) results.runtimeErrors.push(message.text())
  })
  await mobile.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
  await mobile.setCookie({ name: 'auth_uid', value: 'display-title-local-fixture', url: baseUrl })
  let saved
  await mobile.setRequestInterception(true)
  mobile.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname.startsWith('/next-api/') || url.pathname.startsWith('/api/')) {
      if (request.method() === 'PUT' && url.pathname === '/next-api/resumes/display-title-fixture') saved = JSON.parse(request.postData()).content
      void request.respond({ status: 200, contentType: 'application/json', body: '{}' })
    } else void request.continue()
  })
  await mobile.goto(`${baseUrl}/dev/scenario-loader?tpl=simple`, { waitUntil: 'networkidle0' })
  const resume = {
    id: 'display-title-fixture', name: '本地测试', sections: [
      { id: 'work', title: '工作经历', displayTitle: '职业履历', columns: 1, blocks: [{ id: 'work-1', type: 'experience', company: '本地示例公司', position: '工程师', startDate: '2024.01', endDate: '至今', contentHtml: '<p>测试工作内容</p>' }] },
      { id: 'custom', title: '个人作品', displayTitle: '教育经历', columns: 1, blocks: [{ id: 'custom-1', type: 'text', html: '<p>测试作品内容</p>' }] },
    ],
  }
  await mobile.evaluate(async (resume) => {
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('keyval-store', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('keyval')
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction('keyval', 'readwrite')
        transaction.objectStore('keyval').put(JSON.stringify({ state: { resumeId: resume.id, draft: resume, templateId: 'simple', dirtyPaths: [], celebratedMilestones: [], hiddenSectionIds: [] }, version: 0 }), 'resume-draft-v1')
        transaction.oncomplete = () => { db.close(); resolve() }
        transaction.onerror = () => reject(transaction.error)
      }
    })
  }, resume)
  await mobile.goto(`${baseUrl}/m/edit/work?source=web&mini=0`, { waitUntil: 'networkidle0' })
  await mobile.waitForFunction(() => document.title === '职业履历')
  await mobile.screenshot({ path: `${output}/mobile-work-list.png` })
  await clickText(mobile, '添加一条工作经历')
  await mobile.waitForFunction(() => location.pathname === '/m/edit/work/1')
  await mobile.waitForFunction(() => document.body.textContent.includes('公司名称'))
  results.mobileOriginalWorkForm = true
  await mobile.goto(`${baseUrl}/m/edit/custom/custom?source=web&mini=0`, { waitUntil: 'networkidle0' })
  await mobile.waitForSelector('button[aria-label="修改教育经历名称"]')
  await mobile.click('button[aria-label="修改教育经历名称"]')
  input = await mobile.waitForSelector('input[aria-label="模块名称"]')
  const longName = '职业履历项目实践经验'.repeat(4)
  await input.click({ clickCount: 3 }); await input.type(longName); await input.press('Enter')
  await mobile.waitForFunction((title) => document.title === title, {}, longName)
  await mobile.screenshot({ path: `${output}/mobile-custom-long-title.png` })
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await mobile.click('button[aria-label="保存"]')
  await mobile.waitForFunction(() => !document.body.textContent.includes('保存中'))
  assert.equal(saved.sections[0].title, '工作经历')
  assert.equal(saved.sections[0].blocks[1].type, 'experience')
  assert.equal(saved.sections[1].title, '个人作品')
  assert.equal(saved.sections[1].displayTitle, longName)
  await mobile.goto(`${baseUrl}/m/edit/custom/custom?source=web&mini=0`, { waitUntil: 'networkidle0' })
  await mobile.waitForFunction((title) => document.title === title, {}, longName)
  results.mobileIndexedDbReload = true
  results.mobileMockSavePreservesIdentity = true
  await mobile.close()
} finally {
  fs.writeFileSync(`${output}/flow-results.json`, JSON.stringify(results, null, 2))
  await browser.close()
}
console.log(results)
