// Capture real compiled UI with explicitly synthetic state. All requests are intercepted;
// no real account, browser profile, permission grant, recruitment submission or API write.
import assert from 'node:assert/strict';
import { readFile, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import puppeteer from 'puppeteer';

const output = resolve('extension/.output/store/assets');
const bundle = resolve('extension/.output/store/chrome/chrome-mv3');
const origin = 'https://store-assets.example.invalid';
const fixture = await readFile('public/extension-review.html', 'utf8');
await mkdir(output, { recursive: true });
const browser = await puppeteer.launch({ headless: true, args: ['--lang=zh-CN'] });
const files = [];
try {
  for (const state of ['ready', 'result', 'permission']) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
    const errors = [];
    const blocked = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluateOnNewDocument((state) => {
      const event = { addListener() {}, removeListener() {} };
      const status = {
        connected: true, onboardingAccepted: true, autoConnectEnabled: true,
        hasProfile: true, connectionIssue: null, awaitingLogin: false,
        submitDetected: false, application: null,
        page: state === 'permission' ? null : { tabId: 1, url: 'https://careers.example.invalid/resume' },
        pageIssue: state === 'permission' ? 'site_access_required' : null,
      };
      globalThis.browser = {
        runtime: {
          id: 'synthetic-screenshot-only',
          getURL: path => new URL(path, location.origin).href,
          sendMessage: async ({ type }) => {
            if (type === 'analytics-track') return null;
            if (type === 'fill') {
              const doc = parent.document.querySelector('#form').contentDocument;
              doc.querySelector('[name=email]').value = 'review@example.com';
              doc.querySelector('[name=phone]').value = '13800000000';
              doc.querySelector('[name=gender]').value = '女';
              doc.querySelector('[name=school]').value = '示例大学';
              doc.querySelector('[name=major]').value = '计算机科学与技术';
              // This is a fixture for visual capture, not an engine success-rate test.
              return { filled: 5, alreadyFilled: 1, missingProfile: ['自我评价'],
                missingProfileCount: 1, failed: [], unmatched: [], failedCount: 0,
                unmatchedCount: 0, detectedFieldCount: 7, contextualFieldCount: 7 };
            }
            return status;
          },
        },
        permissions: { request: async () => true },
        tabs: { onActivated: event, onUpdated: event },
      };
    }, state);
    await page.setRequestInterception(true);
    const captions = {
      ready: ['资料准备好，点击填写', '在网页旁操作，填写后自行核对'],
      result: ['填写结果，看得清楚', '区分已填写、已有内容与待补资料'],
      permission: ['不能填写，也有下一步', '网站权限不足时显示原因与恢复入口'],
    };
    page.on('request', request => {
      void (async () => {
        const url = new URL(request.url());
        if (url.origin !== origin) { blocked.push(request.url()); return request.abort(); }
        if (url.pathname === '/') return request.respond({ contentType: 'text/html', body: `<!doctype html><html lang="zh-CN"><meta charset="UTF-8"><style>*{box-sizing:border-box}body{margin:0;font-family:system-ui,'Microsoft YaHei',sans-serif;color:#0f172a;background:#f8fafc}header{height:112px;padding:20px 32px;border-bottom:1px solid #e2e8f0;background:white;display:flex;align-items:center;justify-content:space-between}h1{font-size:28px;margin:0 0 4px}p{margin:0;color:#64748b}.demo{font-size:13px;color:#7c3aed}main{display:grid;grid-template-columns:800px 480px;height:688px}iframe{width:100%;height:100%;border:0}#panel{border-left:1px solid #e2e8f0}</style><header><div><h1>${captions[state][0]}</h1><p>${captions[state][1]}</p></div><div class="demo">智简网申助手<br>虚构资料 · 界面状态演示</div></header><main><iframe id="form" title="虚构测试表单" src="/form.html"></iframe><iframe id="panel" title="真实插件界面" src="/sidepanel.html"></iframe></main></html>` });
        if (url.pathname === '/form.html') return request.respond({ contentType: 'text/html', body: fixture });
        const file = resolve(bundle, `.${decodeURIComponent(url.pathname)}`);
        if (!file.startsWith(bundle + sep)) return request.abort();
        try {
          const body = await readFile(file);
          return request.respond({ contentType: ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' })[extname(file)] || 'application/octet-stream', body });
        } catch { return request.respond({ status: 404 }); }
      })();
    });
    await page.goto(origin, { waitUntil: 'networkidle0' });
    const panel = await (await page.$('#panel')).contentFrame();
    await panel.waitForSelector('.statusRow');
    if (state === 'result') {
      await panel.click('button.primary');
      await panel.waitForSelector('.metrics');
      await panel.$eval('.metrics', el => el.closest('section').scrollIntoView({ block: 'end' }));
    }
    if (state === 'permission') {
      assert.match(await panel.$eval('.pageAvailability', el => el.textContent), /授权并重新检测/);
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(blocked, [], '截图不应发起外部请求');
    const filename = `${state}-1280x800.png`;
    await page.screenshot({ path: resolve(output, filename) });
    files.push(filename);
    await page.close();
  }
  // A code-rendered promotional tile using the existing brand icon, not an edited screenshot.
  const tile = await browser.newPage();
  await tile.setViewport({ width: 440, height: 280, deviceScaleFactor: 1 });
  const logo = (await readFile(resolve(bundle, 'icon/128.png'))).toString('base64');
  await tile.setContent(`<html lang="zh-CN"><meta charset="UTF-8"><style>*{box-sizing:border-box}body{margin:0;padding:32px;background:#f5f3ff;color:#0f172a;font-family:system-ui,'Microsoft YaHei',sans-serif}header{display:flex;gap:14px;align-items:center;font-size:21px;font-weight:700}img{width:48px;height:48px}h1{font-size:30px;line-height:1.4;margin:24px 0 12px}p{color:#64748b;font-size:15px;margin:0}</style><header><img src="data:image/png;base64,${logo}">智简网申助手</header><h1>少填重复信息<br>专注下一次机会</h1><p>复用网申资料 · 填写后自行核对</p></html>`);
  await tile.screenshot({ path: resolve(output, 'promo-440x280.png') });
  await copyFile(resolve(bundle, 'icon/128.png'), resolve(output, 'icon-128.png'));
  files.push('promo-440x280.png', 'icon-128.png');
  await writeFile(resolve(output, 'assets.json'), JSON.stringify({
    files, source: 'Chrome-target compiled sidepanel + synthetic transport and ordinary HTML fixture',
    disclosure: 'UI demonstration only; not an end-to-end fill or Edge browser compatibility test.',
  }, null, 2));
  console.log('PASS: 3 screenshots, promotional tile and icon; synthetic fixtures only; no real requests.');
} finally { await browser.close(); }
