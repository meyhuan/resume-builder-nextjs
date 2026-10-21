import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

// Synthetic drafts and intercepted BFF requests only: no paid AI, real notes or VIP grants.
const base = process.env.STORY_BASE_URL || 'http://127.0.0.1:3000';
const out = path.resolve('outputs/xhs-rewards-release');
await fs.mkdir(out, { recursive: true });
const browser = await puppeteer.launch({ headless: true });
const checks = [];
const draft = { title: '我的简历整理体验', body: '最近在准备求职，我重新整理了自己的简历。选择了更适合阅读的版式以后，经历之间的层次清楚了一些。内容还是需要自己核对，这次先分享我实际用下来的感受。', tags: ['简历修改', '求职经验'], pinnedComment: '我用的是智简简历，按自己的经历整理内容。' };
const defaults = { enabled: true, baseDays: 7, tier1Views: 300, tier1Engagement: 30, bonusAfterHours: 48, tier1TotalDays: 30, tier2Views: 1000, tier2TotalDays: 60, maxAwarded: 3, awardedCount: 0, remainingAwards: 3, blocked: false, submissions: [] };
const noteUrl = 'https://www.xiaohongshu.com/explore/0123456789abcdef01234567';
let fixture = structuredClone(defaults), submitError = '这条笔记已经提交过', statusCode = 200;
let statusRequests = 0, submitRequests = 0;
const note = { id: 9, userId: 42, topicKey: '03-desktop-template-a', noteUrl, status: 0, baseDays: 0, bonusDays: 0, grantedDays: 0 };
try {
  await browser.defaultBrowserContext().overridePermissions(base, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write']);
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewport({ width: 375, height: 950 });
  await page.evaluateOnNewDocument(d => localStorage.setItem('zhijian:fixed-story:sage-v3:web:desktop', JSON.stringify({ platform: 'desktop', packId: '03-desktop-template-a', role: '技术/开发', reason: 'update', feeling: 'helpful', extra: '', order: [0,1,2], draft: d })), draft);
  await page.setRequestInterception(true);
  page.on('request', request => {
    const pathname = new URL(request.url()).pathname;
    let payload;
    if (pathname === '/next-api/xhs-note/status') {
      statusRequests++;
      void request.respond({ status: statusCode, contentType: 'application/json', body: JSON.stringify(statusCode === 200 ? { status: 100, data: fixture } : { status: statusCode, error: statusCode === 401 ? '请先登录' : '获取审核状态失败，请稍后重试' }) });
      return;
    }
    if (pathname === '/next-api/xhs-note/submit') {
      submitRequests++;
      const body = JSON.parse(request.postData());
      assert.equal(body.rawText, noteUrl);
      assert.equal(body.userId, undefined);
      if (!submitError) fixture.submissions = [{ ...note }];
      payload = submitError ? { status: 999, error: submitError } : { status: 100, data: 9 };
    } else if (pathname === '/next-api/xhs-note/fixed-story') payload = { error: 'AI disabled during verification' };
    if (payload) void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
    else void request.continue();
  });
  const click = async (p, text) => {
    await p.waitForFunction(t => [...document.querySelectorAll('button')].some(e => e.textContent.trim() === t && !e.disabled), {}, text);
    await p.evaluate(t => [...document.querySelectorAll('button')].find(e => e.textContent.trim() === t).click(), text);
  };
  const open = async () => {
    await page.goto(`${base}/m/share-story?platform=desktop`, { waitUntil: 'domcontentloaded' });
    await click(page, '选好了，写感受'); await click(page, '继续查看我的分享笔记');
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(e => e.textContent === '刷新奖励状态' && !e.disabled));
  };
  const submitButton = () => page.$eval('button[class*="submitActionBtn"]', e => ({ disabled: e.disabled, text: e.textContent }));
  await open();
  await click(page, '复制标题'); assert.equal(await page.evaluate(() => navigator.clipboard.readText()), draft.title);
  await click(page, '复制正文与话题标签'); assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g,'\n'), draft.body+'\n\n#简历修改 #求职经验');
  checks.push('title and body/tags copy exactly');
  for (const width of [320,375,414,768]) {
    await page.setViewport({ width, height: 950 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: path.join(out, `draft-${width}.png`), fullPage: true });
  }
  checks.push('320/375/414/768 widths without document overflow');
  await page.setViewport({ width: 375, height: 950 });
  await click(page, '我已在小红书发布 · 提交链接领 VIP');
  assert.equal(await page.$eval('[role=dialog] textarea', e => document.activeElement === e), true);
  await page.type('[role=dialog] textarea', noteUrl);
  await click(page, '确认提交 · 审核通过领 7 天 VIP');
  await page.waitForFunction(() => document.querySelector('[role=dialog] [role=alert]')?.textContent.includes('这条笔记已经提交过'));
  assert.equal(await page.$eval('[role=dialog] textarea', e => e.value), noteUrl);
  await page.screenshot({ path: path.join(out,'visible-submit-error.png'), fullPage: true });
  await page.keyboard.press('Escape'); await page.waitForSelector('[role=dialog]', { hidden: true });
  checks.push('submission errors visible inside named dialog, draft preserved, autofocus and Escape work');
  submitError = '';
  await click(page, '我已在小红书发布 · 提交链接领 VIP'); await page.type('[role=dialog] textarea', noteUrl);
  await click(page, '确认提交 · 审核通过领 7 天 VIP');
  await page.waitForSelector('[role=dialog]', { hidden: true });
  await page.waitForFunction(() => document.body.innerText.includes('笔记审核中'));
  assert((await submitButton()).disabled); assert.equal(submitRequests, 2);
  checks.push('successful submission closes dialog, fetches pending status and prevents another pending submission');
  fixture.submissions = [{ ...note, status: 1, baseDays: 7, grantedDays: 7 }];
  const before = statusRequests;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForFunction(() => document.body.innerText.includes('已发 7 天 VIP'));
  assert(statusRequests > before);
  checks.push('returning to the page refreshes approval and received reward');
  fixture.submissions = [{ ...note, id: 10, status: 1, baseDays: 7, grantedDays: 7 }, { ...note, status: 2, rejectReason: '请改为公开可见' }];
  await click(page, '刷新奖励状态'); await page.waitForFunction(() => document.body.innerText.includes('请改为公开可见'));
  await click(page, '修改链接重新提交'); assert.equal(await page.$eval('[role=dialog] textarea', e => e.value), noteUrl);
  await page.keyboard.press('Escape'); await page.waitForSelector('[role=dialog]', { hidden: true });
  checks.push('manual refresh displays earlier rejected notes alongside newer approvals and resubmission prefills same note URL');
  fixture = { ...defaults, enabled: false }; await open(); assert((await submitButton()).disabled); assert.match((await submitButton()).text, /活动暂未开放/);
  fixture = { ...defaults, baseDays: 3, tier1TotalDays: 10, tier2TotalDays: 20, tier1Views: 500, tier1Engagement: 50, tier2Views: 2000, bonusAfterHours: 72, maxAwarded: 1, remainingAwards: 1 }; await open();
  assert(await page.evaluate(() => document.body.innerText.includes('送 3 ~ 20 天 VIP') && document.body.innerText.includes('浏览≥500 或 互动≥50') && document.body.innerText.includes('发布满 72 小时')));
  checks.push('disabled campaign blocks submission and custom backend reward rules display correctly');
  fixture = { ...defaults, remainingAwards: 0 }; await open(); assert((await submitButton()).disabled);
  fixture = { ...defaults, blocked: true }; await open(); assert((await submitButton()).disabled);
  checks.push('award cap and revoked eligibility block new submissions');
  statusCode = 401; await open(); assert((await submitButton()).disabled); assert(await page.$eval('[role=alert]', e => e.textContent.includes('请先登录')));
  statusCode = 503; await open(); assert((await submitButton()).disabled);
  statusCode = 200; fixture = structuredClone(defaults); await click(page, '刷新奖励状态');
  await page.waitForFunction(() => !document.querySelector('button[class*="submitActionBtn"]').disabled);
  checks.push('authentication/network failures are visible, fail closed and recover after refresh');

  const admin = await browser.newPage(); await admin.setViewport({ width: 1280, height: 900 });
  admin.on('pageerror', e => errors.push(e.message)); admin.on('dialog', d => void d.accept());
  let adminBonus;
  let adminRules = defaults;
  let adminRow = { ...note, status: 1, baseDays: 7, bonusDays: 0, createdAt: new Date().toISOString(), publishedAt: null };
  await admin.setRequestInterception(true);
  admin.on('request', request => {
    if (new URL(request.url()).pathname !== '/next-api/admin/xhs-notes') { void request.continue(); return; }
    const data = JSON.parse(request.postData()); let payload;
    if (data.action === 'config') payload = adminRules;
    else if (data.action === 'list') payload = [adminRow];
    else if (data.action === 'bonus') { adminBonus = data; adminRow = { ...adminRow, publishedAt: data.publishedAt, bonusDays: 23 }; payload = adminRow; }
    void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 100, data: payload }) });
  });
  await admin.goto(base+'/admin/xhs-notes', { waitUntil: 'domcontentloaded' });
  await admin.type('input[type=password]', 'synthetic-test-password');
  await click(admin, '已通过');
  await admin.waitForSelector('input[type=datetime-local]');
  assert(await admin.$$eval('button', es => es.find(e => /保存数据|补发 \d+ 天/.test(e.textContent))?.disabled));
  const beijing = h => new Date(Date.now() - h*3600000 + 8*3600000).toISOString().slice(0,16);
  const fill = async (selector,value) => { await admin.$eval(selector, (e,v) => { const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(e,v); e.dispatchEvent(new Event('input',{bubbles:true})); },value); };
  await fill('input[type=datetime-local]', beijing(47));
  await fill('input[type=number]', '300');
  assert(await admin.$$eval('button', es => es.find(e => /补发 23 天/.test(e.textContent))?.disabled));
  await fill('input[type=datetime-local]', beijing(49));
  await click(admin, '补发 23 天');
  await admin.waitForFunction(() => document.body.innerText.includes('本次不补发'));
  assert(adminBonus.publishedAt); assert.equal(adminBonus.views,'300');
  await admin.screenshot({ path: path.join(out,'admin-publication-time.png'), fullPage:true });
  adminRules = { ...defaults, baseDays: 3, tier1Views: 500, tier1Engagement: 50, tier1TotalDays: 10, tier2Views: 2000, tier2TotalDays: 20 };
  await click(admin, '刷新');
  await admin.waitForFunction(() => document.body.innerText.includes('规则：通过 3 天；浏览 ≥500'));
  checks.push('admin requires verified Beijing publication time, rejects <48h, sends 23-day top-up for 300 views and displays custom rules');
  assert.deepEqual(errors, []); checks.push('no browser runtime errors');
} finally { await browser.close(); }
await fs.writeFile(path.join(out,'report.json'), JSON.stringify({ scope:'Mock BFF/browser verification; no real rewards or paid AI', checks },null,2));
console.log(checks.join('\n'));
