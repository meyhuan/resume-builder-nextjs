// Real editor UI with local fixtures: no account, database or model requests.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import puppeteer from 'puppeteer';

const base = process.env.EDITOR_QA_URL || 'http://localhost:3127';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const key = 'resume-editor-sidebar-preference-v1';
const out = 'test-artifacts/editor-sidebar-preference';
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
page.setDefaultTimeout(60000);
// Navigating away from an imported synthetic draft can show beforeunload.
page.on('dialog', (dialog) => void dialog.accept());
const report = { checks: [], errors: [], aiRequests: [] };
page.on('pageerror', (error) => report.errors.push(error.message));
page.on('console', (message) => {
  if (
    message.type() === 'error' &&
    /hydration|hydrated|server rendered/i.test(message.text())
  )
    report.errors.push(message.text());
});
await page.setCookie({
  name: 'auth_uid',
  value: 'sidebar-local-fixture',
  url: base,
});
await page.setRequestInterception(true);
page.on('request', (request) => {
  const url = new URL(request.url());
  if (/^\/(next-api|api)\//.test(url.pathname)) {
    let body = {};
    if (url.pathname === '/next-api/resumes' && request.method() === 'POST')
      body = { id: 'sidebar-ai-saved-fixture' };
    if (url.pathname === '/next-api/ai/chat/task') {
      const input = JSON.parse(request.postData());
      report.aiRequests.push({
        feature: input.task.feature,
        blockId: input.task.blockId,
      });
      body = {
        turn: {
          requestId: input.requestId,
          text: input.text,
          answer: '请补充这段经历的真实信息。',
          questions: [{ question: '有哪些具体职责？', options: [] }],
          proposals: [],
          followups: [],
          charged: false,
          direct: false,
          feature: input.task.feature,
        },
      };
    }
    if (url.pathname === '/next-api/quota')
      body = Object.fromEntries(
        [
          'aiGenerateResume',
          'aiImportSection',
          'aiGenerateSection',
          'aiPolishSection',
          'aiEditorAssist',
          'pdfExport',
        ].map((name) => [
          name,
          { allowed: true, remaining: 20, limit: 20, isVip: true },
        ]),
      );
    if (url.pathname === '/next-api/vip/poll')
      body = { data: { isVip: true, vipStatus: 1 } };
    void request.respond({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  } else if (url.protocol.startsWith('http') && url.origin !== base)
    void request.abort();
  else void request.continue();
});
await page.evaluateOnNewDocument(() => {
  localStorage.setItem(
    'auth-storage',
    JSON.stringify({
      state: {
        token: 'sidebar-local-fixture',
        userInfo: { id: 'sidebar-local-fixture', name: '侧栏测试' },
      },
      version: 0,
    }),
  );
});
const aside = '[data-editor-workspace]';
const expectPanel = (panel) =>
  page.waitForFunction(
    (selector, expected) => {
      const node = document.querySelector(selector);
      if (!node) return false;
      const open = getComputedStyle(node).display !== 'none';
      if (expected === null)
        return (
          !open &&
          getComputedStyle(document.querySelector('[data-editor-canvas]'))
            .display !== 'none'
        );
      return (
        open &&
        node
          .querySelector('nav button[aria-pressed="true"]')
          ?.textContent.trim() === expected
      );
    },
    {},
    aside,
    panel,
  );
const clickTool = (text) =>
  page.evaluate((label) => {
    const button = [
      ...document.querySelectorAll('[aria-label="切换编辑工具"] button'),
    ].find((node) => node.textContent.trim() === label);
    assertButton(button);
    function assertButton(node) {
      if (!node) throw new Error('Missing tool: ' + label);
      node.click();
    }
  }, text);
const reload = async () => {
  await page.reload({ waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForSelector('header [aria-label="AI 助手"]', {
    visible: true,
  });
};
const moduleAction = async (title) => {
  await page.waitForSelector('[data-editor-canvas] [data-ai-block-id]');
  const block = await page.$(
    '[data-editor-canvas] [data-resume-edit-region="block"][aria-label="工作经历条目"]',
  );
  assert.ok(block, 'Work experience fixture');
  await block.hover();
  await page.waitForSelector(`button[title="${title}"]`, { visible: true });
  await page.click(`button[title="${title}"]`);
  await expectPanel('AI 助手');
};
try {
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(base + '/editor/new', {
    waitUntil: 'networkidle0',
    timeout: 180000,
  });
  await expectPanel('模块');
  await page.screenshot({ path: out + '/desktop-first-entry.png' });
  report.checks.push('desktop first entry opens modules');
  await clickTool('样式');
  await reload();
  await expectPanel('样式');
  await page.click('[aria-label="收起工具，返回简历"]');
  await reload();
  await expectPanel(null);
  report.checks.push('selected tool and explicit collapse survive reload');
  await page.click('header [aria-label="AI 助手"]');
  await expectPanel('AI 助手');
  await reload();
  await expectPanel('AI 助手');
  assert.equal(report.aiRequests.length, 0, 'Restoring AI must not generate');
  report.checks.push('AI tab restores without automatic requests');
  await page.click('[aria-label="收起工具，返回简历"]');
  await moduleAction('AI润色');
  await page.waitForFunction(() =>
    document
      .querySelector('[data-editor-workspace]')
      .innerText.includes('请补充这段经历的真实信息。'),
  );
  assert.equal(report.aiRequests.length, 1);
  assert.equal(report.aiRequests[0].feature, 'polish');
  await reload();
  await expectPanel('AI 助手');
  assert.equal(
    report.aiRequests.length,
    1,
    'Reload must not rerun module polish',
  );
  await page.click('[aria-label="收起工具，返回简历"]');
  await moduleAction('AI帮我写');
  assert.equal(
    report.aiRequests.length,
    1,
    'Generate opens its fact input before requesting',
  );
  report.checks.push(
    'module polish and generate reopen collapsed tools; no replay after reload',
  );
  await clickTool('样式');
  await page.setViewport({ width: 375, height: 900 });
  await reload();
  await expectPanel(null);
  await page.screenshot({ path: out + '/mobile-first-entry.png' });
  await page.click('header [aria-label="AI 助手"]');
  await expectPanel('AI 助手');
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await reload();
  await expectPanel('AI 助手');
  await page.click('[aria-label="收起工具，返回简历"]');
  await reload();
  await expectPanel(null);
  await page.setViewport({ width: 1440, height: 1000 });
  await reload();
  await expectPanel('样式');
  assert.deepEqual(
    await page.evaluate(
      (storageKey) => JSON.parse(localStorage.getItem(storageKey + ':desktop')),
      key,
    ),
    { open: true, panel: 'layout' },
  );
  report.checks.push(
    'mobile defaults collapsed, remembers its own choice, and preserves desktop choice',
  );
  const enterFromAi = async () => {
    await page.evaluate(() =>
      localStorage.setItem(
        'wizard_pending_resume',
        JSON.stringify({
          id: 'sidebar-ai-entry-fixture',
          name: 'AI入口验收',
          sections: [],
        }),
      ),
    );
    await page.goto(base + '/editor/new?source=ai', {
      waitUntil: 'networkidle0',
      timeout: 120000,
    });
  };
  await enterFromAi();
  await expectPanel('样式');
  await page.click('[aria-label="收起工具，返回简历"]');
  await enterFromAi();
  await expectPanel(null);
  report.checks.push(
    'AI source respects previously selected styles and explicit collapse',
  );
  await page.evaluate(
    (storageKey) => localStorage.removeItem(storageKey + ':desktop'),
    key,
  );
  await enterFromAi();
  await expectPanel('AI 助手');
  await page.screenshot({ path: out + '/desktop-ai-entry.png' });
  assert.equal(
    report.aiRequests.length,
    1,
    'AI entry opens tools without a new model request',
  );
  report.checks.push(
    'first AI source opens assistant without requesting generation',
  );
  await page.keyboard.down('Control');
  await page.keyboard.press('s');
  await page.keyboard.up('Control');
  await page.waitForFunction(
    () => location.pathname === '/editor/sidebar-ai-saved-fixture',
  );
  assert.equal(new URL(page.url()).searchParams.get('source'), 'ai');
  await expectPanel('AI 助手');
  report.checks.push(
    'saving an AI draft preserves its entry marker and active tool',
  );
  assert.deepEqual(report.errors, []);
  console.log('PASS:', report.checks.join('; '));
} catch (error) {
  await page.screenshot({ path: out + '/failure.png' });
  console.error('Browser errors:', report.errors);
  throw error;
} finally {
  fs.writeFileSync(out + '/report.json', JSON.stringify(report, null, 2));
  await browser.close();
}
