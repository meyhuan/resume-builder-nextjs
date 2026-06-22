import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';
import sharp from 'sharp';

const root = process.cwd();
const baseUrl = process.env.SCREENSHOT_BASE_URL || 'http://127.0.0.1:3004';
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const indexPath = path.join(root, 'screenshots/index/screenshot-index.json');

const desktopViewport = { width: 1440, height: 1000, deviceScaleFactor: 1 };

const quotaResponse = {
  aiGenerateResume: { allowed: true, remaining: 99, isVip: true, limit: 999 },
  aiImportSection: { allowed: true, remaining: 99, isVip: true, limit: 999 },
  aiGenerateSection: { allowed: true, remaining: 99, isVip: true, limit: 999 },
  aiPolishSection: { allowed: true, remaining: 99, isVip: true, limit: 999 },
  aiOptimizeResume: { allowed: true, remaining: 99, isVip: true, limit: 999 },
  pdfExport: { allowed: true, remaining: 99, isVip: true, limit: 999 },
};

const fallbackResume = {
  id: 'screenshot-lanzhe-editor-demo',
  name: '张明',
  baseInfo: {
    title: 'AI 产品经理',
    phone: '13800008888',
    email: 'zhangming@example.com',
    gender: '男',
    age: 28,
    location: '上海',
    currentLocation: '上海',
    workStartTime: '2020.07',
    showAvatar: true,
    customFields: [{ label: '优势', value: 'RAG / AI Agent / SaaS' }],
  },
  contactHtml: '<p>13800008888 · zhangming@example.com · 上海 · AI 产品经理</p>',
  jobIntention: {
    position: 'AI 产品经理',
    city: '上海',
    salary: '25K-35K',
    type: '全职',
    industry: '互联网 / SaaS',
    currentStatus: '在职看机会',
  },
  jobIntentionVisible: true,
  sections: [
    {
      id: 'section-education',
      title: '教育经历',
      columns: 1,
      blocks: [{
        id: 'edu-demo-1',
        type: 'education',
        school: '上海交通大学',
        major: '计算机科学与技术',
        degree: '本科',
        startDate: '2016.09',
        endDate: '2020.06',
        courseHtml: '<p>数据结构、产品设计、机器学习、用户研究</p>',
      }],
    },
    {
      id: 'section-experience',
      title: '工作经历',
      columns: 1,
      blocks: [
        {
          id: 'exp-demo-1',
          type: 'experience',
          company: '星河智能科技有限公司',
          position: 'AI 产品经理',
          industry: '互联网 / SaaS',
          startDate: '2022.07',
          endDate: '至今',
          contentHtml:
            '<ul><li>负责企业知识库问答产品从 0 到 1 设计，拆解文档解析、向量检索、答案引用和反馈闭环等核心模块。</li><li>联合算法和后端团队优化召回策略，将高频问题首轮命中率提升至 82%，人工转接率下降 18%。</li><li>搭建模型评测指标体系，覆盖准确率、可引用性、拒答率、响应时延和 Token 成本。</li></ul>',
        },
        {
          id: 'exp-demo-2',
          type: 'experience',
          company: '云舟科技',
          position: '产品经理',
          industry: '企业服务',
          startDate: '2020.07',
          endDate: '2022.06',
          contentHtml:
            '<ul><li>负责销售自动化模块，梳理线索分层、客户标签和跟进提醒流程。</li><li>通过运营看板追踪转化漏斗，推动试用转付费率提升 12%。</li></ul>',
        },
      ],
    },
    {
      id: 'section-project',
      title: '项目经历',
      columns: 1,
      blocks: [{
        id: 'project-demo-1',
        type: 'project',
        name: '销售线索跟进 Agent',
        role: '产品负责人',
        startDate: '2023.03',
        endDate: '2023.12',
        contentHtml:
          '<ul><li>设计线索评分、客户画像补全、跟进话术生成和 CRM 写回流程，使销售首次触达准备时间从 15 分钟降低到 4 分钟。</li><li>沉淀可复用 Prompt 模板和失败兜底策略，支撑运营团队批量复盘。</li></ul>',
      }],
    },
    {
      id: 'section-summary',
      title: '自我评价',
      columns: 1,
      blocks: [{
        id: 'summary-demo-1',
        type: 'text',
        html: '<p>具备 AI 产品从需求拆解、方案设计、模型评测到上线运营的完整经验，能把业务问题转化为可落地的产品功能。</p>',
      }],
    },
    {
      id: 'section-skills',
      title: '相关技能',
      columns: 1,
      blocks: [{
        id: 'skills-demo-1',
        type: 'text',
        html: '<ul><li>产品方法：需求分析、PRD、原型设计、A/B 测试、跨团队协作</li><li>AI 技术理解：RAG、Prompt Engineering、AI Agent、模型评测、向量数据库</li><li>业务指标：命中率、采纳率、转化率、人工接管率、成本分析</li></ul>',
      }],
    },
  ],
};

const overlayCleanupCss = `
  nextjs-portal,
  [data-nextjs-toast],
  [data-sonner-toaster],
  .nextjs-toast,
  .__next-dev-overlay {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
  }
  * { scroll-behavior: auto !important; }
  body { caret-color: transparent; }
`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function absoluteUrl(route) {
  return new URL(route, baseUrl).href;
}

function resolveAsset(relativePath) {
  return path.join(root, relativePath.split('/').join(path.sep));
}

async function ensureDirFor(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function setAuthCookie(page) {
  const uid = process.env.E2E_AUTH_DEFAULT_WX_ID || 'e2e_default_user';
  await page.evaluateOnNewDocument((value) => {
    window.localStorage.setItem('token', value);
    window.localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        token: value,
        userInfo: { id: value, name: '截图演示账号' },
      },
      version: 0,
    }));
  }, uid).catch(() => undefined);
  await page.evaluate((value) => {
    window.localStorage.setItem('token', value);
    window.localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        token: value,
        userInfo: { id: value, name: '截图演示账号' },
      },
      version: 0,
    }));
  }, uid).catch(() => undefined);
  await page.setCookie({
    name: 'auth_uid',
    value: uid,
    url: baseUrl,
    path: '/',
  });
}

async function waitForFonts(page) {
  await page.evaluate(async () => {
    if ('fonts' in document) await document.fonts.ready;
  }).catch(() => undefined);
}

