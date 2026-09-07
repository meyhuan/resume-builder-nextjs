import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import puppeteer from "puppeteer";
import { PrismaClient } from "@prisma/client";

const expectedHost = process.argv[2];
assert.ok(expectedHost, "必须显式指定测试数据库");
assert.equal(new URL(process.env.DATABASE_URL).hostname, expectedHost);
const base = "http://localhost:3000";
const tag = `dashboard-browser-qa-${randomUUID()}`;
const prisma = new PrismaClient();
let browser;
let page;
let created = false;
const errors = [];
let failure = null;
let dismissNextDialog = false;
const requests = [];
const screenshotDir = "test-artifacts/application-pages";
const timeout = 30000;
async function clickText(text, scope = "body") {
  const h = await page.evaluateHandle(
    (text, scope) =>
      [...document.querySelectorAll(`${scope} button`)].find((n) => {
        const label = n.innerText.replace(/\s+/g, "");
        const expected = text.replace(/\s+/g, "");
        return (
          (label === expected || label.replace(/\d+$/, "") === expected) &&
          n.getClientRects().length
        );
      }),
    text,
    scope,
  );
  assert.ok(h.asElement(), `未找到按钮：${text}`);
  await h.evaluate(node=>node.scrollIntoView({block:'center',behavior:'instant'}));
  await page.waitForFunction(node=>{
    if(node.disabled) return false;
    const rect=node.getBoundingClientRect();
    const top=document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2);
    return top===node || node.contains(top);
  },{timeout},h);
  await h.asElement().click();
  await h.dispose();
}
async function fill(selector, value) {
  const h = await page.waitForSelector(selector, { visible: true, timeout });
  await h.click({ clickCount: 3 });
  await h.press("Backspace");
  await h.type(value);
}
async function waitText(text) {
  await page.waitForFunction(
    (text) => document.body.innerText.includes(text),
    { timeout },
    text,
  );
}
async function responseFor(path, method, action, status = 200) {
  const response = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === path && r.request().method() === method,
    { timeout },
  );
  await action();
  assert.equal((await response).status(), status, path);
}
async function goto(path) {
  await page.goto(base + path, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
}
async function waitForProfileWithRetry() {
  for (let attempt=0;attempt<3;attempt++) {
    await page.waitForFunction(()=>document.getElementById('基本信息-fullName') || document.body.innerText.includes('重新读取资料'),{timeout:20000});
    if(await page.$('#基本信息-fullName')) return;
    console.log('WARN: real profile read failed/timed out; simulating explicit user retry',attempt+1);
    await clickText('重新读取资料');
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>resolve())));
  }
  await page.waitForSelector('#基本信息-fullName',{timeout:20000});
}
try {
  await prisma.user.create({
    data: { id: tag, wxId: tag, name: "独立浏览器测试用户" },
  });
  created = true;
  const resume = await prisma.resume.create({
    data: {
      userId: tag,
      title: "合成测试简历",
      content: {
        id: tag,
        name: "简历来源姓名",
        baseInfo: { phone: "13800000000", email: "qa@example.com" },
        sections: [
          {
            id: "s1",
            title: "教育经历",
            columns: 1,
            blocks: [
              {
                id: "e1",
                type: "education",
                school: "合成测试大学",
                major: "计算机",
                degree: "本科",
                startDate: "2022-09",
                endDate: "2026-06",
              },
            ],
          },
        ],
      },
    },
  });
  browser = await puppeteer.launch({ headless: true });
  page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.setCookie({
    name: "auth_uid",
    value: tag,
    url: base,
    httpOnly: true,
    sameSite: "Lax",
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("dialog", (dialog) => {
    if (dismissNextDialog) {
      dismissNextDialog = false;
      void dialog.dismiss();
    } else void dialog.accept();
  });
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const u = new URL(request.url());
    if (u.origin !== base) return void request.abort();
    if (u.pathname.startsWith("/api/"))
      return void request.respond({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ code: 200, data: null }),
      });
    requests.push({ path: u.pathname, method: request.method() });
    if (
      failure &&
      u.pathname === failure.path &&
      request.method() === failure.method
    ) {
      const current = failure;
      failure = null;
      return void (current.status
        ? request.respond({
            status: current.status,
            contentType: "application/json",
            body: '{"error":"synthetic failure"}',
          })
        : request.abort("internetdisconnected"));
    }
    void request.continue();
  });
  // Real profile API/DB, only auxiliary Java integrations are stubbed above.
  failure = { path: "/next-api/application-profile", method: "GET" };
  await goto("/dashboard/application-profile");
  await waitText("重新读取资料");
  assert.equal(
    await page.$("#基本信息-fullName"),
    null,
    "读取失败不应显示可保存的空表单",
  );
  await clickText("重新读取资料");
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>resolve())));
  await waitForProfileWithRetry();
  await fill("#基本信息-fullName", "用户手动姓名");
  dismissNextDialog = true;
  await page.click('a[href="/dashboard/applications"]');
  assert.ok(
    page.url().endsWith("/dashboard/application-profile"),
    "取消离开后仍发生跳转",
  );
  assert.equal(dismissNextDialog, false, "站内跳转未提示未保存修改");
  await page.select("select", resume.id);
  const syncCount = () =>
    requests.filter((r) => r.path.endsWith("/application-profile/sync")).length;
  const beforeSync = syncCount();
  await clickText("从简历补充空缺");
  await waitText("请先保存当前修改");
  assert.equal(syncCount(), beforeSync, "未保存时不应同步覆盖编辑");
  failure = { path: "/next-api/application-profile", method: "PUT" };
  await clickText("保存资料");
  await waitText("尚未确认操作结果");
  assert.equal(
    await page.$eval("#基本信息-fullName", (n) => n.value),
    "用户手动姓名",
  );
  await page.waitForFunction(() =>
    [...document.querySelectorAll("button")].some(
      (n) => n.innerText === "保存资料" && !n.disabled,
    ),
  );
  await responseFor("/next-api/application-profile", "PUT", () =>
    clickText("保存资料"),
  );
  await waitText("网申资料已保存");
  await responseFor("/next-api/application-profile/sync", "POST", () =>
    clickText("从简历补充空缺"),
  );
  await waitText("已从简历补充空缺信息");
  assert.equal(
    await page.$eval("#基本信息-fullName", (n) => n.value),
    "用户手动姓名",
  );
  assert.equal(
    await page.$eval("#联系方式-phone", (n) => n.value),
    "13800000000",
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForProfileWithRetry();
  assert.equal(
    await page.$eval("#基本信息-fullName", (n) => n.value),
    "用户手动姓名",
  );
  const token = randomBytes(48).toString("base64url");
  await prisma.extensionAuthorization.create({
    data: {
      userId: tag,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      scopes: ["application-profile:read"],
      expiresAt: new Date(Date.now() + 600000),
    },
  });
  const extension = await fetch(base + "/next-api/extension/profile", {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(timeout),
  });
  assert.equal(extension.status, 200);
  assert.equal(
    (await extension.json()).profile.personal.fullName,
    "用户手动姓名",
  );
  const stored = await prisma.applicationProfile.findUnique({
    where: { userId: tag },
  });
  assert.ok(!stored.encryptedPayload.includes("用户手动姓名"));
  console.log(
    "PASS: load failure retry; unsaved sync protected; offline save retains input; save/sync/refresh and extension read use real encrypted test DB",
  );

  await fill("#联系方式-currentCity", "北京");
  const list = await page.waitForSelector('[role="listbox"]', {
    visible: true,
    timeout,
  });
  const inputBox = await (await page.$("#联系方式-currentCity")).boundingBox();
  const listBox = await list.boundingBox();
  assert.ok(
    listBox.y >= inputBox.y + inputBox.height - 2,
    "输入建议未出现在下方",
  );
  await page.keyboard.press("Escape");
  await page.click('[id="教育经历-0-startDate"]');
  await waitText("本月");
  const calendarText = await page.$eval(
    "[data-radix-popper-content-wrapper]",
    (n) => n.innerText,
  );
  assert.ok(!/January|February|Jan\b|Clear|This month/.test(calendarText));
  await clickText("本月");
  await responseFor("/next-api/application-profile", "PUT", () =>
    clickText("保存资料"),
  );
  await mkdir(screenshotDir, { recursive: true });
  await page.screenshot({
    path: `${screenshotDir}/profile-desktop.png`,
    fullPage: true,
  });
  console.log(
    "PASS: suggestions open below input; Chinese month picker selectable; changed values saved",
  );

  failure = { path: "/next-api/applications", method: "GET" };
  await goto("/dashboard/applications");
  await waitText("重新读取投递记录");
  await clickText("重新读取投递记录");
  await waitText("添加第一条投递");
  await clickText("添加投递");
  await page.waitForSelector('[role="dialog"] input', { visible: true });
  await fill('[role="dialog"] label:nth-child(1) input', "合成测试公司");
  await fill('[role="dialog"] label:nth-child(2) input', "浏览器测试岗位");
  failure = { path: "/next-api/applications", method: "POST" };
  await clickText("创建记录");
  await waitText("尚未确认操作结果");
  await page.waitForFunction(() =>
    [...document.querySelectorAll("button")].some(
      (n) => n.innerText === "创建记录" && !n.disabled,
    ),
  );
  assert.equal(
    await page.$eval(
      '[role="dialog"] label:nth-child(1) input',
      (n) => n.value,
    ),
    "合成测试公司",
  );
  await responseFor("/next-api/applications", "POST", () =>
    clickText("创建记录"),
  );
  await page.waitForSelector('[role="dialog"] textarea', { visible: true });
  await page.keyboard.press("Escape");
  await clickText("待完成");
  await waitText("正在查看：待完成投递");
  await clickText("待完成");
  await page.waitForFunction(
    () => !document.body.innerText.includes("正在查看："),
  );
  const application = await prisma.jobApplication.findFirst({
    where: { userId: tag },
  });
  assert.ok(application);
  assert.equal(await prisma.jobApplication.count({where:{userId:tag}}),1,'创建重试产生了重复记录');
  failure = {
    path: `/next-api/applications/${application.id}`,
    method: "PATCH",
  };
  await clickText("确认已投递");
  await waitText("尚未确认操作结果");
  assert.equal(
    (await prisma.jobApplication.findUnique({ where: { id: application.id } }))
      .status,
    "DRAFT",
  );
  assert.ok(
    await page.evaluate(() =>
      [...document.querySelectorAll("article")].some((n) =>
        n.innerText.includes("待投递"),
      ),
    ),
  );
  await responseFor(`/next-api/applications/${application.id}`, "PATCH", () =>
    clickText("确认已投递"),
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitText("查看全部");
  await clickText("查看全部");
  await waitText("浏览器测试岗位");
  await page.click("article button");
  await page.waitForSelector('[role="dialog"] textarea', { visible: true });
  await clickText("选择下一步日期和时间");
  await page.waitForSelector('[aria-label="小时"]', { visible: true });
  assert.ok(
    !/January|February|Sunday|AM|PM/.test(
      await page.$eval(
        "[data-radix-popper-content-wrapper]",
        (n) => n.innerText,
      ),
    ),
  );
  await clickText("现在");
  await page.select('[aria-label="小时"]', "13");
  await page.select('[aria-label="分钟"]', "30");
  await page.screenshot({ path: `${screenshotDir}/chinese-datetime.png` });
  await clickText("完成");
  await fill('[role="dialog"] textarea', "合成测试备注，刷新后应保留");
  await responseFor(`/next-api/applications/${application.id}`, "PATCH", () =>
    clickText("保存修改"),
  );
  assert.equal(
    (await prisma.jobApplication.findUnique({ where: { id: application.id } }))
      .note,
    "合成测试备注，刷新后应保留",
  );
  assert.ok(
    (await prisma.jobApplication.findUnique({ where: { id: application.id } }))
      .nextActionAt,
  );
  await page.screenshot({
    path: `${screenshotDir}/applications-desktop.png`,
    fullPage: true,
  });
  console.log(
    "PASS: applications retry; offline create retains input; attention filter toggles; failed status write not shown as success; status/notes persist",
  );
  await page.setViewport({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "投递管理移动端横向溢出",
  );
  await page.screenshot({
    path: `${screenshotDir}/applications-mobile.png`,
    fullPage: true,
  });
  await goto("/dashboard/application-profile");
  await waitForProfileWithRetry();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "网申资料移动端横向溢出",
  );
  await page.screenshot({
    path: `${screenshotDir}/profile-mobile.png`,
    fullPage: true,
  });
  await page.screenshot({path:`${screenshotDir}/profile-mobile-viewport.png`});
  await fill("#基本信息-englishName", "Synthetic QA");
  failure = {
    path: "/next-api/application-profile",
    method: "PUT",
    status: 401,
  };
  await clickText("保存资料");
  await waitText("登录已失效");
  assert.equal(
    await page.$eval("#基本信息-englishName", (n) => n.value),
    "Synthetic QA",
  );
  await responseFor("/next-api/application-profile", "PUT", () =>
    clickText("保存资料"),
  );
  const auth = await prisma.extensionAuthorization.findFirst({where:{userId:tag}});
  assert.ok(auth);
  await responseFor(`/next-api/extension/authorizations/${auth.id}`,"DELETE",()=>clickText("撤销"));
  await waitText("插件授权已撤销");
  const revokedRead=await fetch(base+'/next-api/extension/profile',{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(timeout)});
  assert.equal(revokedRead.status,401,'网页撤销后插件仍能读取资料');
  console.log('PASS: revoke authorization through profile UI denies subsequent extension profile read');
  await goto("/dashboard/applications");
  await waitText("查看全部");
  await clickText("查看全部");
  await waitText("浏览器测试岗位");
  await page.click("article button");
  await page.waitForSelector('[role="dialog"] textarea', { visible: true });
  await clickText("删除记录");
  await fill('[aria-label="输入公司名称确认删除"]', "合成测试公司");
  failure = {
    path: `/next-api/applications/${application.id}`,
    method: "DELETE",
  };
  await clickText("确认删除");
  await waitText("尚未确认操作结果");
  assert.ok(
    await prisma.jobApplication.findUnique({ where: { id: application.id } }),
  );
  await page.waitForFunction(() =>
    [...document.querySelectorAll("button")].some(
      (n) => n.innerText === "确认删除" && !n.disabled,
    ),
  );
  await responseFor(`/next-api/applications/${application.id}`, "DELETE", () =>
    clickText("确认删除"),
  );
  assert.equal(
    await prisma.jobApplication.findUnique({ where: { id: application.id } }),
    null,
  );
  console.log(
    "PASS: Chinese date/time selection persists; injected 401 retains edits; failed delete retains record and retry deletes it",
  );
  assert.deepEqual(errors, [], "浏览器未处理异常");
  console.log("PASS: mobile widths and no unhandled browser exceptions");
} catch (error) {
  if (page) {
    await mkdir(screenshotDir, { recursive: true });
    await page
      .screenshot({ path: `${screenshotDir}/failure.png`, fullPage: true })
      .catch(() => {});
    console.log("BROWSER ERRORS:", errors);
    console.log("LAST REQUESTS:",requests.filter(r=>r.path.startsWith('/next-api/')).slice(-8));
    await page.screenshot({path:`${screenshotDir}/failure-viewport.png`}).catch(()=>{});
  }
  console.error("FAIL:", error.name, error.message.slice(-1200));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (created) {
    assert.ok(tag.startsWith("dashboard-browser-qa-"));
    await prisma.resume.deleteMany({ where: { userId: tag } });
    await prisma.user.delete({ where: { id: tag } });
    console.log(
      "CLEANUP: only this run's synthetic user/resume/profile/authorizations/applications removed",
    );
  }
  await prisma.$disconnect();
}
