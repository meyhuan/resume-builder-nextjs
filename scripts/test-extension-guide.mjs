import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import puppeteer from "puppeteer";

const origin = "http://localhost:3000";
const release = JSON.parse(
  await readFile("src/features/extension-guide/release.json", "utf8"),
);
const archive = await fetch(origin + release.href);
assert.equal(archive.status, 200, "下载必须无需登录且返回成功");
const bytes = Buffer.from(await archive.arrayBuffer());
assert.equal(bytes.subarray(0, 4).toString("hex"), "504b0304");
assert.equal(bytes.length, release.size);
assert.equal(createHash("sha256").update(bytes).digest("hex"), release.sha256);
const browser = await puppeteer.launch({ headless: true });
const artifacts = "test-artifacts/extension-guide";
await mkdir(artifacts, { recursive: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let failDownload = true;
  let corruptDownload = false;
  let failScreenshot = false;
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== origin) return void request.abort();
    if (url.pathname.startsWith("/images/extension-guide/") && failScreenshot)
      return void request.respond({ status: 404, body: "Unavailable" });
    if (url.pathname === release.href && failDownload)
      return void request.respond({ status: 503, body: "Unavailable" });
    if (url.pathname === release.href && corruptDownload)
      return void request.respond({ status: 200, body: "corrupt archive" });
    if (/^\/(next-api|api)\//.test(url.pathname))
      return void request.respond({
        status: 200,
        contentType: "application/json",
        body: '{"code":200,"data":null}',
      });
    void request.continue();
  });
  await page.goto(origin + "/extension", { waitUntil: "networkidle2" });
  assert.equal(
    new URL(page.url()).pathname,
    "/extension",
    "指南必须允许未登录访问",
  );
  await page.waitForSelector("#guide-title");
  assert.equal((await page.$$("figure img")).length, 3);
  for (const img of await page.$$("figure img")) {
    await img.evaluate((node) => node.scrollIntoView({ block: "center" }));
    await page.waitForFunction(
      (img) => img.complete && img.naturalWidth > 0,
      {},
      img,
    );
  }
  await page.evaluate(() => scrollTo(0, 0));
  for (const width of [1440, 768, 414, 375, 320]) {
    await page.setViewport({ width, height: 950 });
    await page.waitForFunction(() => document.fonts.status === "loaded");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    assert.equal(overflow, false, `${width}px 横向溢出`);
    await page.screenshot({
      path: `${artifacts}/${width}.png`,
      fullPage: true,
    });
  }
  const zoom = await page.$('button[aria-label="放大查看：找到安装入口"]');
  await zoom.click();
  await page.waitForSelector('[role="dialog"]', { visible: true });
  assert.equal(
    await page.$eval('[role="dialog"] img', (node) => node.naturalWidth),
    1100,
  );
  assert.equal(
    await page.$eval(
      '[role="region"][aria-label="找到安装入口原图"]',
      (node) => node.scrollWidth > node.clientWidth,
    ),
    true,
    "窄屏原图应支持横向滚动",
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({ path: `${artifacts}/zoom-mobile.png` });
  await page.keyboard.press("Escape");
  await page.waitForSelector('[role="dialog"]', { hidden: true });
  await page.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "放大查看：找到安装入口",
  );
  await zoom.click();
  await page.waitForSelector('[role="dialog"]', { visible: true });
  await page.click('button[aria-label="关闭截图"]');
  await page.waitForSelector('[role="dialog"]', { hidden: true });
  await page.setViewport({ width: 1280, height: 900 });
  const clickButton = async (text) => {
    const handle = await page.evaluateHandle(
      (text) =>
        [...document.querySelectorAll("button")].find(
          (button) => button.textContent.trim() === text,
        ),
      text,
    );
    await handle.asElement().click();
    await handle.dispose();
  };
  await clickButton("Edge 浏览器");
  assert.ok(
    await page.$eval("body", (node) =>
      node.textContent.includes("不是 Edge 截图"),
    ),
  );
  assert.equal(
    await page.$eval("code", (node) => node.textContent),
    "edge://extensions/",
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("denied");
        },
      },
    }),
  );
  await clickButton("复制管理页地址");
  await page.waitForFunction(() =>
    document.body.textContent.includes("请选中上方地址手动复制"),
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value) => {
          window.__copied = value;
        },
      },
    }),
  );
  await clickButton("复制管理页地址");
  await page.waitForFunction(() =>
    document.body.textContent.includes("已复制"),
  );
  assert.equal(
    await page.evaluate(() => window.__copied),
    "edge://extensions/",
  );
  await clickButton("下载安装包");
  await page.waitForFunction(() =>
    document.body.textContent.includes("安装包未能下载或校验未通过"),
  );
  failDownload = false;
  corruptDownload = true;
  await clickButton("重新下载安装包");
  await page.waitForFunction(
    () =>
      document.body.textContent.includes("安装包未能下载或校验未通过") &&
      [...document.querySelectorAll("button")].some(
        (button) =>
          button.textContent.trim() === "重新下载安装包" && !button.disabled,
      ),
  );
  corruptDownload = false;
  await clickButton("重新下载安装包");
  await page.waitForFunction(() =>
    document.body.textContent.includes("安装包已准备，请在浏览器下载列表查看"),
  );
  for (const href of [
    "https://aijianli.cn/dashboard/application-profile",
    "https://aijianli.cn/dashboard/applications",
  ]) {
    assert.equal(
      await page.$eval(`a[href="${href}"]`, (node) => node.target),
      "_blank",
    );
  }
  const faq = await page.$("details summary");
  await faq.click();
  assert.equal(await page.$eval("details", (node) => node.open), true);
  failScreenshot = true;
  await page.setCacheEnabled(false);
  await page.reload({ waitUntil: "networkidle2" });
  for (const img of await page.$$("figure img")) {
    await img.evaluate((node) => node.scrollIntoView({ block: "center" }));
  }
  await page.waitForFunction(
    () => [...document.querySelectorAll('figure [role="status"]')].length === 3,
  );
  assert.equal(
    await page.$eval(
      'button[aria-label="放大查看：找到安装入口"]',
      (node) => node.disabled,
    ),
    true,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: public guide + real ZIP SHA256, five responsive widths, 3 screenshots, mobile zoom/scroll/close/focus restore, screenshot failure fallback, Chrome/Edge address, clipboard failure/success, HTTP failure/corrupt archive/retry, new-tab links, FAQ; no database writes",
  );
} finally {
  await browser.close();
}