async function cleanupPage(page) {
  await page.addStyleTag({ content: overlayCleanupCss }).catch(() => undefined);
  await page.evaluate(() => {
    for (const selector of [
      'nextjs-portal',
      '[data-nextjs-toast]',
      '[data-sonner-toaster]',
      '.__next-dev-overlay',
      '[data-radix-dialog-overlay]',
    ]) {
      document.querySelectorAll(selector).forEach((node) => node.remove());
    }
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const text = el.textContent || '';
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const area = rect.width * rect.height;
      const viewportArea = window.innerWidth * window.innerHeight;
      const background = style.backgroundColor || '';
      const looksLikeLogin = text.includes('微信扫码登录') || (text.includes('扫码') && text.includes('登录'));
      const isScreenOverlay = style.position === 'fixed' && rect.width > window.innerWidth * 0.8 && rect.height > window.innerHeight * 0.8;
      const hasOverlayPaint =
        background !== 'rgba(0, 0, 0, 0)' &&
        background !== 'transparent' &&
        background !== 'rgba(0,0,0,0)' &&
        background !== '';
      if (
        looksLikeLogin ||
        (isScreenOverlay && hasOverlayPaint) ||
        (style.position === 'fixed' && area > viewportArea * 0.6 && (hasOverlayPaint || Number(style.opacity) < 1))
      ) {
        el.remove();
      }
    }
    document.body.style.pointerEvents = '';
    document.documentElement.style.pointerEvents = '';
  }).catch(() => undefined);
}

async function setupRequestMocks(page) {
  page.on('dialog', async (dialog) => {
    await dialog.accept().catch(() => undefined);
  });
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/next-api/quota')) {
      void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(quotaResponse) });
      return;
    }
    if (url.includes('/next-api/vip/poll')) {
      void request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            isVip: true,
            vipStatus: 'active',
            vipType: 'screenshot',
            vipExpireTime: '2099-12-31T00:00:00.000Z',
          },
        }),
      });
      return;
    }
    void request.continue();
  });
}

