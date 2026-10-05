import puppeteer from 'puppeteer';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const base = process.env.AI_TEST_BASE || 'http://localhost:3127';
const out = 'test-artifacts/unified-ai-followups';
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });
page.setDefaultTimeout(30000);
const report = {
  fixture:
    'Synthetic resume and mocked AI responses; no account or database writes',
  checks: [],
  errors: [],
};
page.on('pageerror', (error) => report.errors.push(error.message));
await page.setRequestInterception(true);
page.on('request', (request) => {
  if (
    request.url().startsWith(base + '/next-api/') ||
    request.url().endsWith('/analytics/events')
  )
    void request.respond({
      status: 200,
      contentType: 'application/json',
      body: '{}',
      headers: {
        'access-control-allow-origin': base,
        'access-control-allow-headers': 'content-type',
        'access-control-allow-methods': 'POST, OPTIONS',
      },
    });
  else if (
    !request.url().startsWith(base) &&
    !request.url().startsWith('data:')
  )
    void request.abort();
  else void request.continue();
});
await page.evaluateOnNewDocument(() => {
  const originalFetch = window.fetch.bind(window);
  window.__aiRequests = [];
  window.fetch = async (url, init) => {
    if (typeof url !== 'string' || !url.endsWith('/next-api/ai/chat/task'))
      return originalFetch(url, init);
    const body = JSON.parse(init.body);
    window.__aiRequests.push(body);
    const block = body.resumeData.sections
      .flatMap((s) => s.blocks)
      .find((b) => b.id === body.task.blockId);
    const first = window.__aiRequests.length === 1;
    const turn = {
      requestId: body.requestId,
      text: body.text,
      messageSource: body.messageSource,
      answer: '请核对后选择应用。',
      questions: [],
      proposals: [
        {
          action: 'updateBlock',
          blockId: block.id,
          html: '<p>整理报名物品信息，协助完成登记与发放。</p>',
          before: JSON.stringify(block),
          targetLabel: body.task.label,
          factChecked: true,
        },
      ],
      followups: first
        ? [
            '这段经历中是否有具体服务人数（如累计服务200+人次）？若有，可自然融入首句。',
            '是否曾使用特定工具提升效率（如用Excel公式去重）？若明确用过，可加括号说明。',
            '反馈汇总是否形成过简要摘要（如1页内归纳TOP3问题）？若有交付物，可补充。',
          ]
        : [
            '帮我进一步精简表达，保留原有事实。',
            '说明这次修改的差异和需要核对的表述。',
            '补充这段经历的真实信息',
          ],
      direct: true, // An incorrect response still must not apply followup requests.
      charged: true,
      feature: 'polish',
    };
    return new Response(JSON.stringify({ turn }), {
      headers: { 'Content-Type': 'application/json' },
    });
  };
});
const click = async (text) => {
  await page.waitForFunction(
    (label) =>
      [...document.querySelectorAll('button')].some(
        (b) => b.textContent.trim() === label,
      ),
    {},
    text,
  );
  await page.evaluate(
    (label) =>
      [...document.querySelectorAll('button')]
        .find((b) => b.textContent.trim() === label)
        .click(),
    text,
  );
};
const requestCount = () => page.evaluate(() => window.__aiRequests.length);
const originalText = () => page.$eval('main section', (el) => el.textContent);
try {
  await page.goto(base + '/dev/assistant-lab', {
    waitUntil: 'networkidle0',
    timeout: 120000,
  });
  const original = await originalText();
  await click('AI润色');
  await page.waitForSelector('[aria-label="接下来可以"]');
  const questions = await page.$$eval(
    '[aria-label="接下来可以"] button',
    (buttons) => buttons.map((b) => b.textContent.trim()),
  );
  assert.equal(questions.length, 3);
  for (const question of questions) {
    await click(question);
    await page.waitForSelector('form[aria-label="补充真实信息"]');
    assert.equal(await requestCount(), 1);
    assert.equal(
      await page.$eval(
        'form[aria-label="补充真实信息"] button[type="submit"]',
        (b) => b.disabled,
      ),
      true,
    );
    await click('暂不补充');
    assert.equal(await requestCount(), 1);
  }
  report.checks.push(
    'All three legacy fact questions open local input; open and skip make zero additional requests',
  );
  await click(questions[0]);
  await page.type('form[aria-label="补充真实信息"] textarea', '47人次');
  await click('提交补充并润色');
  await page.waitForFunction(
    () => document.querySelectorAll('article').length === 2,
  );
  const facts = await page.evaluate(() => window.__aiRequests[1]);
  assert.equal(facts.messageSource, 'user');
  assert.equal(facts.fromFollowup, true);
  assert.equal(facts.followupTargetId, facts.task.blockId);
  assert.ok(facts.text.includes('实际服务规模：47人次'));
  assert.ok(!/200|TOP3|Excel/.test(facts.text));
  assert.equal(await originalText(), original);
  report.checks.push(
    'Only submitted facts are sent; selected target and provenance are retained; no automatic application',
  );
  await click('补充这段经历的真实信息');
  await page.waitForSelector('form[aria-label="补充真实信息"]');
  await page.$eval('form[aria-label="补充真实信息"]', (form) =>
    form.scrollIntoView({ block: 'end' }),
  );
  await page.screenshot({ path: out + '/form-wide.png', fullPage: true });
  await page.setViewport({ width: 1100, height: 1000 });
  await page.screenshot({ path: out + '/form-narrow.png', fullPage: true });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.equal(
    await page.$eval(
      'form[aria-label="补充真实信息"]',
      (form) => form.scrollWidth > form.clientWidth,
    ),
    false,
  );
  report.checks.push(
    'Optional fact form has no horizontal overflow at 1440px and 1100px',
  );
  await click('暂不补充');
  await click('帮我进一步精简表达，保留原有事实。');
  await page.waitForFunction(
    () => document.querySelectorAll('article').length === 3,
  );
  const action = await page.evaluate(() => window.__aiRequests[2]);
  assert.equal(action.messageSource, 'suggestion');
  assert.equal(action.turns[1].messageSource, 'user');
  assert.equal(await originalText(), original);
  await page.evaluate(() =>
    [...document.querySelectorAll('button')]
      .filter((b) => b.textContent.trim() === '应用这一处')
      .at(-1)
      .click(),
  );
  await page.waitForFunction(() =>
    document.querySelector('main section').textContent.includes('协助完成登记'),
  );
  await click('撤销这次修改');
  assert.equal(await originalText(), original);
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForFunction(
    () => document.querySelectorAll('article').length === 3,
  );
  assert.equal(await requestCount(), 0);
  assert.equal(await page.$('form[aria-label="补充真实信息"]'), null);
  report.checks.push(
    'Action requests send once, manual apply and undo work, history reload sends nothing and does not reopen fact input',
  );
  assert.deepEqual(report.errors, []);
  fs.writeFileSync(
    out + '/browser-report.json',
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
