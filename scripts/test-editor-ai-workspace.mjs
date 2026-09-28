import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer';

const base = process.env.EDITOR_QA_URL || 'http://localhost:3018';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Local QA only');
const artifacts = 'test-artifacts/editor-ai-workspace';
await mkdir(artifacts, { recursive: true });
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.setRequestInterception(true);
page.on('request', (request) => {
  const url = new URL(request.url());
  if (url.origin !== new URL(base).origin) return request.abort();
  if (url.pathname.startsWith('/next-api/')) {
    if (url.pathname === '/next-api/ai/chat') {
      const data = JSON.parse(request.postData());
      const target = data.resumeData.sections.flatMap((section) => section.blocks).find((block) => 'contentHtml' in block || 'html' in block || block.type === 'education');
      const parts = [
        { type: 'start', messageId: 'qa-response' },
        { type: 'start-step' },
        { type: 'tool-input-available', toolCallId: 'qa-call', toolName: 'updateBlockContent', input: { blockId: target.id, html: '<p>这是待确认的测试建议</p>' } },
        { type: 'tool-output-available', toolCallId: 'qa-call', output: { action: 'updateBlock', blockId: target.id, html: '<p>这是待确认的测试建议</p>', reason: '精简表达' } },
        { type: 'finish-step' },
        { type: 'finish', finishReason: 'stop' },
      ];
      return request.respond({ status: 200, headers: { 'content-type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' }, body: parts.map((part) => `data: ${JSON.stringify(part)}\n\n`).join('') + 'data: [DONE]\n\n' });
    }
    let body = {};
    if (url.pathname === '/next-api/quota') body = Object.fromEntries(['aiGenerateResume', 'aiImportSection', 'aiGenerateSection', 'aiPolishSection', 'aiEditorAssist', 'pdfExport'].map((key) => [key, { allowed: true, remaining: 20, limit: 20, isVip: false }]));
    if (url.pathname === '/next-api/vip/poll') body = { data: { isVip: false, vipStatus: 0, vipType: 0, vipExpireTime: null } };
    return request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  }
  return request.continue();
});
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('auth-storage', JSON.stringify({ state: { token: 'local-ui-fixture', userInfo: { id: 'editor-ui-fixture', name: '布局测试' } }, version: 0 }));
});
async function clickText(text, scope = '[data-editor-workspace]') {
  const handle = await page.evaluateHandle((label, parent) => [...document.querySelectorAll(`${parent} button`)].find((node) => node.textContent.trim() === label && node.getClientRects().length), text, scope);
  assert.ok(handle.asElement(), `Button missing: ${text}`);
  await handle.asElement().click();
  await handle.dispose();
}
try {
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(`${base}/editor/new`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('header [aria-label="AI 助手"]', { visible: true, timeout: 120000 });
  await page.waitForFunction(() => document.querySelector('textarea[aria-label="向 AI 描述修改需求"]'));
  await page.click('header [aria-label="AI 助手"]');
  await page.waitForSelector('textarea[aria-label="向 AI 描述修改需求"]', { visible: true });
  await page.type('textarea[aria-label="向 AI 描述修改需求"]', '请帮我精简这段工作经历');
  await clickText('模板');
  assert.equal(await page.$('[data-editor-workspace] [aria-label="关闭侧边栏"]'), null);
  assert.ok(!(await page.$eval('[data-editor-workspace]', (node) => node.innerText)).includes('排版美化'));
  assert.equal(await page.$('[data-editor-workspace] [role="tablist"]'), null, 'No second navigation row');
  assert.equal(await page.$$eval('[aria-label="切换编辑工具"] button', (nodes) => nodes.length), 4);
  await page.screenshot({ path: `${artifacts}/layout-clean.png` });
  await clickText('样式');
  await page.waitForFunction(() => document.querySelector('[data-editor-workspace]').innerText.includes('字体风格'));
  assert.equal(await page.$('[data-editor-workspace] [role="tablist"]'), null);
  await page.screenshot({ path: `${artifacts}/styles-single-row.png` });
  await page.click('header button[title="样式"]');
  assert.equal(await page.$eval('[data-editor-workspace]', (node) => getComputedStyle(node).display), 'none');
  await page.click('header button[title="样式"]');
  await page.waitForFunction(() => document.querySelector('[data-editor-workspace]').innerText.includes('字体风格'));

  await clickText('模块');
  assert.equal(await page.$('[data-editor-workspace] h2'), null, 'No duplicate module header');
  await page.screenshot({ path: `${artifacts}/modules-clean.png` });
  await clickText('AI 助手');
  assert.equal(await page.$eval('textarea[aria-label="向 AI 描述修改需求"]', (node) => node.value), '请帮我精简这段工作经历');
  const rects = await page.evaluate(() => {
    const canvas = document.querySelector('[data-editor-canvas]').getBoundingClientRect();
    const panel = document.querySelector('[data-editor-workspace]').getBoundingClientRect();
    return { canvasRight: canvas.right, panelLeft: panel.left };
  });
  assert.ok(rects.canvasRight <= rects.panelLeft, 'Workspace must not cover canvas');
  await page.screenshot({ path: `${artifacts}/desktop-1440.png` });
  for (const width of [320, 375, 414, 768, 1024, 1280]) {
    await page.setViewport({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Page overflow at ${width}`);
    assert.ok(await page.$eval('[data-editor-workspace]', (node) => node.getBoundingClientRect().right <= innerWidth), `Panel overflow at ${width}`);
    if (width < 768) assert.equal(await page.$eval('[data-editor-canvas]', (node) => getComputedStyle(node).display), 'none');
    if (width >= 768) {
      assert.notEqual(await page.$eval('[data-editor-canvas]', (node) => getComputedStyle(node).display), 'none');
      assert.ok(await page.$eval('[data-editor-workspace]', (node) => node.getBoundingClientRect().width <= 380), 'Panel must remain bounded');
    }
    await page.screenshot({ path: `${artifacts}/workspace-${width}.png` });
  }
  await page.setViewport({ width: 375, height: 900 });
  await page.click('[aria-label="收起工具，返回简历"]');
  assert.notEqual(await page.$eval('[data-editor-canvas]', (node) => getComputedStyle(node).display), 'none');
  await page.click('header [aria-label="AI 助手"]');
  assert.equal(await page.$eval('textarea[aria-label="向 AI 描述修改需求"]', (node) => node.value), '请帮我精简这段工作经历');
  await page.setViewport({ width: 1440, height: 1000 });
  await page.click('[aria-label="发送消息"]');
  await page.waitForFunction(() => document.querySelector('[data-editor-workspace]').innerText.includes('应用这一处'));
  assert.ok(!(await page.$eval('[data-editor-canvas]', (node) => node.innerText)).includes('这是待确认的测试建议'), 'Suggestion must not auto-apply');
  await page.screenshot({ path: `${artifacts}/suggestion-review.png` });
  await clickText('应用这一处');
  await page.waitForFunction(() => document.querySelector('[data-editor-canvas]').innerText.includes('这是待确认的测试建议'));
  await page.click('header [aria-label="撤销"]');
  await page.waitForFunction(() => !document.querySelector('[data-editor-canvas]').innerText.includes('这是待确认的测试建议'));
  const blocks = await page.$$('[data-editor-canvas] [class~="group/block"]');
  const block = blocks[1];
  assert.ok(block, 'Editable resume block');
  await block.hover();
  await page.waitForSelector('button[title="AI润色"]', { visible: true });
  await page.click('button[title="AI润色"]');
  await page.waitForFunction(() => document.querySelector('#editor-section-ai').innerText.includes('AI 内容润色'));
  assert.equal(await page.$('[role="dialog"]'), null, 'Section AI must not block the canvas with a modal');
  await page.screenshot({ path: `${artifacts}/section-polish.png` });
  await clickText('模板');
  await page.click('[aria-label="收起工具，返回简历"]');
  await block.hover();
  await page.waitForSelector('button[title="AI帮我写"]', { visible: true });
  await page.click('button[title="AI帮我写"]');
  await page.waitForFunction(() => document.querySelector('#editor-section-ai').innerText.includes('AI 帮你写模块内容'));
  assert.equal(await page.$('[role="dialog"]'), null);
  await page.screenshot({ path: `${artifacts}/section-generate.png` });
  assert.deepEqual(errors, [], 'Browser runtime errors');
  console.log('PASS: desktop non-overlap; draft preservation; 6 responsive widths; close/reopen; streamed proposal review/apply/undo; no runtime errors. API responses mocked; no real account or AI usage.');
} catch (error) {
  console.error('PAGE:', await page.evaluate(() => document.body.innerText));
  console.error('ERRORS:', errors);
  await page.screenshot({ path: `${artifacts}/failure.png` });
  throw error;
} finally {
  await browser.close();
}