async function gotoStable(page, route, waitForText) {
  await page.setViewport(desktopViewport);
  await setAuthCookie(page);
  await page.goto(absoluteUrl(route), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('body', { timeout: 15000 });
  await page.waitForFunction(() => document.readyState !== 'loading', { timeout: 10000 }).catch(() => undefined);
  if (waitForText) {
    await page.waitForFunction((text) => document.body.innerText.includes(text), { timeout: 20000 }, waitForText);
  }
  await sleep(1100);
  await waitForFonts(page);
  await cleanupPage(page);
  await sleep(300);
}

async function ensureLanzheDemoResume(page) {
  await gotoStable(page, '/', null);
  return page.evaluate(async (fallback) => {
    const listResponse = await fetch('/next-api/resumes', { credentials: 'include' });
    if (!listResponse.ok) throw new Error(`resume list failed: ${listResponse.status}`);
    const list = await listResponse.json();
    const existing = Array.isArray(list)
      ? list.find((item) => item.title === '截图演示简历' || item.title === '张明-AI产品经理简历')
      : null;
    if (existing?.id) {
      const detailResponse = await fetch(`/next-api/resumes/${existing.id}`, { credentials: 'include' });
      if (!detailResponse.ok) throw new Error(`resume detail failed: ${detailResponse.status}`);
      const detail = await detailResponse.json();
      const content = detail.content && typeof detail.content === 'object'
        ? detail.content
        : { ...fallback, id: existing.id };
      const updateResponse = await fetch(`/next-api/resumes/${existing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: '截图演示简历',
          template: 'lanzhe',
          content: { ...content, id: existing.id },
        }),
      });
      if (!updateResponse.ok) {
        const message = await updateResponse.text().catch(() => '');
        throw new Error(`resume update failed: ${updateResponse.status} ${message}`);
      }
      return existing.id;
    }
    const createResponse = await fetch('/next-api/resumes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        title: '截图演示简历',
        template: 'lanzhe',
        content: fallback,
      }),
    });
    if (!createResponse.ok) {
      const message = await createResponse.text().catch(() => '');
      throw new Error(`resume create failed: ${createResponse.status} ${message}`);
    }
    const created = await createResponse.json();
    return created.id;
  }, fallbackResume);
}

async function openLanzheEditor(page, resumeId, options = {}) {
  await gotoStable(page, `/editor/${resumeId}`, '模块管理');
  await page.waitForSelector('.lanzhe-header-band', { timeout: 15000 });
  await waitForFonts(page);
  await cleanupPage(page);
  if (options.closeSidebar) {
    await page.evaluate(() => {
      const close = document.querySelector('[aria-label="关闭侧边栏"]');
      if (close instanceof HTMLElement) close.click();
    }).catch(() => undefined);
    await sleep(500);
  }
}

async function clickByText(page, text, options = {}) {
  const clicked = await page.evaluate(({ text: targetText, exact, selector }) => {
    const normalize = (value) => value.replace(/\s+/g, ' ').trim();
    const isVisible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const candidates = Array.from(document.querySelectorAll(selector || 'button, a, [role="button"], label'));
    const target = candidates.find((el) => {
      if (!isVisible(el)) return false;
      const content = normalize(el.textContent || el.getAttribute('aria-label') || '');
      return exact ? content === targetText : content.includes(targetText);
    });
    if (!(target instanceof HTMLElement)) return false;
    target.scrollIntoView({ block: 'center', inline: 'center' });
    target.click();
    return true;
  }, { text, exact: Boolean(options.exact), selector: options.selector });
  if (!clicked) throw new Error(`click target not found: ${text}`);
  await sleep(options.afterWaitMs ?? 650);
}

async function clickSelector(page, selector, options = {}) {
  await page.waitForSelector(selector, { timeout: options.timeout ?? 15000 });
  await page.evaluate((targetSelector) => {
    const node = document.querySelector(targetSelector);
    if (node instanceof HTMLElement) {
      node.scrollIntoView({ block: 'center', inline: 'center' });
      node.click();
    }
  }, selector);
  await sleep(options.afterWaitMs ?? 650);
}

async function scrollPreviewTextIntoView(page, text) {
  await page.evaluate((targetText) => {
    const target = Array.from(document.querySelectorAll('.lanzhe-section-title, .lanzhe-rich, span, div'))
      .find((node) => (node.textContent || '').includes(targetText));
    target?.scrollIntoView({ block: 'center', inline: 'nearest' });
  }, text);
  await sleep(500);
}

async function getRectByText(page, text, options = {}) {
  return page.evaluate(({ targetText, selector, exact, closestSelector }) => {
    const normalize = (value) => value.replace(/\s+/g, ' ').trim();
    const isVisible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const candidates = Array.from(document.querySelectorAll(selector || 'body *'));
    const match = candidates.find((el) => {
      if (!isVisible(el)) return false;
      const content = normalize(el.textContent || el.getAttribute('aria-label') || '');
      return exact ? content === targetText : content.includes(targetText);
    });
    if (!match) return null;
    const node = closestSelector ? match.closest(closestSelector) || match : match;
    const rect = node.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }, {
    targetText: text,
    selector: options.selector,
    exact: Boolean(options.exact),
    closestSelector: options.closestSelector,
  });
}

async function hoverText(page, text, options = {}) {
  const rect = await getRectByText(page, text, options);
  if (!rect) throw new Error(`hover target not found: ${text}`);
  await page.mouse.move(rect.x + rect.width * 0.45, rect.y + Math.min(rect.height * 0.45, 28));
  await sleep(options.afterWaitMs ?? 650);
  return rect;
}

async function clickText(page, text, options = {}) {
  const rect = await getRectByText(page, text, options);
  if (!rect) throw new Error(`click text target not found: ${text}`);
  await page.mouse.click(rect.x + Math.min(rect.width * 0.45, 180), rect.y + Math.min(rect.height * 0.45, 24));
  await sleep(options.afterWaitMs ?? 650);
  return rect;
}

async function captureImage(page, relativePath) {
  await cleanupPage(page);
  await waitForFonts(page);
  await sleep(200);
  const absolutePath = resolveAsset(relativePath);
  await ensureDirFor(absolutePath);
  await page.screenshot({ path: absolutePath });
  const metadata = await sharp(absolutePath).metadata();
  return {
    file: relativePath,
    actual_size: {
      width: metadata.width ?? null,
      height: metadata.height ?? null,
    },
  };
}

function rawEntry(id, overrides) {
  return {
    id,
    file: `screenshots/raw/desktop/${id}.png`,
    viewport: { width: desktopViewport.width, height: desktopViewport.height },
    template: 'lanzhe',
    asset_group: 'lanzhe-editor-core',
    best_for: ['蓝折编辑核心卖点', '编辑场景专项图', '小红书正文配图'],
    not_for: [],
    annotation_suggestions: [],
    ...overrides,
  };
}

async function captureRawEntry(page, entry) {
  const image = await captureImage(page, entry.file);
  return { ...entry, ...image };
}

function processEntry(id, file, overrides) {
  return {
    id,
    file,
    asset_type: 'process-comparison',
    template: 'lanzhe',
    asset_group: 'lanzhe-editor-core',
    best_for: ['蓝折编辑过程图', '小红书封面或正文图', '编辑卖点说明'],
    not_for: [],
    annotation_suggestions: [],
    ...overrides,
  };
}

async function clickLayoutSettingsTab(page) {
  await page.waitForSelector('[role="tab"][aria-controls*="content-settings"]', { timeout: 10000 });
  await page.focus('[role="tab"][aria-controls*="content-settings"]');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.body.innerText.includes('文字排版'), { timeout: 10000 });
  await sleep(500);
}

async function ensureLayoutPanel(page) {
  const hasLayoutPanel = await page.evaluate(() => (
    document.body.innerText.includes('切换模板') &&
    document.body.innerText.includes('排版设置')
  )).catch(() => false);
  if (!hasLayoutPanel) {
    await clickByText(page, '排版美化', { selector: 'button' });
  }
  await page.waitForFunction(() => (
    document.body.innerText.includes('切换模板') &&
    document.body.innerText.includes('排版设置')
  ), { timeout: 10000 });
  await sleep(300);
}

async function captureLanzheEditorStates(page, resumeId) {
  const entries = [];

  await openLanzheEditor(page, resumeId, { closeSidebar: true });
  entries.push(await captureRawEntry(page, rawEntry('editor-lanzhe-workbench-overview-desktop', {
    page: '蓝折模板 PC 编辑器工作台',
    summary: '展示蓝折模板在 PC 编辑器中的完整工作台，左侧是实时简历预览，顶部提供模块管理、排版美化、AI 一键优化、保存和导出入口。',
    visible_elements: ['蓝折折纸页眉', '实时简历画布', '模块管理', '排版美化', 'AI一键优化', '保存', '预览/导出'],
    features: ['所见即所得编辑', '蓝折模板预览', '编辑到导出闭环', 'PC 专业编辑工作台'],
    scenarios: ['想展示核心编辑器', '说明不是表单填完再预览', '强调编辑和排版同步发生'],
    visual_notes: '蓝折页眉视觉强，适合作为编辑器总览或正文第一张功能图。',
    annotation_suggestions: ['标出顶部三大编辑入口', '突出蓝折模板实时预览'],
  })));

  await openLanzheEditor(page, resumeId, { closeSidebar: true });
  await clickText(page, '张明', { selector: '.lanzhe-header-band h1, .lanzhe-header-band h1 *', afterWaitMs: 700 });
  await page.waitForSelector('.lanzhe-header-band input', { timeout: 10000 });
  entries.push(await captureRawEntry(page, rawEntry('editor-lanzhe-name-inline-editing-desktop', {
    page: '蓝折模板姓名原位编辑',
    summary: '展示点击蓝折页眉中的姓名后，姓名直接在原位置变成输入框，适合说明短文本字段可以在简历画布上直接修改。',
    visible_elements: ['蓝折页眉', '姓名输入框', '联系方式', '头像'],
    features: ['姓名原位编辑', '点击即改', '短文本字段编辑'],
    scenarios: ['用户想快速改姓名或标题', '展示简历画布可直接编辑', '强调不是静态模板'],
    visual_notes: '这是“点击哪里改哪里”的细节证明图。',
    annotation_suggestions: ['圈出姓名输入框', '标注点击姓名直接改'],
  })));

  await openLanzheEditor(page, resumeId, { closeSidebar: true });
  await page.evaluate(() => {
    const header = document.querySelector('.lanzhe-header-band');
    if (!(header instanceof HTMLElement)) return;
    const rect = header.getBoundingClientRect();
    header.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + rect.width * 0.68,
      clientY: rect.top + rect.height * 0.72,
    }));
  });
  await page.waitForSelector('input#name', { timeout: 10000 });
  entries.push(await captureRawEntry(page, rawEntry('editor-lanzhe-base-info-modal-desktop', {
    page: '蓝折模板点击页眉编辑个人信息',
    summary: '展示在蓝折模板页眉区域点击后弹出个人信息编辑弹窗，姓名、岗位、电话、邮箱、城市和自定义字段可以直接修改。',
    visible_elements: ['蓝折页眉', '个人信息弹窗', '姓名字段', '岗位字段', '电话邮箱字段', '保存按钮'],
    features: ['点击页眉编辑', '基础信息弹窗', '自定义字段', '实时简历内容维护'],
    scenarios: ['用户想修改姓名电话邮箱', '说明简历不是静态图片', '展示点击哪里改哪里'],
    visual_notes: '弹窗和蓝折页眉同时出现，适合表达“点简历区域就能编辑”。',
    annotation_suggestions: ['箭头指向页眉区域', '圈出姓名/岗位输入框'],
  })));

  await page.keyboard.press('Escape').catch(() => undefined);
  await sleep(400);

  await openLanzheEditor(page, resumeId, { closeSidebar: true });
  await clickText(page, '求职意向', { selector: '.lanzhe-section-title, section, section *', afterWaitMs: 900 });
  await page.waitForFunction(() => document.body.innerText.includes('编辑求职意向') || document.body.innerText.includes('意向岗位'), { timeout: 10000 });
  entries.push(await captureRawEntry(page, rawEntry('editor-lanzhe-job-intention-modal-desktop', {
    page: '蓝折模板点击求职意向编辑',
    summary: '展示点击蓝折模板中的求职意向模块后打开结构化编辑弹窗，可修改目标岗位、城市、薪资、类型、行业和当前状态。',
    visible_elements: ['求职意向模块', '编辑求职意向弹窗', '意向岗位', '意向城市', '期望薪资', '保存按钮'],
    features: ['求职目标结构化', '点击模块编辑', '岗位和薪资字段维护'],
    scenarios: ['投递不同岗位前修改目标', '说明简历目标不是写死的', '展示字段化编辑能力'],
    visual_notes: '适合作为“目标岗位可以随时改”的编辑功能图。',
    annotation_suggestions: ['标出意向岗位和薪资字段', '保留蓝折求职意向模块可见'],
  })));

  await page.keyboard.press('Escape').catch(() => undefined);
  await sleep(400);

  await openLanzheEditor(page, resumeId, { closeSidebar: true });
  await scrollPreviewTextIntoView(page, '负责企业知识库');
  entries.push(await captureRawEntry(page, rawEntry('editor-lanzhe-rich-text-before-desktop', {
    page: '蓝折模板富文本正文未编辑状态',
    summary: '展示蓝折模板中的工作经历正文未进入编辑时的展示状态，适合作为点击进入富文本编辑前的对比母图。',
    visible_elements: ['工作经历', '经历正文项目符号', '蓝折模块签条', '简历正文排版'],
    features: ['富文本正文展示', '项目符号排版', '蓝折模块视觉'],
    scenarios: ['说明正文原始展示效果', '做点击编辑前后对比', '展示工作经历排版'],
    visual_notes: '可和富文本编辑激活图组合成过程图。',
  })));

  await clickText(page, '负责企业知识库', { selector: '.lanzhe-rich, .lanzhe-rich *', afterWaitMs: 900 });
  await page.waitForSelector('[contenteditable="true"]', { timeout: 10000 });
  entries.push(await captureRawEntry(page, rawEntry('editor-lanzhe-rich-text-active-desktop', {
    page: '蓝折模板点击正文进入富文本编辑',
    summary: '展示点击工作经历正文后，正文直接进入富文本编辑状态，并出现加粗、斜体、下划线、列表、缩进、撤销和重做工具条。',
    visible_elements: ['可编辑正文', '富文本工具条', '加粗按钮', '列表按钮', '缩进按钮', '撤销重做'],
    features: ['点击即编辑', '富文本编辑', '列表格式', '撤销重做', '正文原位编辑'],
    scenarios: ['用户想直接改经历描述', '需要证明支持富文本', '强调不用跳转表单也能改正文'],
    visual_notes: '这是编辑核心卖点图之一，适合配“点正文就能改”的标注。',
    annotation_suggestions: ['圈出富文本工具条', '标出正文可编辑区域'],
  })));

  await openLanzheEditor(page, resumeId, { closeSidebar: true });
  await scrollPreviewTextIntoView(page, '星河智能科技有限公司');
  await clickSelector(page, '[title="点击编辑公司名称"]', { afterWaitMs: 700 });
  await page.waitForSelector('input[placeholder="公司名称"]', { timeout: 10000 });
  entries.push(await captureRawEntry(page, rawEntry('editor-lanzhe-inline-field-editing-desktop', {
    page: '蓝折模板单行字段原位编辑',
    summary: '展示点击公司名称后，字段在简历原位置变成输入框，适合说明公司名、职位、项目名等短字段可以直接原位修改。',
    visible_elements: ['工作经历', '公司名称输入框', '职位字段', '日期字段', '蓝折模块布局'],
    features: ['单行字段原位编辑', '点击即改', '短字段快速修改'],
    scenarios: ['想快速改公司名或岗位', '强调不是复杂表单', '展示简历内容可直接编辑'],
    visual_notes: '适合和富文本编辑图一起说明“长文本短字段都能点改”。',
    annotation_suggestions: ['圈出蓝色输入框', '标注“公司名直接改”'],
  })));

  await openLanzheEditor(page, resumeId, { closeSidebar: true });
  await scrollPreviewTextIntoView(page, '2022.07');
  const clickedDate = await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll('button'))
      .find((node) => (node.textContent || '').replace(/\s+/g, ' ').trim() === '2022.07');
    if (!(button instanceof HTMLElement)) return false;
    button.scrollIntoView({ block: 'center', inline: 'center' });
    button.click();
    return true;
  });
  if (!clickedDate) throw new Error('date button not found: 2022.07');
  await page.waitForFunction(() => document.body.innerText.includes('7月') && document.body.innerText.includes('2022'), { timeout: 10000 });
  await sleep(700);
  entries.push(await captureRawEntry(page, rawEntry('editor-lanzhe-date-picker-desktop', {
    page: '蓝折模板日期字段选择器',
    summary: '展示点击经历日期后打开年月选择器，用户可以在简历原位置调整工作、教育或项目经历的起止时间。',
    visible_elements: ['经历日期', '年月选择器', '工作经历', '蓝折模块布局'],
    features: ['日期字段编辑', '年月选择器', '经历时间维护'],
    scenarios: ['需要修改经历时间', '说明日期不是普通文本', '展示字段化编辑细节'],
    visual_notes: '适合说明产品有细节级编辑能力。',
    annotation_suggestions: ['标出年月选择器', '箭头指向日期字段'],
  })));

  await openLanzheEditor(page, resumeId, { closeSidebar: true });
  await scrollPreviewTextIntoView(page, '星河智能科技有限公司');
  await hoverText(page, '星河智能科技有限公司', { selector: 'div, span', closestSelector: '.relative.rounded', afterWaitMs: 900 });
  entries.push(await captureRawEntry(page, rawEntry('editor-lanzhe-block-actions-hover-desktop', {
    page: '蓝折模板经历块悬浮操作条',
    summary: '展示鼠标悬浮在工作经历块上后出现的操作条，包括添加经历、AI 润色、AI 帮我写、删除、上移和下移。',
    visible_elements: ['工作经历块', '添加工作经历', 'AI润色', 'AI帮我写', '删除', '上移下移'],
    features: ['块级操作条', '添加经历', 'AI 润色入口', 'AI 帮写入口', '经历排序', '删除经历'],
    scenarios: ['用户想快速管理单条经历', '展示 AI 和编辑结合', '说明编辑动作就在内容旁边'],
    visual_notes: '非常适合作为“编辑器不是单纯表单”的核心卖点图。',
    annotation_suggestions: ['圈出悬浮操作条', '标出 AI 润色和 AI 帮我写'],
  })));

  await clickByText(page, 'AI润色', { selector: 'button', exact: true, afterWaitMs: 900 }).catch(() => undefined);
  if ((await page.evaluate(() => document.body.innerText.includes('AI 润色') || document.body.innerText.includes('求职身份')).catch(() => false))) {
    entries.push(await captureRawEntry(page, rawEntry('editor-lanzhe-block-ai-polish-sheet-desktop', {
      page: '蓝折模板块级 AI 润色面板',
      summary: '展示从经历块悬浮操作条进入 AI 润色面板，用户可以对单个经历块按身份和语气进行优化，而不是只能整份简历一起改。',
      visible_elements: ['AI 润色面板', '求职身份', '原文编辑区', '润色按钮', '经历块背景'],
      features: ['块级 AI 润色', '单段内容优化', '求职身份选择', '原文可编辑'],
      scenarios: ['只想优化某一段经历', '担心整份简历被 AI 改乱', '展示细粒度 AI 编辑'],
      visual_notes: '适合和悬浮操作条图一起讲块级 AI 编辑。',
      annotation_suggestions: ['标出单段润色面板', '强调不是整份黑箱改写'],
    })));
  }

  await openLanzheEditor(page, resumeId, { closeSidebar: true });
  await scrollPreviewTextIntoView(page, '工作经历');
  await hoverText(page, '工作经历', { selector: '.lanzhe-section-title, .lanzhe-section-title *', closestSelector: 'section', afterWaitMs: 900 });
  entries.push(await captureRawEntry(page, rawEntry('editor-lanzhe-section-actions-hover-desktop', {
    page: '蓝折模板模块级悬浮操作',
    summary: '展示鼠标悬浮到工作经历模块后，模块右上角出现拖动、添加和删除按钮，说明整块模块也能直接在简历上管理。',
    visible_elements: ['工作经历模块', '拖动按钮', '添加按钮', '删除按钮', '蓝折签条标题'],
    features: ['模块级拖动', '模块内添加', '模块删除', '可视化结构管理'],
    scenarios: ['想调整模块顺序', '想快速添加同类内容', '展示简历结构可视化编辑'],
    visual_notes: '适合说明“模块不是固定顺序”。',
    annotation_suggestions: ['圈出右上角模块按钮', '箭头指向工作经历标题'],
  })));

  return entries;
}

async function captureLanzhePanelsAndTheme(page, resumeId) {
  const entries = [];

  await openLanzheEditor(page, resumeId);
  await ensureLayoutPanel(page);
  if (!(await page.$('[data-template-id="lanzhe"]'))) {
    await clickByText(page, '切换模板', { selector: 'button', exact: true });
  }
  await page.waitForSelector('[data-template-id="lanzhe"][aria-pressed="true"]', { timeout: 10000 });
  entries.push(await captureRawEntry(page, rawEntry('editor-lanzhe-template-selected-panel-desktop', {
    page: '蓝折模板选中态模板面板',
    summary: '展示排版美化面板中蓝折模板被选中的状态，用户可以在编辑器内查看多款模板缩略图并即时切换。',
    visible_elements: ['切换模板标签', '蓝折模板选中态', '模板缩略图网格', '左侧蓝折预览'],
    features: ['模板切换', '蓝折模板', '模板实时预览', '多模板选择'],
    scenarios: ['强调精美模板能力', '说明选模板不用离开编辑器', '展示当前示例模板来源'],
    visual_notes: '适合作为模板功能的蓝折专项补充图。',
    annotation_suggestions: ['圈出蓝折模板选中态', '保留左侧简历预览'],
  })));

  await clickLayoutSettingsTab(page);
  entries.push(await captureRawEntry(page, rawEntry('editor-lanzhe-layout-settings-desktop', {
    page: '蓝折模板排版设置面板',
    summary: '展示蓝折模板下的排版设置，包括全局字号、一页模式、行高、模块间距和页边距滑杆。',
    visible_elements: ['文字排版', '全局字号', '一页模式', '行高', '模块间距', '页边距', '蓝折简历预览'],
    features: ['字号调整', '一页模式', '行距调整', '模块间距调整', '页边距调整'],
    scenarios: ['内容太多想压缩', '简历太挤想放松', '展示版式精细调节能力'],
    visual_notes: '控制项和蓝折预览同屏，适合说明“模板还能继续微调”。',
    annotation_suggestions: ['标出一页模式和滑杆', '保留左侧预览变化'],
  })));

  await clickByText(page, '一页模式', { selector: 'button', exact: false, afterWaitMs: 1200 });
  entries.push(await captureRawEntry(page, rawEntry('editor-lanzhe-one-page-mode-desktop', {
    page: '蓝折模板一页模式开启',
    summary: '展示蓝折模板开启一页模式后的状态，系统会尝试自动压缩字号、行距和间距，让信息量较多的简历尽量收纳到一页内。',
    visible_elements: ['一页模式开启', '已开启状态', '自动适配提示', '排版滑杆', '蓝折预览'],
    features: ['一页简历适配', '自动压缩排版', '内容容量优化'],
    scenarios: ['海投需要一页版简历', '简历内容太多超页', '用户不想手动调参数'],
    visual_notes: '适合一页模式卖点图。',
    annotation_suggestions: ['圈出开启状态', '标注自动适配一页'],
  })));

  await openLanzheEditor(page, resumeId);
  await ensureLayoutPanel(page);
  await clickLayoutSettingsTab(page);
  await scrollPreviewTextIntoView(page, '色彩风格');
  await page.evaluate(() => {
    const target = Array.from(document.querySelectorAll('aside h4, aside div, aside span'))
      .find((node) => (node.textContent || '').includes('色彩风格'));
    target?.scrollIntoView({ block: 'center', inline: 'nearest' });
  });
  await sleep(500);
  entries.push(await captureRawEntry(page, rawEntry('editor-lanzhe-theme-default-desktop', {
    page: '蓝折模板默认主题色',
    summary: '展示蓝折模板默认蓝色主题状态，作为主题色切换前的母版截图。',
    visible_elements: ['蓝折默认蓝色页眉', '色彩风格设置', '当前颜色', '恢复模板默认色'],
    features: ['模板默认色', '主题色设置', '蓝折视觉风格'],
    scenarios: ['做主题色切换前后对比', '展示蓝折默认设计质感', '说明模板有默认推荐配色'],
    visual_notes: '可和绿色主题应用图组合成前后对比图。',
  })));

  await page.focus('[aria-label="选择主题主色"]');
  await page.keyboard.press('Enter');
  await sleep(400);
  entries.push(await captureRawEntry(page, rawEntry('editor-lanzhe-theme-color-picker-desktop', {
    page: '蓝折模板主题色选择器',
    summary: '展示蓝折模板的主题色选择器，包含颜色预设、自定义颜色入口和模板默认色恢复按钮。',
    visible_elements: ['主题主色', '颜色预设', '自定义颜色', '恢复模板默认色', '蓝折预览'],
    features: ['主题色切换', '颜色预设', '自定义颜色', '恢复默认色'],
    scenarios: ['想根据岗位调整简历气质', '品牌色或行业色匹配', '展示视觉可定制'],
    visual_notes: '颜色选择器视觉明显，适合作为主题切换卖点图。',
    annotation_suggestions: ['圈出颜色预设', '标出当前颜色'],
  })));

  await page.click('[aria-label="选择颜色 #0D9488"]');
  await sleep(900);
  entries.push(await captureRawEntry(page, rawEntry('editor-lanzhe-theme-green-applied-desktop', {
    page: '蓝折模板切换绿色主题后',
    summary: '展示蓝折模板从默认蓝色切换为青绿色主题后的效果，页眉和模块签条主色同步变化。',
    visible_elements: ['青绿色页眉', '青绿色模块签条', '主题色设置', '蓝折简历预览'],
    features: ['主题色应用', '模板视觉同步变化', '个性化风格'],
    scenarios: ['用户想看切换主题后的真实效果', '说明颜色不是只改按钮', '做主题色前后对比'],
    visual_notes: '和默认蓝色图差异明显，适合做小红书过程图。',
    annotation_suggestions: ['标出页眉和模块标题的颜色变化'],
  })));

  return entries;
}

async function captureModuleDrag(page, resumeId) {
  const entries = [];
  await openLanzheEditor(page, resumeId);
  await clickByText(page, '模块管理', { selector: 'button' });
  await sleep(700);
  const before = await captureRawEntry(page, rawEntry('editor-lanzhe-section-manager-before-drag-desktop', {
    page: '蓝折模板模块管理拖动前',
    summary: '展示模块管理面板拖动前的模块顺序，包含个人信息、求职意向、教育经历、工作经历、项目经历等模块。',
    visible_elements: ['模块管理', '照片开关', '求职意向显示', '教育经历', '工作经历', '项目经历', '添加模块'],
    features: ['模块管理', '模块显示控制', '模块拖拽排序', '添加模块'],
    scenarios: ['用户想整理简历结构', '做模块拖动前后对比', '展示结构管理入口'],
    visual_notes: '作为拖动前母图，适合和拖动后组合。',
    annotation_suggestions: ['标出工作经历模块', '圈出添加模块区域'],
  }));
  entries.push(before);

  const rowRect = await getRectByText(page, '工作经历', {
    selector: 'aside span',
    exact: true,
    closestSelector: '[class*="cursor-grab"]',
  });
  if (!rowRect) throw new Error('module row not found: 工作经历');
  await page.mouse.move(rowRect.x + rowRect.width / 2, rowRect.y + rowRect.height / 2);
  await page.mouse.down();
  await page.mouse.move(rowRect.x + rowRect.width / 2, rowRect.y - 74, { steps: 14 });
  await sleep(700);
  const dragging = await captureRawEntry(page, rawEntry('editor-lanzhe-section-manager-dragging-desktop', {
    page: '蓝折模板模块管理拖动中',
    summary: '展示在模块管理面板中拖动工作经历模块时的状态，强调模块顺序可以通过拖拽直接调整。',
    visible_elements: ['模块管理', '工作经历拖动中', '教育经历', '项目经历', '添加模块'],
    features: ['模块拖拽排序', '可视化顺序调整', '结构化编辑'],
    scenarios: ['用户想把重点经历前置', '展示拖拽操作过程', '说明模块顺序不是固定的'],
    visual_notes: '适合做拖拽功能过程图的中间状态。',
    annotation_suggestions: ['标出被拖动模块', '箭头表现上移方向'],
  }));
  entries.push(dragging);

  await page.mouse.up();
  await sleep(900);
  const after = await captureRawEntry(page, rawEntry('editor-lanzhe-section-manager-after-drag-desktop', {
    page: '蓝折模板模块管理拖动后',
    summary: '展示模块拖动释放后的模块管理面板，工作经历被调整到更靠前的位置，用于说明拖拽排序会立即生效。',
    visible_elements: ['模块管理', '工作经历', '教育经历', '项目经历', '更新后的模块顺序'],
    features: ['模块顺序调整', '拖拽后即时生效', '简历结构重排'],
    scenarios: ['想把核心经历放前面', '展示模块排序结果', '做拖动前后对比'],
    visual_notes: '如果搭配拖动前图，能清楚表达模块重排能力。',
    annotation_suggestions: ['标出工作经历新位置', '强调拖拽后即时变化'],
  }));
  entries.push(after);

  return entries;
}

function escapeXml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function renderPanel(inputPath, label, width, height) {
  const labelHeight = 46;
  const background = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" rx="24" fill="#ffffff"/>
      <rect x="0" y="0" width="${width}" height="${labelHeight}" rx="24" fill="#111827"/>
      <text x="24" y="30" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#ffffff">${escapeXml(label)}</text>
    </svg>
  `);
  const image = await sharp(resolveAsset(inputPath))
    .resize(width - 32, height - labelHeight - 32, { fit: 'cover', position: 'top' })
    .png()
    .toBuffer();
  return sharp(background)
    .composite([{ input: image, left: 16, top: labelHeight + 16 }])
    .png()
    .toBuffer();
}

async function makeVerticalProcessCard({ title, subtitle, frames, output }) {
  const width = 1080;
  const height = 1350;
  const headerHeight = 128;
  const gap = 22;
  const panelHeight = Math.floor((height - headerHeight - gap * (frames.length + 1)) / frames.length);
  const panelWidth = 1000;
  const titleSvg = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#f8fafc"/>
          <stop offset="58%" stop-color="#eff6ff"/>
          <stop offset="100%" stop-color="#ecfeff"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <text x="40" y="58" font-family="Arial, sans-serif" font-size="38" font-weight="800" fill="#111827">${escapeXml(title)}</text>
      <text x="42" y="98" font-family="Arial, sans-serif" font-size="22" fill="#475569">${escapeXml(subtitle)}</text>
    </svg>
  `);
  const composites = [];
  for (let i = 0; i < frames.length; i += 1) {
    const panel = await renderPanel(frames[i].file, frames[i].label, panelWidth, panelHeight);
    composites.push({
      input: panel,
      left: 40,
      top: headerHeight + gap + i * (panelHeight + gap),
    });
  }
  const outputPath = resolveAsset(output);
  await ensureDirFor(outputPath);
  await sharp(titleSvg).composite(composites).png().toFile(outputPath);
  const metadata = await sharp(outputPath).metadata();
  return {
    file: output,
    actual_size: {
      width: metadata.width ?? null,
      height: metadata.height ?? null,
    },
  };
}

async function makeProcessEntries(rawEntries) {
  const byId = new Map(rawEntries.map((entry) => [entry.id, entry]));
  const cards = [];

  const richText = await makeVerticalProcessCard({
    title: '点击正文直接编辑',
    subtitle: '从普通展示到富文本工具条，编辑发生在简历原位置',
    frames: [
      { label: '点击前：工作经历正常展示', file: byId.get('editor-lanzhe-rich-text-before-desktop').file },
      { label: '点击后：富文本工具条出现', file: byId.get('editor-lanzhe-rich-text-active-desktop').file },
    ],
    output: 'screenshots/process/process-lanzhe-rich-text-click-to-edit.png',
  });
  cards.push(processEntry('process-lanzhe-rich-text-click-to-edit', richText.file, {
    ...richText,
    page: '蓝折模板点击正文进入富文本编辑过程图',
    summary: '展示工作经历正文从普通展示到点击进入富文本编辑的前后变化，适合表达“点击正文就能改，支持加粗、列表、缩进和撤销重做”。',
    visible_elements: ['点击前工作经历', '点击后富文本编辑器', '富文本工具条', '蓝折模板'],
    features: ['点击即编辑', '富文本工具条', '原位编辑', '工作经历编辑'],
    scenarios: ['用户不知道怎么改经历正文', '推广可视化编辑核心卖点', '强调不是 Word 模板下载'],
    source_files: [
      byId.get('editor-lanzhe-rich-text-before-desktop').file,
      byId.get('editor-lanzhe-rich-text-active-desktop').file,
    ],
    visual_notes: '两段式过程清楚，适合作为编辑卖点笔记的正文图。',
    annotation_suggestions: ['可加箭头从正文指向工具条', '少量强调“点击即改”'],
  }));

  const moduleDrag = await makeVerticalProcessCard({
    title: '模块顺序拖一下就能换',
    subtitle: '把重点经历前置，不需要复制粘贴重排',
    frames: [
      { label: '拖动前：默认模块顺序', file: byId.get('editor-lanzhe-section-manager-before-drag-desktop').file },
      { label: '拖动中：工作经历上移', file: byId.get('editor-lanzhe-section-manager-dragging-desktop').file },
      { label: '拖动后：顺序即时更新', file: byId.get('editor-lanzhe-section-manager-after-drag-desktop').file },
    ],
    output: 'screenshots/process/process-lanzhe-module-drag-reorder.png',
  });
  cards.push(processEntry('process-lanzhe-module-drag-reorder', moduleDrag.file, {
    ...moduleDrag,
    page: '蓝折模板模块拖拽排序过程图',
    summary: '展示模块管理中从拖动前、拖动中到拖动后的三步变化，说明用户可以把重点模块前置，简历结构不用复制粘贴手动重排。',
    visible_elements: ['模块管理面板', '工作经历模块', '拖动中状态', '拖动后顺序'],
    features: ['模块拖拽排序', '结构化编辑', '重点模块前置', '可视化模块管理'],
    scenarios: ['想把工作经历放在教育经历前', '简历模块顺序不合适', '展示编辑核心卖点'],
    source_files: [
      byId.get('editor-lanzhe-section-manager-before-drag-desktop').file,
      byId.get('editor-lanzhe-section-manager-dragging-desktop').file,
      byId.get('editor-lanzhe-section-manager-after-drag-desktop').file,
    ],
    visual_notes: '三步过程适合小红书解释“拖拽排序”的因果关系。',
    annotation_suggestions: ['可追加上移箭头', '圈出工作经历模块'],
  }));

  const theme = await makeVerticalProcessCard({
    title: '蓝折模板也能换主题色',
    subtitle: '同一份简历，主色变化带来不同视觉气质',
    frames: [
      { label: '切换前：蓝折默认蓝色', file: byId.get('editor-lanzhe-theme-default-desktop').file },
      { label: '切换后：青绿色主题', file: byId.get('editor-lanzhe-theme-green-applied-desktop').file },
    ],
    output: 'screenshots/process/process-lanzhe-theme-color-before-after.png',
  });
  cards.push(processEntry('process-lanzhe-theme-color-before-after', theme.file, {
    ...theme,
    page: '蓝折模板主题色切换前后过程图',
    summary: '展示蓝折模板从默认蓝色切换到青绿色主题后的前后变化，说明主题色会影响页眉、模块签条和整体简历气质。',
    visible_elements: ['蓝折默认主题', '青绿色主题', '主题色设置', '同一份简历内容'],
    features: ['主题色切换', '模板视觉定制', '前后对比', '恢复默认色'],
    scenarios: ['用户想看换色后的真实效果', '需要匹配不同行业风格', '推广主题切换能力'],
    source_files: [
      byId.get('editor-lanzhe-theme-default-desktop').file,
      byId.get('editor-lanzhe-theme-green-applied-desktop').file,
    ],
    visual_notes: '前后对比明显，适合作为主题切换卖点图。',
    annotation_suggestions: ['标出页眉和模块签条颜色变化', '避免覆盖右侧设置面板'],
  }));

  return cards;
}

async function upsertIndex(entries) {
  const index = JSON.parse(await fs.readFile(indexPath, 'utf8'));
  const byId = new Map((index.screenshots ?? []).map((item) => [item.id, item]));
  for (const entry of entries) {
    byId.set(entry.id, { ...byId.get(entry.id), ...entry });
  }
  const merged = Array.from(byId.values());
  for (const item of merged) {
    if (!item.file) continue;
    const filePath = resolveAsset(item.file);
    if (!existsSync(filePath)) {
      item.asset_status = 'missing';
      continue;
    }
    const metadata = await sharp(filePath).metadata();
    item.actual_size = { width: metadata.width ?? null, height: metadata.height ?? null };
    delete item.asset_status;
  }
  index.generated_at = new Date().toISOString();
  index.base_url = baseUrl;
  index.screenshots = merged;
  index.capture_notes = {
    ...(index.capture_notes ?? {}),
    last_lanzhe_editor_core_capture: {
      captured_at: new Date().toISOString(),
      added_or_updated: entries.length,
      viewport: '1440x1000',
      rule: 'Lanzhe editor core screenshots focus on visual editing, rich text, module drag, theme, layout, and template controls.',
    },
  };
  await fs.writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  return index;
}

async function makeContactSheet(entries, outputRelativePath) {
  const thumbs = [];
  const tileWidth = 320;
  const tileHeight = 260;
  const imageHeight = 210;
  for (const entry of entries) {
    const source = resolveAsset(entry.file);
    if (!existsSync(source)) continue;
    const labelSvg = Buffer.from(`
      <svg width="${tileWidth}" height="${tileHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f8fafc"/>
        <rect x="0" y="0" width="${tileWidth}" height="44" fill="#0f172a"/>
        <text x="12" y="18" font-family="Arial, sans-serif" font-size="12" fill="#ffffff">${escapeXml(entry.id)}</text>
        <text x="12" y="34" font-family="Arial, sans-serif" font-size="10" fill="#cbd5e1">${escapeXml(entry.page || '')}</text>
      </svg>
    `);
    const image = await sharp(source)
      .resize(tileWidth, imageHeight, { fit: 'cover', position: 'top' })
      .png()
      .toBuffer();
    const tile = await sharp(labelSvg)
      .composite([{ input: image, left: 0, top: 48 }])
      .png()
      .toBuffer();
    thumbs.push(tile);
  }
  if (thumbs.length === 0) return null;
  const columns = 4;
  const rows = Math.ceil(thumbs.length / columns);
  const output = resolveAsset(outputRelativePath);
  await ensureDirFor(output);
  await sharp({
    create: {
      width: columns * tileWidth,
      height: rows * tileHeight,
      channels: 4,
      background: '#e2e8f0',
    },
  })
    .composite(thumbs.map((input, index) => ({
      input,
      left: (index % columns) * tileWidth,
      top: Math.floor(index / columns) * tileHeight,
    })))
    .png()
    .toFile(output);
  return outputRelativePath;
}

async function validateEntries(entries) {
  const problems = [];
  for (const entry of entries) {
    const filePath = resolveAsset(entry.file);
    if (!existsSync(filePath)) {
      problems.push({ id: entry.id, problem: 'missing' });
      continue;
    }
    const metadata = await sharp(filePath).metadata();
    if ((metadata.width ?? 0) < 300 || (metadata.height ?? 0) < 300) {
      problems.push({ id: entry.id, problem: `tiny ${metadata.width}x${metadata.height}` });
    }
  }
  return problems;
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
  });
  const entries = [];
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);
    await setupRequestMocks(page);
    const resumeId = await ensureLanzheDemoResume(page);
    console.log(`[setup] lanzhe resume ${resumeId}`);

    console.log('[capture] lanzhe editor states');
    entries.push(...await captureLanzheEditorStates(page, resumeId));

    console.log('[capture] module drag');
    entries.push(...await captureModuleDrag(page, resumeId));

    console.log('[capture] panels and theme');
    entries.push(...await captureLanzhePanelsAndTheme(page, resumeId));

    console.log('[compose] process cards');
    entries.push(...await makeProcessEntries(entries));

    const index = await upsertIndex(entries);
    const contactSheet = await makeContactSheet(entries, 'screenshots/index/contact-sheet-lanzhe-editor-core.png');
    const validationProblems = await validateEntries(entries);
    console.log(JSON.stringify({
      baseUrl,
      resumeId,
      captured: entries.length,
      totalIndexed: index.screenshots.length,
      contactSheet,
      validationProblems,
    }, null, 2));
    await page.close();
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
