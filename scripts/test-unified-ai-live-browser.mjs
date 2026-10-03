import fs from 'node:fs';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
if (process.env.AI_TEST_ENV_FILE)
  process.loadEnvFile(process.env.AI_TEST_ENV_FILE);
assert.ok(
  process.env.AUTOMATION_LOGIN_USERNAME &&
    process.env.AUTOMATION_LOGIN_PASSWORD,
  'A configured automation test account is required',
);
const base = process.env.AI_TEST_BASE || 'http://localhost:3128';
const out = 'test-artifacts/unified-ai-release';
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });
page.setDefaultTimeout(90000);
const report = { checks: [], errors: [], cleaned: false };
let resumeId;
const api = async (path, method = 'GET', body) =>
  page.evaluate(
    async ({ path, method, body }) => {
      const r = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: r.status, data: await r.json() };
    },
    { path, method, body },
  );
try {
  await page.goto(base + '/login', { waitUntil: 'domcontentloaded' });
  const auth = await api('/next-api/auth/automation-login', 'POST', {
    username: process.env.AUTOMATION_LOGIN_USERNAME,
    password: process.env.AUTOMATION_LOGIN_PASSWORD,
  });
  assert.equal(auth.status, 200, 'configured test login must succeed');
  report.checks.push('real automation login');
  await page.evaluate((user) => {
    localStorage.setItem('token', user.wxId);
    localStorage.setItem(
      'auth-storage',
      JSON.stringify({
        state: {
          token: user.wxId,
          userInfo: { id: user.id, name: 'AI验收测试' },
        },
        version: 0,
      }),
    );
  }, auth.data.user);
  const before = await api('/next-api/quota');
  assert.equal(before.status, 200);
  const q0 = before.data.aiPolishSection;
  report.vip = q0.isVip;
  const clarify = await api('/next-api/ai/chat/task', 'POST', {
    task: {
      id: crypto.randomUUID(),
      resumeId: crypto.randomUUID(),
      feature: 'chat',
      label: '整份简历',
      entry: 'assistant',
    },
    requestId: crypto.randomUUID(),
    text: '我不知道怎么写，请先问我需要哪些真实信息。',
    turns: [],
    resumeData: { name: '虚构验收', sections: [] },
  });
  assert.equal(clarify.status, 200);
  assert.equal(clarify.data.turn.charged, false);
  assert.ok(clarify.data.turn.questions.length);
  assert.equal(clarify.data.turn.proposals.length, 0);
  const afterClarify = await api('/next-api/quota');
  for (const key of Object.keys(before.data))
    assert.equal(
      afterClarify.data[key].used,
      before.data[key].used,
      'clarification is free',
    );
  report.checks.push('real clarification does not consume any quota');
  const original =
    '整理报名同学提交的物品信息，核对领取时间与联系方式；活动当天协助登记和发放，结束后整理未领取物品清单，交给活动负责人。';
  const content = {
    id: crypto.randomUUID(),
    name: 'AI发布验收（虚构）',
    sections: [
      {
        id: 'campus',
        columns: 1,
        title: '在校经历',
        blocks: [
          {
            id: 'campus-activity',
            type: 'campus',
            organization: '校园旧物交换活动',
            position: '志愿者',
            startDate: '2025.10',
            endDate: '2025.11',
            contentHtml: `<p>${original}</p>`,
          },
        ],
      },
    ],
  };
  const created = await api('/next-api/resumes', 'POST', {
    title: 'AI自动验收临时简历-' + Date.now(),
    content,
    template: 'simple',
  });
  assert.equal(created.status, 200, 'create synthetic resume');
  resumeId = created.data.id;
  fs.writeFileSync(out + '/cleanup.json', JSON.stringify({ resumeId }));
  await page.goto(base + '/editor/' + resumeId, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-ai-block-id="campus-activity"]');
  await page.hover('[data-ai-block-id="campus-activity"]');
  await page.waitForSelector('button[title="AI润色"]');
  await page.evaluate(() =>
    document.querySelector('button[title="AI润色"]').click(),
  );
  await page.waitForSelector('[data-testid="unified-assistant"]');
  assert.ok(
    await page.evaluate(() =>
      document
        .querySelector('[data-testid="unified-assistant"]')
        .textContent.includes('校园旧物交换活动'),
    ),
    'module target handoff',
  );
  report.checks.push('real editor module handoff');
  const responsePromise = page.waitForResponse(
    (r) => r.url().endsWith('/next-api/ai/chat/task'),
    { timeout: 180000 },
  );
  await page.type(
    'textarea[aria-label="向 AI 描述修改需求"]',
    '把“活动当天协助登记和发放”改为“活动当天协助完成物品登记与发放”，其余原文不变。先给我预览。',
  );
  await page.click('[aria-label="发送消息"]');
  const response = await responsePromise;
  assert.equal(response.status(), 200, 'real model API');
  const result = await response.json();
  assert.equal(result.turn.direct, false);
  assert.ok(
    result.turn.followups.length >= 2,
    'relevant next-question choices',
  );
  assert.doesNotMatch(result.turn.followups.join(''), /主导|统筹|独立承担|精通|虚构|伪造/);
  assert.ok(result.turn.proposals.length > 0, 'preview expected');
  await page.waitForFunction(() =>
    document.body.textContent.includes('应用这一处'),
  );
  assert.ok(
    await page.$eval('[data-ai-block-id="campus-activity"]', (el) =>
      el.textContent.includes('活动当天协助登记和发放'),
    ),
  );
  report.checks.push('real model preview preserves original');
  await page.screenshot({ path: out + '/preview.png', fullPage: true });
  const click = async (label) =>
    page.evaluate(
      (t) =>
        [...document.querySelectorAll('button')]
          .find((b) => b.textContent.trim() === t)
          ?.click(),
      label,
    );
  await click('应用这一处');
  await page.waitForFunction(() =>
    document
      .querySelector('[data-ai-block-id="campus-activity"]')
      .textContent.includes('协助完成物品登记与发放'),
  );
  report.checks.push('apply');
  await click('撤销这次修改');
  await page.waitForFunction(() =>
    document
      .querySelector('[data-ai-block-id="campus-activity"]')
      .textContent.includes('活动当天协助登记和发放'),
  );
  report.checks.push('undo');
  const after = await api('/next-api/quota');
  assert.equal(after.status, 200);
  const q1 = after.data.aiPolishSection;
  assert.equal(q1.used, q0.used + (q0.isVip ? 0 : 1));
  report.checks.push(
    q0.isVip ? 'VIP no free balance charge' : 'real quota charged exactly once',
  );
  report.passed = true;
} catch (e) {
  report.passed = false;
  report.errors.push(e.message);
} finally {
  if (resumeId) {
    const cleanup = await api('/next-api/resumes/' + resumeId, 'DELETE');
    report.cleaned = cleanup.status === 200;
  }
  await page
    .screenshot({ path: out + '/final.png', fullPage: true })
    .catch(() => {});
  fs.writeFileSync(out + '/report.json', JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
if (!report.passed || !report.cleaned) process.exitCode = 1;
