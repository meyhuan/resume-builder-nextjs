import puppeteer from 'puppeteer';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base = process.env.AI_TEST_BASE || 'http://localhost:3127';
const out = 'test-artifacts/unified-ai';
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
let calls = 0;
const requests = [];
await page.setRequestInterception(true);
page.on('request', (request) => {
  if (request.url().endsWith('/next-api/ai/chat/task')) {
    calls++;
    const body = JSON.parse(request.postData());
    requests.push(body);
    const block = body.resumeData.sections
      .flatMap((s) => s.blocks)
      .find((b) => b.id === body.task.blockId);
    const turn = {
      requestId: body.requestId,
      text: body.text,
      answer: '保留了协助执行的职责，整理了信息核对与活动收尾的表达。',
      questions: [],
      proposals: [
        {
          action: 'updateBlock',
          blockId: block.id,
          html: '<p>整理活动报名与物品信息，核对领取时间及联系方式；协助完成现场登记与物品发放，并整理未领取物品清单交由活动负责人处理。</p>',
          before: JSON.stringify(block),
          targetLabel: '在校经历 · 校园旧物交换活动',
          factChecked: true,
        },
      ],
      followups: [
        '这段还能再精简一点吗？',
        '哪些信息需要我补充？',
        '这次具体调整了哪些表达？',
      ],
      direct: body.text.includes('直接替换'),
      charged: true,
      feature: body.task.feature,
    };
    void request.respond({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ turn }),
    });
    return;
  }
  if (request.url().startsWith(base + '/next-api/')) {
    void request.respond({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    });
    return;
  }
  if (!request.url().startsWith(base) && !request.url().startsWith('data:')) {
    void request.abort();
    return;
  }
  void request.continue();
});
const click = async (text) => {
  await page.waitForFunction(
    (t) =>
      [...document.querySelectorAll('button')].some(
        (b) => b.textContent.trim() === t,
      ),
    {},
    text,
  );
  await page.evaluate(
    (t) =>
      [...document.querySelectorAll('button')]
        .find((b) => b.textContent.trim() === t)
        .click(),
    text,
  );
};
try {
  await page.goto(base + '/dev/assistant-lab', {
    waitUntil: 'networkidle0',
    timeout: 120000,
  });
  await click('AI润色');
  await click('帮我润色这段，保持事实不变');
  await page.waitForFunction(() =>
    document.body.textContent.includes('应用这一处'),
  );
  await page.screenshot({ path: out + '/preview.png', fullPage: true });
  assert.equal(calls, 1);
  assert.equal(requests[0].task.feature, 'polish');
  assert.ok(await page.$('del'));
  assert.ok(await page.$('ins'));
  assert.ok(
    await page.evaluate(() =>
      document
        .querySelector('main section')
        .textContent.includes('整理报名同学提交'),
    ),
  );
  await click('应用这一处');
  await page.waitForFunction(() =>
    document.body.textContent.includes('已应用'),
  );
  assert.ok(
    await page.evaluate(() =>
      document
        .querySelector('main section')
        .textContent.includes('整理活动报名与物品信息'),
    ),
  );
  await click('撤销这次修改');
  await page.waitForFunction(() =>
    document.body.textContent.includes('已撤销'),
  );
  assert.ok(
    await page.evaluate(() =>
      document
        .querySelector('main section')
        .textContent.includes('整理报名同学提交'),
    ),
  );
  await click('这段还能再精简一点吗？');
  await page.waitForFunction(
    () => document.querySelectorAll('article').length === 2,
  );
  assert.equal(requests[1].task.id, requests[0].task.id);
  assert.equal(requests[1].turns.length, 1);
  assert.equal(requests[1].turns[0].text, requests[0].text);
  assert.equal(requests[1].turns[0].proposals[0].factChecked, undefined);
  assert.equal(requests[1].turns[0].direct, undefined);
  await click('保留原文');
  await page.reload({ waitUntil: 'networkidle0' });
  assert.equal(calls, 2);
  assert.ok(
    await page.evaluate(() => document.body.textContent.includes('已保留原文')),
  );
  await page.screenshot({ path: out + '/history.png', fullPage: true });
  await page.setViewport({ width: 1100, height: 800 });
  await page.screenshot({ path: out + '/narrow.png', fullPage: true });
  assert.ok(await page.evaluate(() => {
    const send = document.querySelector('[aria-label="发送消息"]');
    const rect = send.getBoundingClientRect();
    return send.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
  }), 'send button must remain unobstructed after restoring history');
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    out + '/browser-report.json',
    JSON.stringify(
      {
        passed: true,
        checks: [
          'module handoff',
          'Chinese diff',
          'preview does not mutate',
          'apply',
          'selective undo',
          'followup same task',
          'validated local history payload without authority flags',
          'keep original',
          'history no replay',
          '1440 and 1100 layouts',
        ],
        calls,
        errors,
      },
      null,
      2,
    ),
  );
  console.log('PASS: browser interaction checks; artifacts: ' + out);
} finally {
  await browser.close();
}
