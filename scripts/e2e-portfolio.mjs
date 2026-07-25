import fs from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer'
import sharp from 'sharp'

const root = process.cwd()
const baseUrl = process.env.PORTFOLIO_E2E_BASE_URL || 'http://localhost:3118'
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const artifactDir = path.join(root, 'test-artifacts', 'portfolio-e2e')
const runId = Date.now().toString(36)
const wxId = `portfolio_e2e_${runId}`
const resumeTitle = `作品集 E2E ${runId}`

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function createFixture(fileName, width, height, background, label) {
  const svg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="${background}"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        fill="#ffffff" font-family="Arial, sans-serif" font-size="${Math.max(28, Math.round(width / 10))}"
        font-weight="700">${label}</text>
    </svg>
  `)
  const target = path.join(artifactDir, fileName)
  await sharp(svg).png().toFile(target)
  return target
}

async function configurePage(page, viewport) {
  await page.setViewport(viewport)
  page.setDefaultTimeout(45_000)
  page.setDefaultNavigationTimeout(45_000)
  await page.evaluateOnNewDocument(() => {
    const state = {
      state: {
        token: 'portfolio-e2e-token',
        userInfo: { id: 'portfolio-e2e-user', name: '作品集测试用户' },
      },
      version: 0,
    }
    localStorage.setItem('token', 'portfolio-e2e-token')
    localStorage.setItem('auth-storage', JSON.stringify(state))
  })
  await page.setRequestInterception(true)
  page.on('request', (request) => {
    const url = request.url()
    if (url.includes('/next-api/quota')) {
      void request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          aiGenerateResume: { allowed: true, remaining: 99, isVip: true },
          aiImportSection: { allowed: true, remaining: 99, isVip: true },
          aiGenerateSection: { allowed: true, remaining: 99, isVip: true },
          aiPolishSection: { allowed: true, remaining: 99, isVip: true },
          aiOptimizeResume: { allowed: true, remaining: 99, isVip: true },
          pdfExport: { allowed: true, remaining: 99, isVip: true },
        }),
      })
      return
    }
    if (url.includes('/next-api/vip/poll')) {
      void request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            isVip: true,
            vipStatus: 'active',
            vipType: 'e2e',
            vipExpireTime: '2099-12-31T00:00:00.000Z',
          },
        }),
      })
      return
    }
    void request.continue()
  })
}

async function login(page) {
  const url = new URL('/next-api/e2e/login', baseUrl)
  url.searchParams.set('wxId', wxId)
  url.searchParams.set('name', '作品集自动化测试用户')
  url.searchParams.set('next', '/editor/new')
  const response = await page.goto(url.href, { waitUntil: 'domcontentloaded' })
  assert(response?.ok(), `E2E login failed: ${response?.status()}`)
  await page.setCookie({
    name: 'auth_uid',
    value: wxId,
    url: baseUrl,
    sameSite: 'Lax',
  })
  await page.evaluate((value) => {
    document.cookie = `auth_uid=${encodeURIComponent(value)}; Path=/; SameSite=Lax`
  }, wxId)
  const authProbe = await page.evaluate(async () => {
    const response = await fetch('/next-api/resumes', { credentials: 'include' })
    return { status: response.status, cookie: document.cookie }
  })
  assert(authProbe.status === 200, `E2E auth cookie failed: ${authProbe.status}; ${authProbe.cookie}`)
}

async function waitForUploadCount(page, count) {
  try {
    await page.waitForFunction(
      (expected) => document.querySelectorAll('[data-portfolio-image-id]').length === expected,
      {},
      count,
    )
  } catch (error) {
    const state = await page.evaluate(() => ({
      imageCount: document.querySelectorAll('[data-portfolio-image-id]').length,
      managerCount: document.querySelectorAll('[data-portfolio-manager]').length,
      url: location.href,
      text: document.body.innerText.slice(-2000),
    }))
    await page.screenshot({ path: path.join(artifactDir, 'upload-timeout.png'), fullPage: true })
    throw new Error(`Upload count ${count} not reached: ${JSON.stringify(state)}`, { cause: error })
  }
  await page.waitForFunction(() => !document.body.innerText.includes('正在上传'))
}

async function setCaption(page, index, value) {
  const inputs = await page.$$('[data-portfolio-caption]')
  assert(inputs[index], `Caption input ${index} missing`)
  await inputs[index].click({ clickCount: 3 })
  await inputs[index].type(value)
}

async function readCaptions(page) {
  return page.$$eval('[data-portfolio-caption]', (inputs) => inputs.map((input) => input.value))
}

async function moveSecondBeforeFirst(page) {
  const originalSecondId = await page.$eval(
    '[data-portfolio-image-id]:nth-child(2)',
    (card) => card.getAttribute('data-portfolio-image-id'),
  )
  const moveButton = await page.$(
    '[data-portfolio-image-id]:nth-child(2) button[aria-label="向前移动"]',
  )
  assert(moveButton, 'Move previous button missing')
  await moveButton.click()
  await page.waitForFunction((expectedId) => (
    document.querySelector('[data-portfolio-image-id]')?.getAttribute('data-portfolio-image-id') === expectedId
  ), { timeout: 5_000 }, originalSecondId)
}

async function clickButtonByText(page, text) {
  const clicked = await page.evaluate((target) => {
    const button = [...document.querySelectorAll('button')].find((item) => item.textContent?.includes(target))
    if (!button) return false
    button.click()
    return true
  }, text)
  assert(clicked, `Button not found: ${text}`)
}

async function waitForSaved(page) {
  await page.waitForFunction(() => document.body.innerText.includes('保存成功') || document.body.innerText.includes('已保存'))
}

async function fetchResume(page, resumeId) {
  return page.evaluate(async (id) => {
    const response = await fetch(`/next-api/resumes/${id}`, { credentials: 'include' })
    if (!response.ok) throw new Error(`Resume fetch failed: ${response.status}`)
    return response.json()
  }, resumeId)
}

async function run() {
  await fs.mkdir(artifactDir, { recursive: true })
  const imageA = await createFixture('work-a.png', 720, 1080, '#7c3aed', 'A')
  const imageB = await createFixture('work-b.png', 1200, 720, '#d946ef', 'B')
  const imageC = await createFixture('work-c.png', 800, 1200, '#0f766e', 'C')
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  let resumeId = null
  let primaryPage = null
  try {
    let page = await browser.newPage()
    primaryPage = page
    await configurePage(page, { width: 1440, height: 1000, deviceScaleFactor: 1 })
    await login(page)
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 30_000 }).catch(() => undefined)
    assert(!await page.$('[data-editor-panel="portfolio"]'), 'Portfolio toolbar should be hidden before adding the module')
    await page.click('[data-editor-panel="sections"]')
    await page.waitForSelector('[data-add-portfolio]')
    await page.click('[data-add-portfolio]')
    await page.waitForSelector('[data-portfolio-manager="true"]')

    const titleInput = await page.$('[data-portfolio-title]')
    await titleInput.click({ clickCount: 3 })
    await titleInput.type('交互设计作品集')
    const uploadInput = await page.$('[data-portfolio-upload-input]')
    await uploadInput.uploadFile(imageA, imageB)
    await waitForUploadCount(page, 2)
    await setCaption(page, 0, '作品A')
    await setCaption(page, 1, '作品B')
    await new Promise((resolve) => setTimeout(resolve, 250))
    await moveSecondBeforeFirst(page)
    const reorderedCaptions = await readCaptions(page)
    assert(
      JSON.stringify(reorderedCaptions) === JSON.stringify(['作品B', '作品A']),
      `PC drag order mismatch: ${JSON.stringify(reorderedCaptions)}`,
    )

    const match = page.url().match(/\/editor\/([^/?#]+)/)
    assert(match, `Resume id missing from editor URL: ${page.url()}`)
    resumeId = match[1]
    const saveResponse = page.waitForResponse((response) => (
      response.request().method() === 'PUT'
      && response.url().includes(`/next-api/resumes/${resumeId}`)
      && response.ok()
    ))
    await clickButtonByText(page, '保存')
    await saveResponse
    await waitForSaved(page)
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 15_000 }).catch(() => undefined)
    if (!await page.$('[data-portfolio-manager="true"]')) {
      await page.click('[data-editor-panel="sections"]')
      await page.waitForSelector('[data-edit-portfolio]')
      await page.click('[data-edit-portfolio]')
      await page.waitForSelector('[data-portfolio-manager="true"]')
    }
    await page.screenshot({ path: path.join(artifactDir, 'pc-portfolio-saved.png'), fullPage: true })

    await page.close()
    page = await browser.newPage()
    primaryPage = page
    await configurePage(page, { width: 1440, height: 1000, deviceScaleFactor: 1 })
    await page.goto(new URL(`/editor/${resumeId}`, baseUrl).href, {
      waitUntil: 'domcontentloaded',
      timeout: 90_000,
    })
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 30_000 }).catch(() => undefined)
    assert(!await page.$('[data-editor-panel="portfolio"]'), 'Portfolio should not be a top-level toolbar action')
    await page.click('[data-editor-panel="sections"]')
    await page.waitForSelector('[data-edit-portfolio]')
    await page.click('[data-edit-portfolio]')
    await page.waitForSelector('[data-portfolio-manager="true"]')
    assert(JSON.stringify(await readCaptions(page)) === JSON.stringify(['作品B', '作品A']), 'PC reload order mismatch')
    await page.click('button[aria-label="关闭侧边栏"]')
    await page.click('[data-editor-panel="sections"]')
    await page.waitForSelector('[data-toggle-portfolio]')
    await page.click('[data-toggle-portfolio]')
    await page.waitForFunction(() => !document.querySelector('.portfolio-appendix'))
    await page.click('[data-toggle-portfolio]')
    await page.waitForSelector('.portfolio-appendix')

    await page.close()
    page = await browser.newPage()
    primaryPage = page
    await configurePage(page, { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true })
    await page.goto(new URL(`/m/edit?id=${resumeId}`, baseUrl).href, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-portfolio-preview]')
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 30_000 }).catch(() => undefined)
    await clickButtonByText(page, '模块管理')
    await page.waitForSelector('[data-toggle-portfolio]', { visible: true })
    await new Promise((resolve) => setTimeout(resolve, 350))
    await page.$eval('[data-toggle-portfolio]', (button) => button.scrollIntoView({ block: 'center' }))
    await page.$eval('[data-toggle-portfolio]', (button) => button.click())
    await page.waitForFunction(() => !document.querySelector('[data-portfolio-preview]'))
    await page.waitForFunction(() => (
      document.querySelector('[data-toggle-portfolio]')?.getAttribute('aria-label') === '显示图片作品集'
    ))
    await page.$eval('[data-toggle-portfolio]', (button) => button.scrollIntoView({ block: 'center' }))
    await page.$eval('[data-toggle-portfolio]', (button) => button.click())
    await page.waitForFunction(() => (
      document.querySelector('[data-toggle-portfolio]')?.getAttribute('aria-label') === '隐藏图片作品集'
    ))
    await page.waitForSelector('[data-portfolio-preview]')
    await page.$eval('[data-edit-portfolio]', (button) => button.scrollIntoView({ block: 'center' }))
    await page.$eval('[data-edit-portfolio]', (button) => button.click())
    await page.waitForSelector('[data-portfolio-manager="true"]')
    const mobileUpload = await page.$('[data-portfolio-upload-input]')
    await mobileUpload.uploadFile(imageC)
    await waitForUploadCount(page, 3)
    await setCaption(page, 2, '作品C')
    await page.screenshot({ path: path.join(artifactDir, 'mobile-portfolio-editor.png'), fullPage: true })
    await clickButtonByText(page, '保存')
    await page.waitForFunction(() => location.pathname === '/m/edit')
    await page.screenshot({ path: path.join(artifactDir, 'mobile-portfolio-saved.png'), fullPage: true })

    const persisted = await fetchResume(page, resumeId)
    const portfolio = persisted.content?.portfolio
    assert(portfolio?.title === '交互设计作品集', 'Persisted portfolio title mismatch')
    assert(portfolio?.images?.length === 3, `Persisted image count mismatch: ${portfolio?.images?.length}`)
    assert(
      JSON.stringify(portfolio.images.map((image) => image.caption)) === JSON.stringify(['作品B', '作品A', '作品C']),
      'Persisted caption order mismatch',
    )

    await page.close()
    page = await browser.newPage()
    primaryPage = page
    await configurePage(page, { width: 1440, height: 1000, deviceScaleFactor: 1 })
    await page.goto(new URL(`/editor/${resumeId}`, baseUrl).href, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => document.querySelectorAll('.portfolio-page').length >= 2)
    await clickButtonByText(page, '预览/导出')
    await page.waitForFunction(() => document.body.innerText.includes('导出效果预览'), { timeout: 60_000 })
    const pdfPayload = await page.evaluate(async () => {
      const iframe = document.querySelector('iframe[title="PDF 预览"]')
      if (!iframe?.src) throw new Error('PDF iframe missing')
      const buffer = await (await fetch(iframe.src)).arrayBuffer()
      const bytes = new Uint8Array(buffer)
      let binary = ''
      for (const byte of bytes) binary += String.fromCharCode(byte)
      return {
        byteLength: bytes.length,
        header: binary.slice(0, 4),
        pageCount: (binary.match(/\/Type\s*\/Page\b/g) || []).length,
        base64: btoa(binary),
      }
    })
    const { base64: pdfBase64, ...pdfInfo } = pdfPayload
    assert(pdfInfo.header === '%PDF', 'Generated preview is not a PDF')
    assert(pdfInfo.byteLength > 50_000, `Generated PDF too small: ${pdfInfo.byteLength}`)
    assert(pdfInfo.pageCount >= 3, `Expected resume + portfolio pages, received ${pdfInfo.pageCount}`)
    await fs.writeFile(path.join(artifactDir, 'portfolio-e2e.pdf'), Buffer.from(pdfBase64, 'base64'))
    await page.screenshot({ path: path.join(artifactDir, 'pc-pdf-preview.png'), fullPage: true })

    const report = {
      ok: true,
      resumeId,
      pcOrder: ['作品B', '作品A'],
      mobileAdded: '作品C',
      persistedImageCount: portfolio.images.length,
      pdf: pdfInfo,
      artifacts: [
        'pc-portfolio-saved.png',
        'mobile-portfolio-editor.png',
        'mobile-portfolio-saved.png',
        'pc-pdf-preview.png',
        'portfolio-e2e.pdf',
      ],
    }
    await fs.writeFile(path.join(artifactDir, 'result.json'), `${JSON.stringify(report, null, 2)}\n`)
    console.log(JSON.stringify(report, null, 2))
  } finally {
    if (!resumeId && primaryPage) {
      resumeId = primaryPage.url().match(/\/editor\/([^/?#]+)/)?.[1] ?? null
      if (resumeId === 'new') resumeId = null
    }
    if (resumeId) {
      const cleanupPage = await browser.newPage()
      await configurePage(cleanupPage, { width: 390, height: 844, deviceScaleFactor: 1 })
      await cleanupPage.goto(baseUrl, { waitUntil: 'domcontentloaded' }).catch(() => undefined)
      await cleanupPage.evaluate(async (id) => {
        await fetch(`/next-api/resumes/${id}`, { method: 'DELETE', credentials: 'include' })
      }, resumeId).catch(() => undefined)
      await cleanupPage.close()
    }
    await browser.close()
  }
}

run().catch(async (error) => {
  await fs.mkdir(artifactDir, { recursive: true })
  await fs.writeFile(path.join(artifactDir, 'failure.txt'), `${error.stack || error.message}\n`)
  console.error(error)
  process.exitCode = 1
})
