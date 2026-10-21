import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// Browser tests mock the paid AI endpoint; no provider calls or login secrets.
const base = process.env.STORY_BASE_URL || 'http://127.0.0.1:3000';
const out = path.resolve('outputs/story-sharing-ui/sage-release-v3');
const downloads = path.join(out, 'downloads', String(Date.now()));
await fs.mkdir(downloads, { recursive: true });
const browser = await puppeteer.launch({ headless: true });
const report = [];
try {
  await browser.defaultBrowserContext().overridePermissions(base, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write']);
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let status = 200;
  let apiError = '';
  const requests = [];
  const note = { title: '我的简历整理体验', body: '最近在准备求职，我重新整理了自己的简历。选择了更适合阅读的版式以后，经历之间的层次清楚了一些。内容还是需要自己核对，这次先分享我实际用下来的感受。', tags: ['简历修改', '求职经验'], isAiGenerated: true };
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/next-api/xhs-note/fixed-story') {
      requests.push(JSON.parse(request.postData()));
      void request.respond({ status, contentType: 'application/json', body: JSON.stringify(status === 200 ? note : { error: apiError }) });
    } else void request.continue();
  });
  const click = async text => {
    await page.waitForFunction(t => [...document.querySelectorAll('button')].some(el => el.textContent.trim() === t && !el.disabled), {}, text);
    const handle = await page.evaluateHandle(t => [...document.querySelectorAll('button')].find(el => el.textContent.trim() === t), text);
    await handle.asElement().click();
    await handle.dispose();
  };
  const images = async () => {
    await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
    assert(await page.$$eval('img', els => els.length > 0 && els.every(el => el.naturalWidth >= 1000 && Math.abs(el.naturalWidth / el.naturalHeight - .75) < .05 && el.src.includes('/sage-v3/'))));
  };
  const generate = '✨ 一键生成我的分享笔记';
  await page.goto(`${base}/m/share-story?platform=desktop`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(el => el.textContent === '选好了，写感受' && !el.disabled));
  for (const width of [320, 375, 414, 768]) {
    await page.setViewport({ width, height: 950, deviceScaleFactor: 1 });
    await images();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: path.join(out, `h5-${width}.png`), fullPage: true });
    report.push(`responsive ${width}: pass`);
  }
  await page.setViewport({ width: 375, height: 950, deviceScaleFactor: 1 });
  await page.click('button[aria-label="查看第 1 张大图"]');
  await page.waitForSelector('dialog[open]');
  await page.keyboard.press('Escape');
  await page.waitForSelector('dialog:not([open])');
  await page.click('button[aria-label="预览第 3 张"]');
  await page.waitForFunction(() => document.querySelector('button[aria-label="预览第 3 张"]')?.getAttribute('aria-pressed') === 'true');
  report.push('lightbox and carousel: pass');
  for (const platform of ['手机 / 小程序', '电脑网页版']) {
    await click(platform);
    for (const feature of ['简历模板', '内容编辑', 'AI 润色']) {
      await page.evaluate(t => [...document.querySelectorAll('button')].find(el => el.querySelector('strong')?.textContent === t).click(), feature);
      for (const variant of ['方案 A', '方案 B']) {
        await click(variant);
        await images();
        assert((await page.$$eval('img', els => els.map(el => el.src))).every(url => url.includes(platform === '电脑网页版' ? 'desktop' : 'mobile')));
        report.push(`${platform}/${feature}/${variant}: pass`);
      }
    }
  }
  await click('手机 / 小程序');
  await page.evaluate(() => [...document.querySelectorAll('button')].find(el => el.querySelector('strong')?.textContent === '简历模板').click());
  await page.evaluate(() => [...document.querySelectorAll('button')].find(el => el.textContent === '设为封面').click());
  await click('选好了，写感受');
  assert(await page.$eval('input[type=checkbox]', el => el.checked));
  assert(await page.$$eval('button', (els, text) => els.find(el => el.textContent.trim() === text).disabled, generate));
  await page.click('input[name=reason]');
  await page.click('input[name=feeling]');
  await page.type('input[type=text]', '前端开发');
  await page.type('textarea', '重新整理了我的项目经历');
  const firstSrc = await page.$eval('img', el => el.getAttribute('src'));
  for (const [code, message] of [[401, '请先登录，再生成分享笔记。'], [429, '今天的 15 次生成额度已用完，明天可以继续。'], [502, 'AI 生成失败，请稍后重试。填写内容和已有正文已保留。']]) {
    status = code; apiError = message;
    await click(generate);
    await page.waitForFunction(text => document.querySelector('[role=alert]')?.textContent === text, {}, message);
    assert.equal(await page.$eval('h1', el => el.textContent), '说说你的真实感受');
    assert.equal(await page.$eval('textarea', el => el.value), '重新整理了我的项目经历');
  }
  report.push('default confirmation, validation, 401/429/502 and preserved input: pass');
  status = 200;
  await click(generate);
  await page.waitForFunction(() => document.querySelector('h1')?.textContent === '检查一下，就能分享');
  assert.equal(await page.$eval('textarea', el => el.value), note.body);
  assert.equal(requests.at(-1).role, '前端开发');
  assert.equal(requests.at(-1).confirmed, true);
  assert(await page.$eval('input[type=checkbox]', el => el.checked));
  await page.$eval('textarea', el => el.focus());
  await page.keyboard.press('End');
  await page.keyboard.type(' 我会继续核对。');
  const editedBody = await page.$eval('textarea', el => el.value);
  status = 502; apiError = 'AI 生成失败，请稍后重试。填写内容和已有正文已保留。';
  await click('换个写法 · 重新生成');
  await page.waitForSelector('[role=alert]');
  assert.equal(await page.$eval('textarea', el => el.value), editedBody);
  await click('复制正文与话题标签');
  assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n'), `${editedBody}\n\n#简历修改 #求职经验`);
  const cdp = await page.createCDPSession();
  await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
  await click('保存第 1 张');
  await page.waitForFunction(() => document.querySelector('[role=status]')?.textContent.includes('已发起下载'));
  let file;
  for (let n = 0; n < 100; n++) {
    file = (await fs.readdir(downloads)).find(f => f.endsWith('.png'));
    if (file) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(file);
  const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  assert.equal(hash(await fs.readFile(path.join(downloads, file))), hash(await fs.readFile(`public${firstSrc}`)));
  await page.screenshot({ path: path.join(out, 'h5-draft.png'), fullPage: true });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await click('选好了，写感受');
  assert(await page.$eval('input[type=checkbox]', el => el.checked));
  assert.equal(await page.$eval('img', el => el.getAttribute('src')), firstSrc);
  const before = requests.length;
  await click('继续查看我的分享笔记');
  await page.waitForSelector('textarea');
  assert.equal(await page.$eval('textarea', el => el.value), editedBody);
  assert.equal(requests.length, before);
  report.push('AI draft, default review, failed regeneration preservation, exact clipboard, original-byte download, restored draft without paid regeneration: pass');
  await page.goto(`${base}/m/share-story?source=mini&platform=desktop`, { waitUntil: 'domcontentloaded' });
  await images();
  assert((await page.$$eval('img', els => els.map(el => el.src))).every(src => src.includes('mobile')));
  assert.equal(await page.$('[aria-label="实际使用端"]'), null);
  assert.deepEqual(errors, []);
  report.push('mini platform lock and no browser exceptions: pass');
} finally { await browser.close(); }
await fs.writeFile(path.join(out, 'e2e-report.json'), JSON.stringify({ ai: 'mocked; no paid provider calls', checks: report }, null, 2));
console.log(report.join('\n'));
