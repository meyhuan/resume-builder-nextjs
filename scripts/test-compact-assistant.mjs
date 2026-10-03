// Run against a local development server. No real AI or account requests.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import puppeteer from 'puppeteer';

const origin = process.env.SIDEBAR_TEST_ORIGIN || 'http://127.0.0.1:3107';
const artifacts = 'test-artifacts/compact-assistant';
const preview = process.argv.includes('--preview');
const browser = await puppeteer.launch({ headless: !preview,
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const page = await browser.newPage();
const errors = [];
const metrics = [];
const taskLabel = '实习经历 · 郑州中原水产物流港冷库制冷系统';
let requests = 0;
let responseMode = 'success';
let pendingRequest;
await mkdir(artifacts, { recursive: true });
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error' && /hydration|hydrated|server rendered/i.test(message.text())) errors.push(message.text());
});
await page.setRequestInterception(true);
page.on('request', request => {
  const url = new URL(request.url());
  if (url.pathname === '/next-api/ai/chat/task') {
    requests++;
    if (responseMode === 'pending') { pendingRequest = request; return; }
    if (responseMode === 'error') return void request.respond({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: '测试网络错误' }) });
    const body = JSON.parse(request.postData());
    return void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ turn: {
      requestId: body.requestId, text: body.text, answer: '已保留原有职责范围，请确认以下事实。',
      questions: [{ question: '你具体负责哪部分工作？', options: ['现场测量', '整理报表'] }],
      proposals: [], followups: ['帮我进一步精简'], direct: false, charged: false, feature: 'polish',
    } }) });
  }
  if (/^\/(next-api|api)\//.test(url.pathname)) return void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data: [], sessions: [] }) });
  if (url.protocol.startsWith('http') && url.origin !== origin) return void request.abort();
  void request.continue();
});
const context = 'button[aria-label^="当前任务："]';
const input = 'textarea[aria-label="向 AI 描述修改需求"]';
const clickText = async (selector, text) => {
  for (const element of await page.$$(selector)) {
    if ((await element.evaluate(node => node.textContent.trim())) === text) { await element.click(); return; }
  }
  throw new Error('Missing control: ' + text);
};
const setDraft = async value => {
  await page.$eval(input, (node, value) => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(node, value);
    node.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
};
const height = () => page.$eval(input, node => Math.round(node.getBoundingClientRect().height));
try {
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(origin + '/dev/assistant-lab', { waitUntil: 'networkidle2' });
  await clickText('nav button', 'AI 助手');
  await page.waitForSelector(context);
  await page.evaluate(async label => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('keyval-store', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('keyval');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const task = { id: '00000000-0000-4000-8000-000000000001', resumeId: 'assistant-lab', feature: 'polish', blockId: 'campus-activity', label, entry: 'module' };
    const session = { task, turns: [{ requestId: 'fixture', text: '帮我把这段写得更精简', answer: '',
      questions: [
        { question: '“独立开展冷库冷负荷估算”——这里的“独立”是否准确？是指全程自主完成，还是在指导下独立承担该任务？', options: ['全程自主完成', '在工程师指导下独立承担', '与其他实习生协作完成'] },
        { question: '“输出完整选型计算文档”——这份文档是否已提交并用于实际选型决策？或仅是实习作业 / 练习成果？', options: ['用于实际项目选型参考', '提交给导师 / 工程师审阅', '仅作为实习练习成果'] },
      ], proposals: [], followups: ['只调整已有表达', '帮我梳理需要补充的信息'], direct: false, charged: false, feature: 'polish' }], reviews: {}, receipts: {}, updatedAt: Date.now() };
    const other = { task: { ...task, id: '00000000-0000-4000-8000-000000000002', feature: 'chat', blockId: undefined, label: '整份简历', entry: 'assistant' }, turns: [], reviews: {}, receipts: {}, updatedAt: Date.now() };
    await new Promise((resolve, reject) => {
      const tx = db.transaction('keyval', 'readwrite');
      tx.objectStore('keyval').put([session, other], 'ai-unified-history:assistant-lab');
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, taskLabel);
  await page.reload({ waitUntil: 'networkidle2' });
  await clickText('nav button', 'AI 助手');
  await page.waitForSelector(`button[title="${taskLabel}"]`);
  if (preview) {
    await page.bringToFront();
    console.log('Interactive preview ready: ' + origin + '/dev/assistant-lab (demo data; API requests mocked). Close the browser to stop the preview.');
    await new Promise(resolve => browser.once('disconnected', resolve));
    process.exit(0);
  }
  assert.equal(await page.$$eval('[data-testid="question-stepper"] [role="group"]', nodes => nodes.length), 1);
  assert.equal(await page.$$eval('button', nodes => nodes.some(node => node.textContent === '用于实际项目选型参考')), false);
  for (const width of [360, 480, 640]) {
    await page.focus('[role="separator"]');
    await page.keyboard.press('Home');
    for (let i = 360; i < width; i += 16) await page.keyboard.press('ArrowLeft');
    // 480 is restored exactly by double-click; 640 clamps at the bound.
    if (width === 480) {
      const box = await (await page.$('[role="separator"]')).boundingBox();
      await page.mouse.click(box.x + 4, box.y + 10, { clickCount: 2 });
    }
    await page.waitForFunction(width => Math.round(document.querySelector('[data-editor-workspace]').getBoundingClientRect().width) === width, {}, width);
    await setDraft('');
    await page.waitForFunction(selector => document.querySelector(selector).getBoundingClientRect().height === 56, {}, input);
    metrics.push(await page.evaluate(() => {
      const h = selector => Math.round(document.querySelector(selector).getBoundingClientRect().height);
      return { viewport: `${innerWidth}x${innerHeight}`, sidebar: Math.round(document.querySelector('[data-editor-workspace]').getBoundingClientRect().width),
        tabs: Math.round(document.querySelector('[data-editor-workspace] nav').parentElement.getBoundingClientRect().height), header: h('[data-testid="assistant-context"]'),
        conversation: h('[data-testid="assistant-conversation"]'), composer: h('[data-testid="assistant-composer"]') };
    }));
    assert.ok(metrics.at(-1).conversation / 900 > .75);
    await page.screenshot({ path: `${artifacts}/desktop-${width}.png` });
    if (width === 480) await (await page.$('[data-editor-workspace]')).screenshot({ path: `${artifacts}/sidebar-480.png` });
  }
  // Full title and history are reachable by keyboard without consuming conversation height.
  await page.focus(context);
  await page.keyboard.press('ArrowDown');
  await page.waitForSelector('[role="menu"]');
  assert.ok(await page.$eval('[role="menu"]', node => node.textContent.includes('当前对象：')));
  await page.screenshot({ path: `${artifacts}/task-history.png` });
  await page.keyboard.press('Escape');
  await page.waitForFunction(selector => document.querySelector(selector) === document.activeElement, {}, context);
  // Option choices fill the input but don't send; long drafts grow and cap.
  await clickText('button', '在工程师指导下独立承担');
  assert.equal(requests, 0);
  assert.equal(await page.$$eval('button[aria-pressed="true"]', nodes => nodes.some(node => node.textContent === '在工程师指导下独立承担')), true);
  await (await page.$('[data-editor-workspace]')).screenshot({ path: `${artifacts}/selected-answer.png` });
  await clickText('button', '自己填写');
  const customInput = 'textarea[aria-label="你的回答"]';
  await page.waitForFunction(selector => document.querySelector(selector) === document.activeElement, {}, customInput);
  assert.equal(await page.$eval(customInput, node => node.value), '在工程师指导下独立承担');
  await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control');
  await page.keyboard.type('我在工程师指导下完成测量和整理');
  assert.equal(await page.$$eval('button[aria-pressed="true"]', nodes => nodes.some(node => node.textContent === '在工程师指导下独立承担')), false);
  assert.equal(requests, 0);
  await (await page.$('[data-editor-workspace]')).screenshot({ path: `${artifacts}/custom-answer.png` });
  await clickText('button', '在工程师指导下独立承担');
  await page.waitForFunction(selector => document.querySelector(selector).getBoundingClientRect().height > 56, {}, input);
  const wideDraftHeight = await height();
  await page.focus('[role="separator"]');
  await page.keyboard.press('Home');
  await page.waitForFunction(selector => document.querySelector(selector).getBoundingClientRect().height > 74, {}, input);
  assert.ok(await height() > wideDraftHeight);
  await page.keyboard.press('End');
  await page.waitForFunction((selector, height) => document.querySelector(selector).getBoundingClientRect().height === height, {}, input, wideDraftHeight);
  await setDraft('我协助测量现场数据，整理工况分析报表。\n'.repeat(15));
  await page.waitForFunction(selector => document.querySelector(selector).getBoundingClientRect().height === 120, {}, input);
  assert.ok(await page.$eval(input, node => node.scrollHeight > node.clientHeight));
  await page.screenshot({ path: `${artifacts}/long-draft.png` });
  await setDraft('');
  await page.waitForFunction(selector => document.querySelector(selector).getBoundingClientRect().height === 56, {}, input);
  for (const width of [320, 375, 414, 768, 1024]) {
    await page.setViewport({ width, height: 740 });
    await page.waitForFunction(width => innerWidth === width, {}, width);
    await page.waitForFunction(selector => document.querySelector(selector).getBoundingClientRect().height === 56, {}, input);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.click(context);
    await page.waitForSelector('[role="menu"]');
    assert.ok(await page.$eval('[role="menu"]', node => { const r = node.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }));
    await page.keyboard.press('Escape');
    await page.screenshot({ path: `${artifacts}/viewport-${width}.png` });
  }
  await page.setViewport({ width: 1440, height: 600 });
  assert.ok(await page.$eval('[data-testid="assistant-conversation"]', node => node.clientHeight > 370));
  await page.screenshot({ path: `${artifacts}/short-screen.png` });
  // Shift+Enter / IME must not send. Enter sends and shrinks the input.
  await setDraft('我协助整理工况报表');
  await page.focus(input);
  await page.keyboard.down('Shift'); await page.keyboard.press('Enter'); await page.keyboard.up('Shift');
  await page.$eval(input, node => node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true })));
  assert.equal(requests, 0);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('[data-testid="question-stepper"]').textContent.includes('问题 2 / 2'));
  assert.equal(requests, 0);
  assert.equal(await page.$$eval('[data-testid="question-stepper"] [role="group"]', nodes => nodes.length), 1);
  await clickText('button', '暂不确定');
  await (await page.$('[data-editor-workspace]')).screenshot({ path: `${artifacts}/question-step-two.png` });
  await page.click('[aria-label="修改第 1 题回答"]');
  await page.waitForFunction(() => document.querySelector('[data-testid="question-stepper"]').textContent.includes('问题 1 / 2'));
  await clickText('button', '确认，下一题');
  await clickText('button', '提交回答');
  await page.waitForFunction(() => document.querySelector('[data-testid="assistant-conversation"]').textContent.includes('你具体负责哪部分工作？'));
  assert.equal(requests, 1);
  assert.equal(await height(), 56);
  responseMode = 'pending';
  await setDraft('继续'); await page.click('[aria-label="发送消息"], [aria-label="确认当前回答"]');
  await page.waitForSelector('button[title="停止生成"]');
  assert.ok(await page.$$eval('button', buttons => buttons.find(node => node.textContent === '新对话').disabled));
  await page.screenshot({ path: `${artifacts}/loading.png` });
  await page.click('button[title="停止生成"]');
  await page.waitForSelector('[role="alert"]');
  if (pendingRequest) await pendingRequest.abort().catch(() => {});
  await page.screenshot({ path: `${artifacts}/stopped.png` });
  responseMode = 'error';
  await setDraft('重新整理'); await page.click('[aria-label="发送消息"], [aria-label="确认当前回答"]');
  await page.waitForFunction(() => document.querySelector('[role="alert"]')?.textContent.includes('测试网络错误'));
  await page.screenshot({ path: `${artifacts}/error.png` });
  // Both older sessions remain switchable and legacy history remains reachable.
  await page.click(context); await page.waitForSelector('[role="menuitemradio"]');
  await clickText('[role="menuitemradio"]', '整份简历新任务');
  await page.waitForSelector('button[title="整份简历"]');
  await page.click('[aria-label="更多对话操作"]');
  await clickText('[role="menuitem"]', '旧版历史');
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(node => node.textContent === '返回新版助手'));
  await clickText('button', '返回新版助手');
  await page.waitForSelector(context);
  assert.deepEqual(errors, []);
  await writeFile(`${artifacts}/metrics.json`, JSON.stringify(metrics, null, 2));
  console.log(JSON.stringify({ passed: true, metrics, requests, errors }, null, 2));
} catch (error) {
  await page.screenshot({ path: `${artifacts}/failure.png` });
  throw error;
} finally { await browser.close(); }
