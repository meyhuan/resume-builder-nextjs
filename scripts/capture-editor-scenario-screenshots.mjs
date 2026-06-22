import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';
import sharp from 'sharp';

const root = process.cwd();
const baseUrl = process.env.SCREENSHOT_BASE_URL || 'http://127.0.0.1:3004';
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const indexPath = path.join(root, 'screenshots/index/screenshot-index.json');

const viewports = {
  desktop: { width: 1440, height: 1000, deviceScaleFactor: 1 },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true },
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
  * {
    scroll-behavior: auto !important;
  }
  body {
    caret-color: transparent;
  }
`;

const richDemoResume = {
  id: 'screenshot-demo-resume',
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
    customFields: [
      { label: '优势', value: 'RAG / AI Agent / SaaS' },
    ],
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
      blocks: [
        {
          id: 'edu-demo-1',
          type: 'education',
          school: '上海交通大学',
          major: '计算机科学与技术',
          degree: '本科',
          startDate: '2016.09',
          endDate: '2020.06',
          courseHtml: '<p>数据结构、产品设计、机器学习、用户研究</p>',
        },
      ],
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
      blocks: [
        {
          id: 'project-demo-1',
          type: 'project',
          name: '销售线索跟进 Agent',
          role: '产品负责人',
          startDate: '2023.03',
          endDate: '2023.12',
          contentHtml:
            '<ul><li>设计线索评分、客户画像补全、跟进话术生成和 CRM 写回流程，使销售首次触达准备时间从 15 分钟降低到 4 分钟。</li><li>沉淀可复用 Prompt 模板和失败兜底策略，支撑运营团队批量复盘。</li></ul>',
        },
      ],
    },
    {
      id: 'section-summary',
      title: '自我评价',
      columns: 1,
      blocks: [
        {
          id: 'summary-demo-1',
          type: 'text',
          html: '<p>具备 AI 产品从需求拆解、方案设计、模型评测到上线运营的完整经验，能把业务问题转化为可落地的产品功能。</p>',
        },
      ],
    },
    {
      id: 'section-skills',
      title: '相关技能',
      columns: 1,
      blocks: [
        {
          id: 'skills-demo-1',
          type: 'text',
          html: '<ul><li>产品方法：需求分析、PRD、原型设计、A/B 测试、跨团队协作</li><li>AI 技术理解：RAG、Prompt Engineering、AI Agent、模型评测、向量数据库</li><li>业务指标：命中率、采纳率、转化率、人工接管率、成本分析</li></ul>',
        },
      ],
    },
    {
      id: 'section-qualifications',
      title: '奖项证书',
      columns: 1,
      blocks: [
        {
          id: 'qualifications-demo-1',
          type: 'text',
          html: '<p>PMP 项目管理认证、英语六级、公司年度优秀产品奖</p>',
        },
      ],
    },
  ],
};

const jdText = `岗位职责：
1. 负责企业知识库、RAG 问答和 AI Agent 产品规划；
2. 结合业务场景完成需求分析、PRD、原型设计和版本规划；
3. 与算法、后端、运营团队协作，建立模型评测和反馈闭环；
4. 关注命中率、采纳率、响应时延、Token 成本和商业化指标。`;

const quotaResponse = {
  aiGenerateResume: { allowed: true, remaining: 99, isVip: true, limit: 999 },
  aiImportSection: { allowed: true, remaining: 99, isVip: true, limit: 999 },
  aiGenerateSection: { allowed: true, remaining: 99, isVip: true, limit: 999 },
  aiPolishSection: { allowed: true, remaining: 99, isVip: true, limit: 999 },
  aiOptimizeResume: { allowed: true, remaining: 99, isVip: true, limit: 999 },
  pdfExport: { allowed: true, remaining: 99, isVip: true, limit: 999 },
};

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function absoluteUrl(route) {
  return new URL(route, baseUrl).href;
}

function resolveScreenshotPath(relativePath) {
  return path.join(root, relativePath.split('/').join(path.sep));
}

function relativeFile(dir, id) {
  return `screenshots/raw/${dir}/${id}.png`;
}

async function ensureDirFor(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function setAuthCookie(page) {
  await page.setCookie({
    name: 'auth_uid',
    value: process.env.E2E_AUTH_DEFAULT_WX_ID || 'e2e_default_user',
    url: baseUrl,
    path: '/',
  });
}

async function waitForFonts(page) {
  await page.evaluate(async () => {
    if ('fonts' in document) {
      await document.fonts.ready;
    }
  }).catch(() => undefined);
}

async function cleanupTransientUi(page) {
  await page.addStyleTag({ content: overlayCleanupCss }).catch(() => undefined);
  await page.evaluate(() => {
    for (const selector of ['nextjs-portal', '[data-nextjs-toast]', '[data-sonner-toaster]', '.__next-dev-overlay']) {
      document.querySelectorAll(selector).forEach((node) => node.remove());
    }
  }).catch(() => undefined);
}

async function removeLoginDialog(page) {
  await page.evaluate(() => {
    const looksLikeLogin = (text) => (
      text.includes('微信扫码登录') ||
      (text.includes('扫码') && text.includes('登录')) ||
      (text.includes('二维码') && text.includes('登录'))
    );
    const candidates = Array.from(document.querySelectorAll('[role="dialog"], div, section, aside'));
    for (const el of candidates) {
      const text = el.textContent || '';
      if (!looksLikeLogin(text)) continue;
      let node = el;
      for (let i = 0; i < 4 && node.parentElement; i += 1) {
        const style = window.getComputedStyle(node.parentElement);
        if (style.position === 'fixed' || node.parentElement.getAttribute('role') === 'dialog') {
          node = node.parentElement;
        }
      }
      node.remove();
    }
    Array.from(document.querySelectorAll('[data-radix-dialog-overlay]')).forEach((overlay) => {
      const siblingText = `${overlay.nextElementSibling?.textContent || ''}${overlay.parentElement?.textContent || ''}`;
      if (looksLikeLogin(siblingText)) overlay.remove();
    });
  }).catch(() => undefined);
}

async function removePcBlockingOverlays(page) {
  await removeLoginDialog(page);
  await page.evaluate(() => {
    const viewportArea = window.innerWidth * window.innerHeight;
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const style = window.getComputedStyle(el);
      if (style.position !== 'fixed') continue;
      const rect = el.getBoundingClientRect();
      const area = rect.width * rect.height;
      const isScreenOverlay = rect.width >= window.innerWidth * 0.8 && rect.height >= window.innerHeight * 0.8;
      const hasOverlayPaint =
        style.backgroundColor.includes('rgba') ||
        style.backdropFilter !== 'none' ||
        style.opacity !== '1' ||
        (el.textContent || '').trim() === '';
      if ((isScreenOverlay || area >= viewportArea * 0.6) && hasOverlayPaint) {
        el.remove();
      }
    }
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const style = window.getComputedStyle(el);
      if (style.position !== 'fixed') continue;
      if ((el.textContent || '').trim() === '反馈') {
        el.remove();
      }
    }
    document.body.style.pointerEvents = '';
    document.documentElement.style.pointerEvents = '';
  }).catch(() => undefined);
}

async function gotoStable(page, route, options = {}) {
  const targetUrl = absoluteUrl(route);
  let navigationError = null;
  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: options.timeout ?? 30000 });
  } catch (error) {
    navigationError = error;
    console.warn(`[goto timeout] ${route}: ${error.message}`);
  }
  const current = new URL(page.url());
  const target = new URL(targetUrl);
  const reachedTarget = current.origin === target.origin && current.pathname === target.pathname;
  if (!reachedTarget) {
    throw navigationError ?? new Error(`navigation did not reach target: ${route}`);
  }
  await page.waitForSelector('body', { timeout: 15000 }).catch(() => undefined);
  await page.waitForFunction(() => document.readyState !== 'loading', { timeout: 10000 }).catch(() => undefined);
  await sleep(options.initialWaitMs ?? 900);
  await waitForFonts(page);
  await cleanupTransientUi(page);
  if (options.waitForText) {
    await page.waitForFunction((text) => document.body.innerText.includes(text), { timeout: 20000 }, options.waitForText);
  }
  if (options.scrollY !== undefined) {
    await page.evaluate((y) => window.scrollTo(0, y), options.scrollY).catch(() => undefined);
  }
  await sleep(options.afterWaitMs ?? 350);
}

async function setupRequestMocks(page) {
  page.on('dialog', async (dialog) => {
    await dialog.accept().catch(() => undefined);
  });
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/next-api/quota')) {
      void request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(quotaResponse),
      });
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
    if (url.includes('/next-api/ai/optimize-resume') && request.method() === 'POST') {
      let body = {};
      try {
        body = JSON.parse(request.postData() || '{}');
      } catch {
        body = {};
      }
      const blocks = Array.isArray(body.blocks) ? body.blocks.slice(0, 3) : [];
      const result = {};
      for (const block of blocks) {
        const blockId = block.blockId || block.id;
        if (!blockId) continue;
        result[blockId] = '<ul><li>围绕目标岗位重写经历表达，突出业务问题、个人动作和可量化结果。</li><li>补充 RAG、AI Agent、模型评测等关键词，让简历更贴合 JD 初筛。</li></ul>';
      }
      const streamPayload = `data: ${JSON.stringify({ content: JSON.stringify(result) })}\n\ndata: [DONE]\n\n`;
      void request.respond({
        status: 200,
        contentType: 'text/event-stream; charset=utf-8',
        body: streamPayload,
      });
      return;
    }
    void request.continue();
  });
}

async function ensureDemoResume(page) {
  await page.setViewport(viewports.desktop);
  await setAuthCookie(page);
  await gotoStable(page, '/', { initialWaitMs: 500 });
  return page.evaluate(async (content) => {
    const listResponse = await fetch('/next-api/resumes', { credentials: 'include' });
    if (!listResponse.ok) {
      throw new Error(`resume list failed: ${listResponse.status}`);
    }
    const list = await listResponse.json();
    const existing = Array.isArray(list)
      ? list.find((item) => item.title === '截图演示简历' || item.title === '张明-AI产品经理简历')
      : null;
    if (existing?.id) {
      const updateResponse = await fetch(`/next-api/resumes/${existing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: '截图演示简历',
          template: 'xinghe',
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
        template: 'xinghe',
        content,
      }),
    });
    if (!createResponse.ok) {
      const message = await createResponse.text().catch(() => '');
      throw new Error(`resume create failed: ${createResponse.status} ${message}`);
    }
    const created = await createResponse.json();
    return created.id;
  }, richDemoResume);
}

