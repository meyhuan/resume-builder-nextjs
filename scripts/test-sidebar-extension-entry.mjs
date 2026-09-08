// Isolated browser and synthetic API responses; no real account/database changes.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer';

const origin = 'http://localhost:3000';
const browser = await puppeteer.launch({headless:true});
const artifacts = 'test-artifacts/sidebar-extension-entry';
await mkdir(artifacts, {recursive:true});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setCookie({name:'auth_uid', value:'synthetic-sidebar-guide', url:origin});
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.origin !== origin) return void request.abort();
    if (/^\/(next-api|api)\//.test(url.pathname)) return void request.respond({status:200,contentType:'application/json',body:url.pathname === '/next-api/applications' ? '[]' : '{"code":200,"data":null}'});
    void request.continue();
  });
  await page.setViewport({width:1280,height:900});
  await page.goto(`${origin}/dashboard/applications`, {waitUntil:'networkidle2'});
  async function verify(root) {
    const link = await root.$('section[aria-label="帮助与反馈"] a[href="/extension"]');
    assert.ok(link, '插件入口应位于帮助区域');
    assert.equal(await root.$('section[aria-label="求职工具"] a[href="/extension"]'), null);
    assert.deepEqual(await root.$$eval('section[aria-label="求职工具"] a', links => links.map(link => link.textContent)), ['我的简历','网申资料','投递管理']);
    assert.equal(await link.evaluate(n => n.target), '_blank');
    assert.ok(await link.evaluate(n => n.rel.includes('noopener')));
    assert.equal(await link.evaluate(n => n.getAttribute('aria-current')), null);
    assert.ok(await link.evaluate(n => n.textContent.includes('插件安装与使用')));
    assert.ok(await link.$('svg.lucide-external-link'), '新标签页提示图标');
    assert.ok(await link.evaluate(n => n.scrollWidth <= n.clientWidth), '入口不能横向溢出');
    await link.evaluate(n => n.scrollIntoView({block:'center'}));
    const rect = await link.boundingBox();
    assert.ok(rect.height >= 44 && rect.y >= 0 && rect.y + rect.height <= (await page.viewport()).height);
    return link;
  }
  for (const height of [900, 480, 320]) {
    await page.setViewport({width:1280,height});
    const sidebar = await page.$('aside[aria-label="工作台侧边栏"]');
    await verify(sidebar);
    const account = await sidebar.$('a[aria-label="查看账户与会员信息"]');
    await account.evaluate(n => n.scrollIntoView({block:'center'}));
    assert.ok(await sidebar.evaluate(n => n.scrollWidth <= n.clientWidth));
    await page.screenshot({path:`${artifacts}/desktop-${height}.png`});
  }
  for (const [width,height] of [[390,844],[320,480]]) {
    await page.setViewport({width,height});
    await page.click('button[aria-label="打开导航菜单"]');
    const drawer = await page.waitForSelector('[role="dialog"]', {visible:true});
    await verify(drawer);
    assert.ok(await drawer.evaluate(n => n.scrollWidth <= n.clientWidth));
    await page.screenshot({path:`${artifacts}/mobile-${width}.png`});
    await page.keyboard.press('Escape');
    await page.waitForSelector('[role="dialog"]', {hidden:true});
  }
  await page.setViewport({width:1280,height:900});
  const sidebar = await page.$('aside[aria-label="工作台侧边栏"]');
  const entry = await verify(sidebar);
  const popupEvent = new Promise(resolve => page.once('popup', resolve));
  await entry.click();
  const popup = await popupEvent;
  await popup.waitForSelector('#guide-title');
  assert.equal(new URL(popup.url()).pathname, '/extension');
  assert.equal(new URL(page.url()).pathname, '/dashboard/applications');
  await popup.close();
  assert.deepEqual(errors, []);
  console.log('PASS: help placement, three primary entries, label/external icon, new tab preserves original page, 44px target, 3 desktop heights and 2 mobile widths with scroll access; no database writes.');
} finally { await browser.close(); }
