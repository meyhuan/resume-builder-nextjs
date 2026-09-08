// Capture actual UI in a fresh browser with synthetic fixtures only.
// No real account, extension installation, recruitment website, or database writes.
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import puppeteer from "puppeteer";

const origin = "http://localhost:3000";
const output = "public/images/extension-guide";
const bundle = resolve("extension/.output/chrome-mv3");
await mkdir(output, { recursive: true });
const browser = await puppeteer.launch({
  headless: true,
  args: ["--lang=zh-CN"],
});
const shots = {};
async function capture(page, id, clip, targets) {
  const hotspots = [];
  for (const target of targets) {
    const bounds = await target.handle.boundingBox();
    assert.ok(bounds);
    hotspots.push({
      label: target.label,
      x: ((bounds.x - clip.x) / clip.width) * 100,
      y: ((bounds.y - clip.y) / clip.height) * 100,
      width: (bounds.width / clip.width) * 100,
      height: (bounds.height / clip.height) * 100,
    });
  }
  await page.screenshot({ path: `${output}/${id}.png`, clip });
  shots[id] = {
    src: `/images/extension-guide/${id}.png`,
    width: clip.width,
    height: clip.height,
    hotspots,
  };
}
async function byText(page, selector, text) {
  const handle = await page.evaluateHandle(
    ({ selector, text }) =>
      [...document.querySelectorAll(selector)].find(
        (n) => n.textContent.trim() === text,
      ),
    { selector, text },
  );
  assert.ok(handle.asElement(), text);
  return handle.asElement();
}
try {
  // Built-in browser page, empty disposable profile; no user's settings are touched.
  const chrome = await browser.newPage();
  await chrome.setViewport({ width: 1100, height: 700 });
  await chrome.goto("chrome://extensions/");
  const toolbar = await chrome.evaluateHandle(() =>
    document
      .querySelector("extensions-manager")
      .shadowRoot.querySelector("extensions-toolbar"),
  );
  const dev = await toolbar.evaluateHandle((n) =>
    n.shadowRoot.querySelector("#devMode"),
  );
  await dev.asElement().click();
  await chrome.waitForFunction(() =>
    document
      .querySelector("extensions-manager")
      .shadowRoot.querySelector("extensions-toolbar")
      .shadowRoot.querySelector("#devDrawer")
      .hasAttribute("expanded"),
  );
  const load = await toolbar.evaluateHandle((n) =>
    n.shadowRoot.querySelector("#loadUnpacked"),
  );
  await chrome.waitForFunction(
    () =>
      getComputedStyle(
        document
          .querySelector("extensions-manager")
          .shadowRoot.querySelector("extensions-toolbar")
          .shadowRoot.querySelector("#buttonStrip"),
      ).top === "0px",
  );
  await capture(
    chrome,
    "chrome-install",
    { x: 0, y: 0, width: 1100, height: 114 },
    [
      { handle: dev.asElement(), label: "开启开发者模式" },
      { handle: load.asElement(), label: "点击加载已解压的扩展程序" },
    ],
  );

  const profile = await browser.newPage();
  await profile.setViewport({ width: 1380, height: 1040 });
  await profile.setCookie({
    name: "auth_uid",
    value: "synthetic-guide-only",
    url: origin,
  });
  await profile.setRequestInterception(true);
  profile.on("request", (request) => {
    const url = new URL(request.url());
    const reply = (data) =>
      void request.respond({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    if (url.origin !== origin) return void request.abort();
    if (url.pathname === "/next-api/extension/authorizations") return reply([]);
    if (url.pathname === "/next-api/application-profile")
      return reply({
        profile: {
          version: 1,
          personal: {
            fullName: "张同学（演示）",
            englishName: "",
            gender: "",
            birthDate: "",
            maritalStatus: "",
            healthStatus: "",
            height: "",
            weight: "",
            photoUrl: "",
          },
          contact: {},
          identity: {},
          jobPreference: {},
          education: [],
          experiences: [],
          projects: [],
          campus: [],
          abilities: {},
          links: {},
          emergencyContact: {},
          familyMembers: [],
          commonAnswers: [],
        },
        defaultResumeId: "demo",
        resumes: [{ id: "demo", title: "演示简历 · 产品经理" }],
      });
    if (/^\/(next-api|api)\//.test(url.pathname))
      return reply({ code: 200, data: null });
    void request.continue();
  });
  await profile.goto(`${origin}/dashboard/application-profile`, {
    waitUntil: "networkidle2",
  });
  await profile.waitForSelector('[aria-label="默认简历"]');
  const content = await profile.$("div.mx-auto.max-w-5xl");
  const box = await content.boundingBox();
  await capture(
    profile,
    "profile-setup",
    {
      x: Math.floor(box.x - 8),
      y: Math.floor(box.y - 8),
      width: Math.ceil(box.width + 16),
      height: 710,
    },
    [
      {
        handle: await profile.$('[aria-label="默认简历"]'),
        label: "选择要使用的简历",
      },
      {
        handle: await byText(profile, "button", "从简历补充空缺"),
        label: "把简历内容补到网申资料",
      },
      {
        handle: await byText(profile, "button", "保存资料"),
        label: "手动补充后保存资料",
      },
    ],
  );

  // Render the actual compiled sidepanel with a fixture message transport.
  // This does not install an extension, accept privacy terms, or connect an account.
  const panel = await browser.newPage();
  await panel.setViewport({ width: 460, height: 520 });
  await panel.evaluateOnNewDocument(() => {
    const event = { addListener() {}, removeListener() {} };
    globalThis.browser = {
      runtime: {
        id: "screenshot-fixture",
        getURL: (path) => new URL(path, location.origin).href,
        sendMessage: async ({ type }) =>
          type === "analytics-track"
            ? null
            : {
                connected: true,
                onboardingAccepted: true,
                autoConnectEnabled: true,
                hasProfile: true,
                connectionIssue: null,
                awaitingLogin: false,
                submitDetected: false,
                application: null,
                page: {
                  tabId: 1,
                  url: "https://careers.example.invalid/resume",
                },
              },
      },
      tabs: { onActivated: event, onUpdated: event },
    };
  });
  await panel.setRequestInterception(true);
  panel.on("request", (request) => {
    void (async () => {
      const url = new URL(request.url());
      if (url.origin !== origin) return request.abort();
      const file = resolve(bundle, `.${decodeURIComponent(url.pathname)}`);
      if (!file.startsWith(bundle + sep)) return request.abort();
      try {
        const body = await readFile(file);
        const contentType =
          {
            ".html": "text/html",
            ".js": "text/javascript",
            ".css": "text/css",
            ".png": "image/png",
          }[extname(file)] || "application/octet-stream";
        await request.respond({ status: 200, contentType, body });
      } catch {
        await request.respond({ status: 404 });
      }
    })();
  });
  const errors = [];
  panel.on("pageerror", (error) => errors.push(error.message));
  await panel.goto(`${origin}/sidepanel.html`, { waitUntil: "networkidle2" });
  await panel.waitForSelector(".statusRow");
  assert.deepEqual(errors, []);
  await capture(panel, "plugin-fill", { x: 0, y: 0, width: 460, height: 380 }, [
    { handle: await panel.$(".statusRow"), label: "先确认已连接智简简历" },
    {
      handle: await byText(panel, "button", "一键填写此页面"),
      label: "点击填写，完成后核对结果",
    },
  ]);
  await writeFile(
    "src/features/extension-guide/screenshots.json",
    JSON.stringify(shots, null, 2) + "\n",
  );
  console.log(
    "PASS: 3 actual UI screenshots captured with synthetic data; no account or database writes.",
  );
} finally {
  await browser.close();
}
