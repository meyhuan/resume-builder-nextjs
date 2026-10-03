import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import puppeteer from 'puppeteer'

const source = fs.readFileSync('scripts/verify-template.mjs', 'utf8')
const parsed = ts.createSourceFile('verify-template.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
const declaration = parsed.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'checkSectionActionControls')
assert.ok(declaration)
const checkActions = vm.runInNewContext(`(${declaration.getText(parsed)})`, { sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)) })
const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((file) => fs.existsSync(file))
const browser = await puppeteer.launch({ headless: true, executablePath, args: ['--no-sandbox'] })
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 1000 })
  await page.goto(`${process.argv[2] || 'http://127.0.0.1:3012'}/dev/scenario-loader?tpl=ziji&fixture=full`, { waitUntil: 'networkidle2' })
  await page.waitForSelector('[class*="group/ziji-section"]')
  let initial
  try { initial = await checkActions(page) } catch (error) { initial = error.message }
  console.log('Original target:', initial)
  const sections = await page.$$('section.group\\/ziji-section, section.group\\/ziji-side-section')
  assert.ok(sections.length >= 4)
  for (const section of sections) {
    await section.evaluate((node) => {
      document.querySelectorAll('[data-template-section-header]').forEach((element) => element.removeAttribute('data-template-section-header'))
      node.firstElementChild.dataset.templateSectionHeader = 'true'
    })
    const title = await section.$eval('h2,h3', (node) => node.textContent)
    console.log(`PASS ${title}:`, await checkActions(page))
  }
  console.log(`PASS ${sections.length} real Ziji section headers; diagnostic DOM markers only, no app mutation`)
} finally { await browser.close() }
