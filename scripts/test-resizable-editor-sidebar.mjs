// Run against a local development server. All API traffic is mocked.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer';

const origin = process.env.SIDEBAR_TEST_ORIGIN || 'http://127.0.0.1:3107';
const key = 'resume-editor-sidebar-width-v1';
const artifacts = 'test-artifacts/resizable-editor-sidebar';
const browser = await puppeteer.launch({
  headless: true,
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
});
await mkdir(artifacts, { recursive: true });
let currentPage;
try {
  const page = await browser.newPage();
  currentPage = page;
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.error('Browser error:', error.message); });
  page.on('console', message => {
    if (message.type() === 'error' && /hydration|hydrated|server rendered/i.test(message.text())) errors.push(message.text());
  });
  await page.setCookie({ name: 'auth_uid', value: 'sidebar-local-test', url: origin });
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url());
    if (/^\/(next-api|api)\//.test(url.pathname)) {
      return void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data: [], sessions: [] }) });
    }
    if (url.protocol.startsWith('http') && url.origin !== origin) return void request.abort();
    void request.continue();
  });
  const aside = '[data-editor-workspace]';
  const handle = '[data-testid="editor-sidebar-resize-handle"]';
  const width = () => page.$eval(aside, node => Math.round(node.getBoundingClientRect().width));
  const expectWidth = async expected => {
    try {
      await page.waitForFunction((selector, value) =>
        Math.round(document.querySelector(selector).getBoundingClientRect().width) === value, { timeout: 5000 }, aside, expected);
    } catch (error) {
      console.error({ expected, actual: await width(), errors,
        state: await page.$eval(aside, node => ({ style: node.getAttribute('style'), dragging: node.dataset.sidebarResizing, max: node.querySelector('[role="separator"]').getAttribute('aria-valuemax') })) });
      await page.screenshot({ path: artifacts + '/failure.png' });
      throw error;
    }
  };
  const clickText = async (selector, text) => {
    const buttons = await page.$$(selector);
    for (const button of buttons) {
      if ((await button.evaluate(node => node.textContent.trim())) === text) {
        await button.click();
        return;
      }
    }
    throw new Error('Button not found: ' + text);
  };
  const drag = async delta => {
    const box = await (await page.$(handle)).boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    assert.equal(await page.evaluate((x, y) => document.elementFromPoint(x, y)?.closest('[role="separator"]') !== null, x, y), true);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + delta, y, { steps: 10 });
    await page.mouse.up();
    assert.deepEqual(await page.evaluate(() => [document.body.style.cursor, document.body.style.userSelect]), ['', '']);
  };

  await page.setViewport({ width: 1440, height: 900, hasTouch: true });
  await page.goto(origin + '/dev/assistant-lab', { waitUntil: 'networkidle2' });
  await expectWidth(480);
  await clickText(aside + ' nav button', 'AI 助手');
  await drag(-120);
  await expectWidth(600);
  assert.equal(await page.evaluate(key => localStorage.getItem(key), key), '600');
  await page.reload({ waitUntil: 'networkidle2' });
  await expectWidth(600);
  await drag(-1000);
  await expectWidth(640);
  await drag(1000);
  await expectWidth(360);
  const box = await (await page.$(handle)).boundingBox();
  await page.mouse.click(box.x + 4, box.y + box.height / 2, { clickCount: 2 });
  await expectWidth(480);
  await page.focus(handle);
  await page.keyboard.press('ArrowLeft');
  await expectWidth(496);
  await page.keyboard.press('ArrowRight');
  await expectWidth(480);
  const touchBox = await (await page.$(handle)).boundingBox();
  const cdp = await page.createCDPSession();
  const touchX = touchBox.x + 4, touchY = touchBox.y + touchBox.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: touchX, y: touchY }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touchX - 80, y: touchY }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expectWidth(560);
  await cdp.detach();
  await page.keyboard.press('End');
  await expectWidth(640);
  await page.setViewport({ width: 1024, height: 768 });
  await expectWidth(544);
  assert.ok(await page.$eval('[data-editor-canvas]', node => node.getBoundingClientRect().width >= 480));
  await page.setViewport({ width: 1440, height: 900 });
  await expectWidth(640);
  await clickText(aside + ' nav button', 'AI 助手');
  await page.screenshot({ path: artifacts + '/lab-desktop.png' });

  for (const viewportWidth of [390, 320]) {
    await page.setViewport({ width: viewportWidth, height: 844 });
    await expectWidth(viewportWidth);
    assert.equal(await page.$eval(handle, node => getComputedStyle(node).display), 'none');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: artifacts + '/lab-mobile-' + viewportWidth + '.png' });
  }

  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluate(() => {
    localStorage.setItem('auth-storage', JSON.stringify({
      state: { token: 'sidebar-local-test', userInfo: { id: 'sidebar-local-test', name: '测试用户' } },
      version: 0,
    }));
  });
  await page.goto(origin + '/editor/new', { waitUntil: 'networkidle2' });
  await page.waitForFunction(selector =>
    document.querySelector(selector)?.style.getPropertyValue('--editor-sidebar-width') === '640px', {}, aside);
  await page.click('button[title="模块管理"]');
  await page.waitForSelector(aside, { visible: true });
  await expectWidth(640);
  await drag(100);
  await expectWidth(540);
  for (const label of ['AI 助手', '模块', '模板', '样式']) {
    await clickText(aside + ' nav button', label);
    assert.equal(await width(), 540);
  }
  await page.screenshot({ path: artifacts + '/editor-desktop.png' });
  await page.click('button[aria-label="收起工具，返回简历"]');
  await page.waitForSelector(aside, { hidden: true });
  await page.click('button[title="模块管理"]');
  await expectWidth(540);
  await page.setViewport({ width: 390, height: 844 });
  await expectWidth(390);
  assert.equal(await page.$eval(handle, node => getComputedStyle(node).display), 'none');
  assert.equal(await page.$eval('[data-editor-canvas]', node => getComputedStyle(node).display), 'none');
  await page.screenshot({ path: artifacts + '/editor-mobile.png' });
  assert.deepEqual(errors, []);
  console.log('PASS: editor + Assistant Lab; mouse/touch drag, min/max, double-click, keyboard, persisted reload, narrow desktop canvas protection, four panels, close/reopen, mobile 390/320, no hydration errors.');
} catch (error) {
  if (currentPage) {
    await currentPage.screenshot({ path: artifacts + '/failure.png' });
    console.error(await currentPage.$$eval('[data-editor-workspace]', nodes => nodes.map(node => ({
      className: node.className, rect: node.getBoundingClientRect().toJSON(), text: node.textContent.slice(0, 120),
    }))));
  }
  throw error;
} finally {
  await browser.close();
}