async function clickByText(page, text, options = {}) {
  const clicked = await page.evaluate(({ text: targetText, exact, selector }) => {
    const isVisible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const normalize = (value) => value.replace(/\s+/g, ' ').trim();
    const candidates = Array.from(document.querySelectorAll(selector || 'button, a, [role="button"], label, [data-edit-home-anchor]'));
    const matched = candidates.find((el) => {
      if (!isVisible(el)) return false;
      const content = normalize(el.textContent || el.getAttribute('aria-label') || '');
      return exact ? content === targetText : content.includes(targetText);
    });
    if (!matched) return false;
    matched.scrollIntoView({ block: 'center', inline: 'center' });
    matched.click();
    return true;
  }, { text, exact: Boolean(options.exact), selector: options.selector });
  if (!clicked) {
    throw new Error(`click target not found: ${text}`);
  }
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

async function scrollToText(page, text, options = {}) {
  await page.evaluate(({ text: targetText, containerSelector }) => {
    const containers = containerSelector
      ? Array.from(document.querySelectorAll(containerSelector))
      : Array.from(document.querySelectorAll('aside, main, [role="dialog"], .custom-scrollbar, body'));
    const target = Array.from(document.querySelectorAll('h1, h2, h3, h4, p, label, div, span'))
      .find((node) => (node.textContent || '').includes(targetText));
    if (!target) return;
    const targetRect = target.getBoundingClientRect();
    for (const container of containers) {
      const style = window.getComputedStyle(container);
      const canScroll = /(auto|scroll)/.test(style.overflowY) && container.scrollHeight > container.clientHeight;
      if (!canScroll && container !== document.body) continue;
      const rect = container.getBoundingClientRect();
      if (targetRect.left >= rect.left - 8 && targetRect.right <= rect.right + 8) {
        container.scrollTo({
          top: container.scrollTop + targetRect.top - rect.top - 24,
          behavior: 'instant',
        });
        return;
      }
    }
    target.scrollIntoView({ block: 'start', inline: 'nearest' });
  }, { text, containerSelector: options.containerSelector });
  await sleep(options.afterWaitMs ?? 400);
}

async function clickPcLayoutSettingsTab(page) {
  await page.waitForSelector('[role="tab"][aria-controls*="content-settings"]', { timeout: 10000 });
  await page.click('[role="tab"][aria-controls*="content-settings"]');
  await page.waitForFunction(() => document.body.innerText.includes('文字排版'), { timeout: 10000 });
  await sleep(500);
}

async function openEditor(page, resumeId, options = {}) {
  await page.setViewport(viewports.desktop);
  await setAuthCookie(page);
  await gotoStable(page, `/editor/${resumeId}`, { waitForText: '模块管理', initialWaitMs: 1600 });
  await removePcBlockingOverlays(page);
  await cleanupTransientUi(page);
  if (options.closeSidebar) {
    await page.evaluate(() => {
      const close = document.querySelector('[aria-label="关闭侧边栏"]');
      if (close instanceof HTMLElement) close.click();
    }).catch(() => undefined);
    await sleep(500);
  }
}

async function openMobileEdit(page, resumeId) {
  await page.setViewport(viewports.mobile);
  await setAuthCookie(page);
  await gotoStable(page, `/m/edit?id=${encodeURIComponent(resumeId)}`, {
    waitForText: '预览简历',
    initialWaitMs: 1400,
  });
}

async function captureEntry(page, entry, viewportName, dir) {
  await cleanupTransientUi(page);
  await waitForFonts(page);
  await sleep(250);
  const file = relativeFile(dir, entry.id);
  const absoluteFile = resolveScreenshotPath(file);
  await ensureDirFor(absoluteFile);
  await page.screenshot({ path: absoluteFile, fullPage: entry.fullPage === true });
  const metadata = await sharp(absoluteFile).metadata();
  return {
    id: entry.id,
    file,
    viewport: {
      width: viewports[viewportName].width,
      height: viewports[viewportName].height,
    },
    actual_size: {
      width: metadata.width ?? null,
      height: metadata.height ?? null,
    },
    page: entry.page,
    summary: entry.summary,
    visible_elements: entry.visible_elements,
    features: entry.features,
    scenarios: entry.scenarios,
    best_for: entry.best_for,
    not_for: entry.not_for ?? [],
    visual_notes: entry.visual_notes,
    annotation_suggestions: entry.annotation_suggestions ?? [],
  };
}

function pcEntry(id, overrides) {
  return {
    id,
    best_for: ['编辑场景专项图', '产品功能展示', '小红书正文配图'],
    ...overrides,
  };
}

function mobileEntry(id, overrides) {
  return {
    id,
    best_for: ['移动端编辑展示', '编辑场景专项图', '小红书步骤图'],
    ...overrides,
  };
}

async function capturePcScenarios(page, resumeId) {
  const entries = [];

  await openEditor(page, resumeId, { closeSidebar: true });
  entries.push(await captureEntry(page, pcEntry('editor-pc-workbench-overview-desktop', {
    page: 'PC 编辑器完整工作台',
    summary: '展示 PC 端简历编辑器的主工作台，包含顶部撤销保存导出工具栏、模块管理/排版美化/AI 一键优化入口和简历实时预览画布。',
    visible_elements: ['顶部工具栏', '模块管理入口', '排版美化入口', 'AI一键优化入口', '简历预览画布', '保存和导出按钮'],
    features: ['所见即所得编辑', '实时预览', '保存简历', 'PNG/Markdown/PDF 导出入口', 'PC 专业编辑工作台'],
    scenarios: ['想在电脑上精细调整简历', '需要展示完整编辑器', '强调边写边看排版效果'],
    visual_notes: '完整工作台信息清楚，适合作为编辑器功能总览图或产品能力总览图。',
    annotation_suggestions: ['标出顶部三大编辑入口', '突出右侧保存导出按钮', '不要遮挡简历正文'],
  }), 'desktop', 'desktop'));

  await openEditor(page, resumeId);
  await clickByText(page, '模块管理', { selector: 'button' });
  entries.push(await captureEntry(page, pcEntry('editor-pc-section-manager-desktop', {
    page: 'PC 编辑器模块管理面板',
    summary: '展示用户可以在右侧模块管理面板中控制照片、求职意向、各经历模块显示，并拖拽调整模块顺序或添加新模块。',
    visible_elements: ['模块管理标题', '个人信息照片开关', '求职意向显示开关', '教育经历', '工作经历', '项目经历', '添加模块'],
    features: ['模块显示控制', '模块拖拽排序', '添加自定义模块', '照片显示控制'],
    scenarios: ['简历模块顺序不合理', '想隐藏照片或求职意向', '需要快速增删简历模块'],
    visual_notes: '右侧面板功能集中，适合说明“简历结构可以自由管理”。',
    annotation_suggestions: ['圈出模块拖拽列表', '强调添加模块', '标出照片/求职意向开关'],
  }), 'desktop', 'desktop'));

  await clickByText(page, '排版美化', { selector: 'button' });
  await clickByText(page, '切换模板', { selector: 'button', exact: true });
  entries.push(await captureEntry(page, pcEntry('editor-pc-template-library-desktop', {
    page: 'PC 编辑器模板切换面板',
    summary: '展示编辑器内置的多款简历模板缩略图，用户可以在编辑过程中直接切换模板并即时查看预览效果。',
    visible_elements: ['切换模板标签', '模板缩略图网格', '当前模板选中状态', '导入 JSON 简历按钮'],
    features: ['多模板切换', '模板实时预览', '精美原创模板', '导入 JSON 简历'],
    scenarios: ['不知道简历用什么样式', '想快速更换简历风格', '需要展示模板丰富度'],
    visual_notes: '模板缩略图密集，适合做“模板丰富且可直接切换”的功能图。',
    annotation_suggestions: ['突出模板网格', '标出当前选中模板', '避免大面积遮挡缩略图'],
  }), 'desktop', 'desktop'));

  await clickSelector(page, '[data-template-id="lifeng"]', { afterWaitMs: 1300 }).catch(async () => {
    await clickSelector(page, '[data-template-id="warm"]', { afterWaitMs: 1300 });
  });
  entries.push(await captureEntry(page, pcEntry('editor-pc-template-switched-preview-desktop', {
    page: 'PC 编辑器模板切换后预览',
    summary: '展示在编辑器内点击模板后，简历画布即时换成另一套视觉风格，说明模板切换不会脱离编辑工作流。',
    visible_elements: ['模板缩略图选中态', '更新后的简历预览', '排版美化面板'],
    features: ['一键切换模板', '即时预览模板效果', '不同岗位风格模板'],
    scenarios: ['投递不同岗位想换风格', '需要快速比较模板效果', '强调模板切换很直观'],
    visual_notes: '同时能看到模板面板和新预览，适合说明“点一下就换版式”。',
    annotation_suggestions: ['标出被选中的模板', '指向左侧预览变化', '保留简历主体可识别'],
  }), 'desktop', 'desktop'));

  await clickPcLayoutSettingsTab(page);
  entries.push(await captureEntry(page, pcEntry('editor-pc-layout-settings-desktop', {
    page: 'PC 编辑器排版设置面板',
    summary: '展示全局字号、一页模式、行高、模块间距和页边距等排版控制，适合说明产品可以精细调整简历版式。',
    visible_elements: ['文字排版', '全局字号', '一页模式', '行高滑杆', '模块间距滑杆', '页边距设置'],
    features: ['字号调整', '一页模式', '行距调整', '模块间距调整', '页边距调整'],
    scenarios: ['内容太多放不下一页', '简历看起来太挤或太散', '想微调排版细节'],
    visual_notes: '控制项明确，适合做排版能力说明图。',
    annotation_suggestions: ['突出一页模式', '标注行距/模块间距滑杆', '不要遮挡右侧控件文字'],
  }), 'desktop', 'desktop'));

  await page.click('button[aria-pressed]').catch(async () => {
    await clickByText(page, '一页模式', { selector: 'button' });
  });
  await sleep(900);
  entries.push(await captureEntry(page, pcEntry('editor-pc-one-page-mode-desktop', {
    page: 'PC 编辑器一页模式开启状态',
    summary: '展示开启一页模式后的排版设置面板，系统会自动压缩字号、行距和间距，帮助信息较多的简历尽量收纳到一页。',
    visible_elements: ['一页模式开关', '开启状态', '自动适配提示', '排版滑杆', '简历预览'],
    features: ['一页简历适配', '自动压缩排版参数', '内容容量优化'],
    scenarios: ['简历超过一页', '海投需要一页版简历', '想快速压缩内容但不手动调参数'],
    visual_notes: '适合说明“内容多也能尝试自动压到一页”。',
    annotation_suggestions: ['圈出一页模式开启状态', '标出自动适配提示', '保留左侧预览效果'],
  }), 'desktop', 'desktop'));

  await scrollToText(page, '色彩风格', { containerSelector: 'aside' });
  await page.click('[aria-label="选择主题主色"]').catch(async () => {
    await clickByText(page, '选择主题主色', { selector: 'button, [aria-label="选择主题主色"]', afterWaitMs: 500 });
  }).catch(() => undefined);
  entries.push(await captureEntry(page, pcEntry('editor-pc-theme-color-picker-desktop', {
    page: 'PC 编辑器主题色设置',
    summary: '展示主题主色选择器和颜色预设，用户可以根据岗位、行业或个人风格调整简历的强调色。',
    visible_elements: ['色彩风格', '主题主色', '当前颜色', '颜色预设', '恢复模板默认色'],
    features: ['主题色切换', '自定义颜色', '模板默认色恢复', '视觉风格调整'],
    scenarios: ['想让简历更有设计感', '需要匹配不同行业风格', '模板颜色不符合个人偏好'],
    visual_notes: '颜色面板很适合做“主题可切换”的卖点图。',
    annotation_suggestions: ['突出颜色预设', '标出当前颜色', '避免遮挡右侧弹层'],
  }), 'desktop', 'desktop'));

  return entries;
}

async function capturePcAiScenarios(page, resumeId) {
  const entries = [];
  await openEditor(page, resumeId);
  await clickByText(page, 'AI一键优化', { selector: 'button' });
  await page.waitForFunction(() => document.body.innerText.includes('目标岗位 JD'), { timeout: 15000 });
  await page.waitForFunction(
    () => !document.body.innerText.includes('今日剩余 ...'),
    { timeout: 8000 },
  ).catch(() => undefined);
  await page.evaluate((text) => {
    const textarea = document.querySelector('textarea');
    if (!(textarea instanceof HTMLTextAreaElement)) return;
    textarea.focus();
    textarea.value = text;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }, jdText);
  await sleep(500);
  entries.push(await captureEntry(page, pcEntry('editor-pc-ai-optimize-input-desktop', {
    page: 'PC 编辑器 AI 一键优化输入面板',
    summary: '展示 AI 一键优化简历面板，用户可以选择求职身份、粘贴目标岗位 JD，并看到系统将优化哪些经历模块。',
    visible_elements: ['求职身份', '目标岗位 JD', '可优化模块列表', '一键优化简历按钮', '剩余次数'],
    features: ['AI 一键优化简历', '按 JD 优化', '求职身份选择', '模块级优化范围预览'],
    scenarios: ['不知道怎么按岗位改简历', '投递前想匹配 JD', '需要快速优化经历表达'],
    visual_notes: '输入态功能完整，适合作为 AI 优化流程的第一张功能图。',
    annotation_suggestions: ['突出 JD 输入框', '标出将优化的模块列表', '指向一键优化按钮'],
  }), 'desktop', 'desktop'));

  await clickByText(page, '一键优化简历', { selector: 'button', exact: false, afterWaitMs: 2500 });
  await page.waitForFunction(() => document.body.innerText.includes('AI 优化了'), { timeout: 15000 });
  entries.push(await captureEntry(page, pcEntry('editor-pc-ai-optimize-preview-desktop', {
    page: 'PC 编辑器 AI 优化结果预览',
    summary: '展示 AI 优化完成后的模块级差异预览，用户可以逐条查看原文和优化后内容，并选择是否应用到简历。',
    visible_elements: ['AI 优化了多个模块', '原文', '优化后', '全部选中', '应用选中的优化', '放弃不做修改'],
    features: ['AI 优化预览', '原文/优化后对比', '逐项选择应用', '可撤销式编辑流程'],
    scenarios: ['担心 AI 直接改坏简历', '想先审核优化结果', '需要展示 AI 不是黑箱改写'],
    visual_notes: '结果预览可信度高，适合做 AI 卖点的核心截图。',
    annotation_suggestions: ['圈出原文/优化后对比', '标出应用选中按钮', '强调先预览再应用'],
  }), 'desktop', 'desktop'));

  return entries;
}

async function captureMobileRoute(page, route, entry, waitForText) {
  await setAuthCookie(page);
  try {
    await gotoStable(page, route, {
      waitForText,
      initialWaitMs: 900,
    });
  } catch (error) {
    const bodyText = await page.evaluate(() => document.body.innerText || '').catch(() => '');
    const hasUsableContent = bodyText.trim().length > 40 && !bodyText.includes('加载中');
    if (!hasUsableContent) {
      throw error;
    }
    console.warn(`[mobile wait fallback] ${entry.id}: ${error.message}; body=${bodyText.slice(0, 120).replace(/\s+/g, ' ')}`);
    await cleanupTransientUi(page);
    await sleep(600);
  }
  return captureEntry(page, entry, 'mobile', 'mobile');
}

async function captureMobileScenarios(page, resumeId) {
  const entries = [];
  const idParam = encodeURIComponent(resumeId);

  await openMobileEdit(page, resumeId);
  entries.push(await captureEntry(page, mobileEntry('mobile-edit-home-editing-dashboard', {
    page: '移动端编辑首页工作台',
    summary: '展示手机端编辑首页，包含完整度、基础信息、快捷操作、求职意向、各简历模块和底部模块管理/预览入口。',
    visible_elements: ['简历完整度', '基础信息卡片', 'AI 生成', '导入简历', '电脑编辑', '求职意向', '模块列表', '模块管理', '预览简历'],
    features: ['移动端简历编辑', '完整度提示', 'AI 生成入口', '导入简历入口', '预览简历入口'],
    scenarios: ['想用手机快速修改简历', '需要展示移动端首页', '强调手机端也能完成完整编辑'],
    visual_notes: '移动端总览信息丰富，适合作为“手机也能做简历”的正文图。',
    annotation_suggestions: ['标出底部预览简历按钮', '圈出快捷操作', '强调完整度提示'],
  }), 'mobile', 'mobile'));

  await clickByText(page, '模块管理', { selector: 'button' });
  await page.waitForFunction(() => document.body.innerText.includes('控制基础展示项'), { timeout: 10000 });
  entries.push(await captureEntry(page, mobileEntry('mobile-edit-module-management-sheet', {
    page: '移动端模块管理弹层',
    summary: '展示手机端模块管理底部弹层，可以控制证件照、求职意向显示，并调整各模块的展示状态和顺序。',
    visible_elements: ['模块管理', '控制基础展示项', '证件照', '求职意向', '展示模块', '教育经历', '工作经历', '项目经历'],
    features: ['移动端模块管理', '显示/隐藏模块', '基础展示项控制', '模块顺序管理'],
    scenarios: ['想在手机上整理简历结构', '需要隐藏或展示某个模块', '强调移动端不是只读预览'],
    visual_notes: '弹层形态清晰，适合说明移动端也能做结构调整。',
    annotation_suggestions: ['标出证件照/求职意向开关', '圈出展示模块列表', '保留底部弹层边界'],
  }), 'mobile', 'mobile'));

  entries.push(await captureMobileRoute(page, `/m/edit/intention?id=${idParam}`, mobileEntry('mobile-edit-intention-form-detailed', {
    page: '移动端求职意向编辑表单',
    summary: '展示手机端填写求职岗位、城市、薪资、求职类型、行业和当前状态的表单，用于说明求职目标会参与后续简历优化。',
    visible_elements: ['意向岗位', '意向城市', '期望薪资', '求职类型', '期望行业', '当前状态', '保存按钮'],
    features: ['求职意向编辑', '城市自动补全', '薪资选项', '岗位目标结构化'],
    scenarios: ['需要按目标岗位优化简历', '手机上补充求职目标', '做求职信息结构化'],
    visual_notes: '表单项完整，适合做“先明确目标岗位”的步骤图。',
    annotation_suggestions: ['突出意向岗位', '标出薪资和行业字段', '不要遮挡保存按钮'],
  }), '意向岗位'));

  entries.push(await captureMobileRoute(page, `/m/edit/edu?id=${idParam}`, mobileEntry('mobile-edit-education-list-reorder', {
    page: '移动端教育经历列表',
    summary: '展示手机端教育经历列表，支持进入详情、添加新经历，以及对经历进行上移、下移或删除。',
    visible_elements: ['教育经历', '学校条目', '专业学历', '上移', '下移', '删除', '添加一条教育经历'],
    features: ['教育经历管理', '经历排序', '添加经历', '删除经历'],
    scenarios: ['需要补充教育背景', '想调整经历顺序', '手机端管理列表型模块'],
    visual_notes: '列表操作按钮很明确，适合说明移动端支持模块内排序。',
    annotation_suggestions: ['标出上移/下移按钮', '圈出添加一条教育经历', '弱化顶部返回'],
  }), '添加一条教育经历'));

  entries.push(await captureMobileRoute(page, `/m/edit/edu/0?id=${idParam}`, mobileEntry('mobile-edit-education-detail-form', {
    page: '移动端教育经历详情表单',
    summary: '展示手机端教育经历详情编辑，包括学校、专业、学历、起止时间和课程/成绩等字段。',
    visible_elements: ['学校名称', '专业', '学历', '开始时间', '结束时间', '主修课程或成绩', '保存按钮'],
    features: ['教育经历详情编辑', '时间字段填写', '课程成绩补充', '移动端保存'],
    scenarios: ['应届生补充教育背景', '手机端编辑单条经历', '需要说明字段很完整'],
    visual_notes: '适合作为“简历内容可以逐项精修”的步骤图。',
    annotation_suggestions: ['突出学校/专业/学历字段', '标出主修课程输入区', '保留保存按钮'],
  }), '学校名称'));

  entries.push(await captureMobileRoute(page, `/m/edit/work?id=${idParam}`, mobileEntry('mobile-edit-work-list-reorder', {
    page: '移动端工作经历列表',
    summary: '展示手机端工作经历列表，包含公司、岗位、时间、经历摘要，以及上移/下移/删除操作。',
    visible_elements: ['工作经历', '公司名称', '岗位和时间', '经历摘要', '上移', '下移', '删除', '添加一条工作经历'],
    features: ['工作经历管理', '经历排序', '经历摘要预览', '添加工作经历'],
    scenarios: ['职场人整理工作经历', '需要调整经历顺序', '展示移动端列表编辑能力'],
    visual_notes: '工作经历是简历核心模块，适合大量推广笔记复用。',
    annotation_suggestions: ['标出经历摘要', '圈出排序按钮', '强调可继续添加经历'],
  }), '添加一条工作经历'));

  entries.push(await captureMobileRoute(page, `/m/edit/work/0?id=${idParam}`, mobileEntry('mobile-edit-work-detail-rich-form', {
    page: '移动端工作经历详情表单',
    summary: '展示手机端单条工作经历的详细编辑表单，包含公司、岗位、行业、起止时间和富文本职责成果描述。',
    visible_elements: ['公司名称', '职位名称', '所属行业', '开始时间', '结束时间', '工作内容', '保存按钮'],
    features: ['工作经历详情编辑', '富文本经历描述', '行业字段', '时间字段'],
    scenarios: ['优化工作经历表达', '补充量化成果', '手机端精细修改核心经历'],
    visual_notes: '字段完整且内容丰富，适合说明产品支持精修工作经历。',
    annotation_suggestions: ['突出工作内容编辑区', '标出公司/岗位字段', '不要遮挡底部保存状态'],
  }), '公司名称'));

  entries.push(await captureMobileRoute(page, `/m/edit/project?id=${idParam}`, mobileEntry('mobile-edit-project-list-reorder', {
    page: '移动端项目经历列表',
    summary: '展示手机端项目经历列表，可以查看项目名称、角色、时间和项目摘要，并进行排序和删除。',
    visible_elements: ['项目经历', '项目名称', '项目角色', '项目摘要', '上移', '下移', '删除', '添加一个项目经历'],
    features: ['项目经历管理', '项目排序', '项目摘要预览', '添加项目经历'],
    scenarios: ['项目经历很多需要整理', '求职者想突出重点项目', '展示手机端项目模块能力'],
    visual_notes: '适合项目/产品/技术岗位笔记，能证明项目经历可单独管理。',
    annotation_suggestions: ['标出项目摘要', '圈出添加项目入口', '强调上移下移'],
  }), '添加一条项目经历'));

  entries.push(await captureMobileRoute(page, `/m/edit/project/0?id=${idParam}`, mobileEntry('mobile-edit-project-detail-rich-form', {
    page: '移动端项目经历详情表单',
    summary: '展示手机端单条项目经历编辑，包含项目名称、角色、起止时间和项目描述/成果等富文本内容。',
    visible_elements: ['项目名称', '项目角色', '开始时间', '结束时间', '项目内容', '保存按钮'],
    features: ['项目经历详情编辑', '项目角色填写', '成果描述', '富文本编辑'],
    scenarios: ['需要把项目经历写得更专业', '产品/技术岗补充项目成果', '手机端编辑核心项目'],
    visual_notes: '适合说明产品能细化项目经历，而不是只填基础信息。',
    annotation_suggestions: ['突出项目内容编辑区', '标出项目角色', '保留保存按钮'],
  }), '项目名称'));

  entries.push(await captureMobileRoute(page, `/m/edit/skill?id=${idParam}`, mobileEntry('mobile-edit-skill-rich-text-form', {
    page: '移动端相关技能编辑',
    summary: '展示手机端相关技能富文本编辑表单，用于填写产品方法、AI 技术理解、业务指标等结构化技能内容。',
    visible_elements: ['相关技能', '富文本编辑区', '技能内容', '保存按钮'],
    features: ['技能特长编辑', '富文本内容编辑', '结构化技能描述'],
    scenarios: ['想补充岗位关键词', '技术/产品能力需要结构化展示', '手机端完善技能模块'],
    visual_notes: '技能内容与岗位关键词强相关，适合讲“关键词补齐”。',
    annotation_suggestions: ['圈出技能编辑区', '强调岗位关键词', '不要遮挡保存按钮'],
  }), '相关技能'));

  entries.push(await captureMobileRoute(page, `/m/edit/summary?id=${idParam}`, mobileEntry('mobile-edit-summary-rich-text-form', {
    page: '移动端自我评价编辑',
    summary: '展示手机端自我评价编辑页，支持用简短段落总结个人优势、岗位匹配度和代表性经验。',
    visible_elements: ['自我评价', '富文本编辑区', '个人优势内容', '保存按钮'],
    features: ['自我评价编辑', '个人优势撰写', '富文本段落输入'],
    scenarios: ['不知道个人优势怎么写', '需要补充简历开头总结', '手机端快速改自我介绍'],
    visual_notes: '适合作为“30 秒自我介绍也能在手机上改”的步骤图。',
    annotation_suggestions: ['突出自我评价文本区', '标出保存按钮', '保持画面干净'],
  }), '自我评价'));

  entries.push(await captureMobileRoute(page, `/m/edit/qualifications?id=${idParam}`, mobileEntry('mobile-edit-qualifications-form-detailed', {
    page: '移动端奖项证书编辑',
    summary: '展示手机端奖项证书编辑页，适合填写认证、语言成绩、荣誉奖项等补充背书信息。',
    visible_elements: ['奖项证书', '富文本编辑区', '证书内容', '保存按钮'],
    features: ['奖项证书编辑', '补充背书信息', '富文本输入'],
    scenarios: ['需要补充证书和奖项', '学生或转行用户增加可信度', '手机端完善补充模块'],
    visual_notes: '适合补充模块能力展示，和教育/技能截图形成完整编辑闭环。',
    annotation_suggestions: ['标出奖项证书输入区', '强调补充背书', '保留底部保存状态'],
  }), '奖项证书'));

  return entries;
}

async function captureMobilePreviewScenarios(page, resumeId) {
  const entries = [];
  await page.setViewport(viewports.mobile);
  await setAuthCookie(page);
  await gotoStable(page, `/m/preview?id=${encodeURIComponent(resumeId)}&tpl=xinghe`, {
    waitForText: '导出',
    initialWaitMs: 1800,
  });
  await clickByText(page, '样式', { selector: 'button', afterWaitMs: 700 });
  await page.waitForFunction(() => document.body.innerText.includes('调整样式'), { timeout: 10000 });
  entries.push(await captureEntry(page, mobileEntry('mobile-preview-settings-template-sheet', {
    page: '移动端预览模板设置弹层',
    summary: '展示手机端预览页的样式设置弹层，默认模板页签中列出多款简历模板，可直接在手机上切换预览。',
    visible_elements: ['简历预览', '调整样式', '模板页签', '模板缩略图', '恢复默认', '完成'],
    features: ['移动端模板切换', '预览中调整样式', '多模板选择'],
    scenarios: ['手机上选择简历模板', '想边预览边换模板', '展示移动端样式设置能力'],
    visual_notes: '底部弹层和上方预览同时可见，适合说明“手机上也能换模板”。',
    annotation_suggestions: ['圈出模板页签', '标出模板缩略图', '保留上方预览背景'],
  }), 'mobile', 'mobile'));

  await clickByText(page, '外观', { selector: 'button', exact: true });
  entries.push(await captureEntry(page, mobileEntry('mobile-preview-settings-appearance-theme', {
    page: '移动端预览外观设置',
    summary: '展示手机端预览页的外观设置，可调整主题色和字体，让简历视觉风格匹配岗位或个人偏好。',
    visible_elements: ['外观页签', '主题色', '颜色圆点', '自定义颜色', '模板默认色', '字体'],
    features: ['移动端主题色切换', '字体切换', '模板默认色查看'],
    scenarios: ['手机上调整简历颜色', '想让简历更适合岗位风格', '展示主题切换能力'],
    visual_notes: '颜色选择区域视觉鲜明，适合做主题切换卖点图。',
    annotation_suggestions: ['标出主题色圆点', '圈出字体选项', '避免遮挡完成按钮'],
  }), 'mobile', 'mobile'));

  await clickByText(page, '版式', { selector: 'button', exact: true });
  entries.push(await captureEntry(page, mobileEntry('mobile-preview-settings-layout-density', {
    page: '移动端预览版式设置',
    summary: '展示手机端版式设置，包括紧凑/标准/舒展密度，以及字号、行距、模块间距和页边距滑杆。',
    visible_elements: ['版式页签', '内容密度', '紧凑', '标准', '舒展', '字号基准', '行距', '模块间距'],
    features: ['移动端版式调整', '内容密度预设', '字号行距调整', '页边距设置'],
    scenarios: ['手机上微调简历排版', '内容太多需要压缩', '想让版面更舒展'],
    visual_notes: '版式设置项密集但清晰，适合说明“排版不是固定死的”。',
    annotation_suggestions: ['突出内容密度三档', '标出字号/行距滑杆', '少量文字标注即可'],
  }), 'mobile', 'mobile'));

  await clickByText(page, '单页', { selector: 'button', exact: true });
  entries.push(await captureEntry(page, mobileEntry('mobile-preview-settings-one-page-mode', {
    page: '移动端预览单页模式设置',
    summary: '展示手机端单页模式设置，可开启自动适配一页，并调整标题放大倍率和段落首行缩进。',
    visible_elements: ['单页页签', '单页模式', '开关', '标题放大倍率', '段落首行缩进', '完成'],
    features: ['移动端一页模式', '自动适配一页', '标题比例调整', '段落缩进调整'],
    scenarios: ['想把简历压到一页', '手机上调整最终投递版', '需要展示一页简历能力'],
    visual_notes: '单页模式信息明确，适合和 PC 一页模式截图互补。',
    annotation_suggestions: ['圈出单页模式开关', '标出标题放大倍率', '保留完成按钮'],
  }), 'mobile', 'mobile'));

  await clickByText(page, '完成', { selector: 'button', exact: true, afterWaitMs: 800 });
  await page.waitForFunction(() => !document.body.innerText.includes('调整样式'), { timeout: 10000 }).catch(() => undefined);
  await clickByText(page, '导出', { selector: 'button', exact: true, afterWaitMs: 500 });
  entries.push(await captureEntry(page, mobileEntry('mobile-preview-export-menu', {
    page: '移动端预览导出菜单',
    summary: '展示手机端预览页底部导出菜单，用户可以选择导出 PDF 或导出图片。',
    visible_elements: ['简历预览', '样式按钮', '导出按钮', '导出 PDF', '导出图片'],
    features: ['移动端导出', 'PDF 导出', '图片导出', '预览后导出'],
    scenarios: ['手机上完成简历后直接导出', '需要保存图片或 PDF', '展示编辑到导出的闭环'],
    visual_notes: '导出菜单非常适合作为流程末尾的转化图。',
    annotation_suggestions: ['突出导出 PDF/图片两个选项', '标出底部导出按钮', '不要遮挡简历预览主体'],
  }), 'mobile', 'mobile'));

  return entries;
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
    const filePath = resolveScreenshotPath(item.file);
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
    last_editor_scenario_capture: {
      captured_at: new Date().toISOString(),
      added_or_updated: entries.length,
      viewport_presets: {
        desktop: '1440x1000',
        mobile: '390x844@2x',
      },
      rule: 'Editor scenario screenshots are raw master assets with detailed index descriptions; Xiaohongshu redesign should preserve the real UI.',
    },
  };
  await fs.writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  return index;
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function makeContactSheet(entries, outputRelativePath) {
  const thumbs = [];
  const tileWidth = 320;
  const tileHeight = 260;
  const imageHeight = 210;
  for (const entry of entries) {
    const source = resolveScreenshotPath(entry.file);
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
  const canvas = sharp({
    create: {
      width: columns * tileWidth,
      height: rows * tileHeight,
      channels: 4,
      background: '#e2e8f0',
    },
  });
  const composite = thumbs.map((input, index) => ({
    input,
    left: (index % columns) * tileWidth,
    top: Math.floor(index / columns) * tileHeight,
  }));
  const output = resolveScreenshotPath(outputRelativePath);
  await ensureDirFor(output);
  await canvas.composite(composite).png().toFile(output);
  return outputRelativePath;
}

async function validateEntries(entries) {
  const problems = [];
  for (const entry of entries) {
    const filePath = resolveScreenshotPath(entry.file);
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
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--font-render-hinting=none',
      '--hide-scrollbars',
    ],
  });

  const entries = [];
  const failures = [];

  try {
    const setupPage = await browser.newPage();
    setupPage.setDefaultTimeout(60000);
    setupPage.setDefaultNavigationTimeout(60000);
    await setupRequestMocks(setupPage);
    await setupPage.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await setAuthCookie(setupPage);
    console.log('[setup] ensure demo resume');
    const resumeId = await ensureDemoResume(setupPage);
    await setupPage.close();

    try {
      console.log('[capture] pc editor scenarios');
      const pcPage = await browser.newPage();
      pcPage.setDefaultTimeout(60000);
      pcPage.setDefaultNavigationTimeout(60000);
      await setupRequestMocks(pcPage);
      entries.push(...await capturePcScenarios(pcPage, resumeId));
      await pcPage.close();
    } catch (error) {
      failures.push({ id: 'pc-editor-scenarios', message: error.message });
      console.warn(`[failed] pc-editor-scenarios: ${error.message}`);
    }

    try {
      console.log('[capture] pc ai editor scenarios');
      const pcAiPage = await browser.newPage();
      pcAiPage.setDefaultTimeout(60000);
      pcAiPage.setDefaultNavigationTimeout(60000);
      await setupRequestMocks(pcAiPage);
      entries.push(...await capturePcAiScenarios(pcAiPage, resumeId));
      await pcAiPage.close();
    } catch (error) {
      failures.push({ id: 'pc-ai-editor-scenarios', message: error.message });
      console.warn(`[failed] pc-ai-editor-scenarios: ${error.message}`);
    }

    try {
      console.log('[capture] mobile editor scenarios');
      const mobilePage = await browser.newPage();
      mobilePage.setDefaultTimeout(60000);
      mobilePage.setDefaultNavigationTimeout(60000);
      await setupRequestMocks(mobilePage);
      entries.push(...await captureMobileScenarios(mobilePage, resumeId));
      await mobilePage.close();
    } catch (error) {
      failures.push({ id: 'mobile-editor-scenarios', message: error.message });
      console.warn(`[failed] mobile-editor-scenarios: ${error.message}`);
    }

    try {
      console.log('[capture] mobile preview scenarios');
      const mobilePreviewPage = await browser.newPage();
      mobilePreviewPage.setDefaultTimeout(60000);
      mobilePreviewPage.setDefaultNavigationTimeout(60000);
      await setupRequestMocks(mobilePreviewPage);
      entries.push(...await captureMobilePreviewScenarios(mobilePreviewPage, resumeId));
      await mobilePreviewPage.close();
    } catch (error) {
      failures.push({ id: 'mobile-preview-scenarios', message: error.message });
      console.warn(`[failed] mobile-preview-scenarios: ${error.message}`);
    }

    const updatedIndex = await upsertIndex(entries);
    const contactSheet = await makeContactSheet(entries, 'screenshots/index/contact-sheet-editor-scenarios.png');
    const validationProblems = await validateEntries(entries);

    console.log(JSON.stringify({
      baseUrl,
      resumeId,
      captured: entries.length,
      totalIndexed: updatedIndex.screenshots.length,
      contactSheet,
      failures,
      validationProblems,
    }, null, 2));
  } finally {
    await browser.close();
  }

  if (failures.length > 0 || entries.length === 0) {
    process.exitCode = failures.length > 0 && entries.length === 0 ? 1 : 0;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
