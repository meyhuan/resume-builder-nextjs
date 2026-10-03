import puppeteer from 'puppeteer';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const base = process.env.AI_TEST_BASE || 'http://localhost:3127';
const out = 'test-artifacts/unified-ai-stream';
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 960 });
page.setDefaultTimeout(30000);
const report = {
  fixture:
    'Synthetic, manually controlled streaming response; no real account writes',
  checks: [],
  errors: [],
};
page.on('pageerror', (error) => report.errors.push(error.message));
await page.setRequestInterception(true);
page.on('request', (request) => {
  if (
    request.url().startsWith(base + '/next-api/') ||
    request.url().endsWith('/analytics/events')
  ) {
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
  } else if (
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
    let controller;
    const encoder = new TextEncoder();
    window.__aiStream = {
      cancelled: false,
      emit: (event) =>
        controller.enqueue(
          encoder.encode(
            JSON.stringify({ requestId: body.requestId, ...event }) + '\n',
          ),
        ),
      finish: () => {
        const block = body.resumeData.sections
          .flatMap((s) => s.blocks)
          .find((b) => b.id === body.task.blockId);
        window.__aiStream.emit({
          type: 'result',
          turn: {
            requestId: body.requestId,
            text: body.text,
            answer: '事实核对完成，请查看修改建议。',
            questions: [],
            proposals: [
              {
                action: 'updateBlock',
                blockId: block.id,
                html: '<p>整理报名物品信息，核对领取时间和联系方式；协助完成登记与发放；活动结束后整理未领取清单，交给负责人。</p>',
                before: JSON.stringify(block),
                targetLabel: body.task.label,
                factChecked: true,
              },
            ],
            followups: ['请再精简一点'],
            direct: false,
            charged: true,
            feature: body.task.feature,
          },
        });
        controller.close();
      },
    };
    return new Response(
      new ReadableStream({
        start(c) {
          controller = c;
        },
        cancel() {
          window.__aiStream.cancelled = true;
        },
      }),
      { headers: { 'Content-Type': 'application/x-ndjson' } },
    );
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
const emit = (event) =>
  page.evaluate((value) => window.__aiStream.emit(value), event);
try {
  await page.goto(base + '/dev/assistant-lab', {
    waitUntil: 'networkidle0',
    timeout: 120000,
  });
  await click('AI帮我写');
  await click('根据已有信息，帮我写这段经历');
  await page.waitForFunction(() => window.__aiRequests.length === 1);
  assert.equal(
    await page.evaluate(() => window.__aiRequests[0].task.feature),
    'generate',
  );
  await emit({ type: 'progress', stage: 'generating' });
  await emit({
    type: 'preview',
    text: '整理报名物品信息，核对领取时间和联系方式。',
  });
  await page.waitForFunction(() =>
    document
      .querySelector('[aria-label="生成中的草稿"]')
      ?.textContent.includes('整理报名物品信息'),
  );
  assert.equal(
    await page.evaluate(() =>
      [...document.querySelectorAll('button')].some(
        (b) => b.textContent.trim() === '应用这一处',
      ),
    ),
    false,
  );
  const original = await page.$eval(
    'main section',
    (element) => element.textContent,
  );
  assert.ok(original.includes('整理报名同学提交'));
  await page.screenshot({ path: out + '/streaming.png', fullPage: true });
  await emit({
    type: 'preview',
    text: '整理报名物品信息，核对领取时间和联系方式。\n协助完成登记与发放，活动结束后整理未领取清单。',
  });
  await emit({ type: 'progress', stage: 'checking' });
  await page.waitForFunction(() =>
    document.querySelector('[role="status"]')?.textContent.includes('核对事实'),
  );
  report.checks.push(
    'AI帮我写 displays growing drafts and real processing stages before final result; original is preserved; no apply button during preview',
  );
  await page.setViewport({ width: 1100, height: 900 });
  await page.screenshot({ path: out + '/narrow.png', fullPage: true });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  report.checks.push('1100px layout has no page overflow');
  await page.evaluate(() => window.__aiStream.finish());
  await page.waitForFunction(() =>
    [...document.querySelectorAll('button')].some(
      (b) => b.textContent.trim() === '应用这一处',
    ),
  );
  assert.equal(await page.$('[aria-label="生成中的草稿"]'), null);
  assert.equal(
    await page.$eval('main section', (element) => element.textContent),
    original,
  );
  await click('应用这一处');
  await page.waitForFunction(() =>
    document
      .querySelector('main section')
      .textContent.includes('整理报名物品信息'),
  );
  await click('撤销这次修改');
  await page.waitForFunction(() =>
    document
      .querySelector('main section')
      .textContent.includes('整理报名同学提交'),
  );
  await page.screenshot({ path: out + '/checked.png', fullPage: true });
  report.checks.push('checked final result enables manual apply and undo');
  await page.type('[aria-label="向 AI 描述修改需求"]', '再精简一点');
  await page.click('[aria-label="发送消息"]');
  await page.waitForFunction(() => window.__aiRequests.length === 2);
  await emit({ type: 'preview', text: '未完成的临时草稿' });
  await page.waitForSelector('[aria-label="生成中的草稿"]');
  await page.click('[title="停止生成"]');
  await page.waitForSelector('[role="alert"]');
  assert.equal(await page.$('[aria-label="生成中的草稿"]'), null);
  assert.equal(await page.evaluate(() => window.__aiStream.cancelled), true);
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForFunction(() =>
    document.body.textContent.includes('事实核对完成'),
  );
  assert.equal(
    await page.evaluate(() =>
      document.body.textContent.includes('未完成的临时草稿'),
    ),
    false,
  );
  assert.equal(await page.evaluate(() => window.__aiRequests.length), 0);
  report.checks.push(
    'stop cancels the open stream; preview is discarded and never restored; refresh never resends the request',
  );
  assert.deepEqual(report.errors, []);
  fs.writeFileSync(out + '/report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
