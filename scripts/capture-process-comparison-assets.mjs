import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';
import sharp from 'sharp';

const root = process.cwd();
const baseUrl = process.env.SCREENSHOT_BASE_URL || 'http://127.0.0.1:3004';
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const indexPath = path.join(root, 'screenshots/index/screenshot-index.json');

const viewport = { width: 1440, height: 1000, deviceScaleFactor: 1 };

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

const quotaResponse = {
  aiGenerateResume: { allowed: true, remaining: 99, isVip: true, limit: 999 },
  aiImportSection: { allowed: true, remaining: 99, isVip: true, limit: 999 },
  aiGenerateSection: { allowed: true, remaining: 99, isVip: true, limit: 999 },
  aiPolishSection: { allowed: true, remaining: 99, isVip: true, limit: 999 },
  aiOptimizeResume: { allowed: true, remaining: 99, isVip: true, limit: 999 },
  pdfExport: { allowed: true, remaining: 99, isVip: true, limit: 999 },
};

const jdText = `岗位职责：
1. 负责企业知识库、RAG 问答和 AI Agent 产品规划；
2. 结合业务场景完成需求分析、PRD、原型设计和版本规划；
3. 与算法、后端、运营团队协作，建立模型评测和反馈闭环；
4. 关注命中率、采纳率、响应时延、Token 成本和商业化指标。`;

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
  await page.setCookie({
    name: 'auth_uid',
    value: process.env.E2E_AUTH_DEFAULT_WX_ID || 'e2e_default_user',
    url: baseUrl,
    path: '/',
  });
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
    if (url.includes('/next-api/ai/optimize-resume') && request.method() === 'POST') {
      let body = {};
      try {
        body = JSON.parse(request.postData() || '{}');
      } catch {
        body = {};
      }
      const result = {};
      for (const block of Array.isArray(body.blocks) ? body.blocks.slice(0, 3) : []) {
        const blockId = block.blockId || block.id;
        if (!blockId) continue;
        result[blockId] = '<ul><li>围绕目标岗位重写经历表达，突出业务问题、个人动作和可量化结果。</li><li>补充 RAG、AI Agent、模型评测等关键词，让简历更贴合 JD 初筛。</li></ul>';
      }
      void request.respond({
        status: 200,
        contentType: 'text/event-stream; charset=utf-8',
        body: `data: ${JSON.stringify({ content: JSON.stringify(result) })}\n\ndata: [DONE]\n\n`,
      });
      return;
    }
    void request.continue();
  });
}

async function cleanupPage(page) {
  await page.addStyleTag({ content: overlayCleanupCss }).catch(() => undefined);
  await page.evaluate(() => {
    for (const selector of ['nextjs-portal', '[data-nextjs-toast]', '[data-sonner-toaster]', '.__next-dev-overlay']) {
      document.querySelectorAll(selector).forEach((node) => node.remove());
    }
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const text = el.textContent || '';
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const looksLikeLogin = text.includes('微信扫码登录') || (text.includes('扫码') && text.includes('登录'));
      const isScreenOverlay = style.position === 'fixed' && rect.width > window.innerWidth * 0.8 && rect.height > window.innerHeight * 0.8;
      if (looksLikeLogin || isScreenOverlay) el.remove();
    }
  }).catch(() => undefined);
}

async function gotoStable(page, route, text) {
  await page.setViewport(viewport);
  await setAuthCookie(page);
  await page.goto(absoluteUrl(route), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('body', { timeout: 15000 });
  if (text) {
    await page.waitForFunction((value) => document.body.innerText.includes(value), { timeout: 20000 }, text);
  }
  await sleep(1200);
  await cleanupPage(page);
  await page.evaluate(async () => {
    if ('fonts' in document) await document.fonts.ready;
  }).catch(() => undefined);
  await sleep(300);
}

async function findDemoResumeId(page) {
  await gotoStable(page, '/', null);
  return page.evaluate(async () => {
    const response = await fetch('/next-api/resumes', { credentials: 'include' });
    if (!response.ok) throw new Error(`resume list failed: ${response.status}`);
    const list = await response.json();
    const found = Array.isArray(list)
      ? list.find((item) => item.title === '截图演示简历' || item.title === '张明-AI产品经理简历') || list[0]
      : null;
    if (!found?.id) throw new Error('no demo resume found');
    return found.id;
  });
}

async function openEditor(page, resumeId) {
  await page.goto('about:blank').catch(() => undefined);
  await gotoStable(page, `/editor/${resumeId}`, '模块管理');
}

async function closeSidebar(page) {
  await page.evaluate(() => {
    const close = document.querySelector('[aria-label="关闭侧边栏"]');
    if (close instanceof HTMLElement) close.click();
  }).catch(() => undefined);
  await sleep(500);
}

async function clickVisibleTextButton(page, text) {
  const rect = await page.evaluate((targetText) => {
    const isVisible = (el) => {
      const box = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const button = Array.from(document.querySelectorAll('button'))
      .find((node) => isVisible(node) && (node.textContent || '').includes(targetText));
    if (!button) return null;
    const box = button.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  }, text);
  if (!rect) throw new Error(`button not found: ${text}`);
  await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await sleep(600);
}

async function clickLayoutSettingsTab(page) {
  const hasSettingsTab = await page.$('[role="tab"][aria-controls*="content-settings"]');
  if (!hasSettingsTab) {
    await clickVisibleTextButton(page, '排版美化');
  }
  await page.waitForSelector('[role="tab"][aria-controls*="content-settings"]', { timeout: 10000 });
  await page.focus('[role="tab"][aria-controls*="content-settings"]');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.body.innerText.includes('文字排版'), { timeout: 10000 });
  await sleep(500);
}

async function capturePage(page, relativePath) {
  await cleanupPage(page);
  const absolutePath = resolveAsset(relativePath);
  await ensureDirFor(absolutePath);
  await page.screenshot({ path: absolutePath });
  return relativePath;
}

async function captureThemeProcess(page, resumeId) {
  await openEditor(page, resumeId);
  await closeSidebar(page);
  const before = await capturePage(page, 'screenshots/raw/desktop/editor-process-theme-before-purple-desktop.png');

  await openEditor(page, resumeId);
  await clickLayoutSettingsTab(page);
  await page.evaluate(() => {
    const target = Array.from(document.querySelectorAll('h4, div, span, label'))
      .find((node) => (node.textContent || '').includes('色彩风格'));
    target?.scrollIntoView({ block: 'center', inline: 'nearest' });
  });
  await sleep(500);
  await page.focus('[aria-label="选择主题主色"]');
  await page.keyboard.press('Enter');
  await sleep(300);
  await page.click('[aria-label="选择颜色 #2563EB"]');
  await sleep(900);
  await closeSidebar(page);
  const after = await capturePage(page, 'screenshots/raw/desktop/editor-process-theme-after-blue-desktop.png');

  return { before, after };
}

async function captureTemplateProcess(page, resumeId) {
  await gotoStable(page, '/editor?template=xinghe', '模块管理');
  await page.waitForSelector('[data-template-id="xinghe"][aria-pressed="true"]', { timeout: 15000 });
  await sleep(900);
  await closeSidebar(page);
  const before = await capturePage(page, 'screenshots/raw/desktop/editor-process-template-before-xinghe-desktop.png');

  await gotoStable(page, '/editor?template=lanzhe', '模块管理');
  await page.waitForSelector('[data-template-id="lanzhe"][aria-pressed="true"]', { timeout: 15000 });
  await page.waitForSelector('.lanzhe-header-band', { timeout: 15000 });
  await sleep(900);
  await closeSidebar(page);
  const after = await capturePage(page, 'screenshots/raw/desktop/editor-process-template-after-lanzhe-desktop.png');

  return { before, after };
}

async function captureAiOptimizeFinal(page, resumeId) {
  await openEditor(page, resumeId);
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll('button'))
      .find((node) => (node.textContent || '').includes('AI一键优化'));
    if (button instanceof HTMLElement) button.click();
  });
  await page.waitForFunction(() => document.body.innerText.includes('目标岗位 JD'), { timeout: 15000 });
  await page.waitForFunction(() => !document.body.innerText.includes('今日剩余 ...'), { timeout: 8000 }).catch(() => undefined);
  await page.evaluate((text) => {
    const textarea = document.querySelector('textarea');
    if (!(textarea instanceof HTMLTextAreaElement)) return;
    textarea.focus();
    textarea.value = text;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }, jdText);
  await sleep(500);
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll('button'))
      .find((node) => (node.textContent || '').includes('一键优化简历'));
    if (button instanceof HTMLElement) button.click();
  });
  await page.waitForFunction(() => document.body.innerText.includes('应用选中的'), { timeout: 20000 });
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll('button'))
      .find((node) => (node.textContent || '').includes('应用选中的'));
    if (button instanceof HTMLElement) button.click();
  });
  await sleep(900);
  await closeSidebar(page);
  return capturePage(page, 'screenshots/raw/desktop/editor-process-ai-optimize-final-applied-desktop.png');
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
          <stop offset="58%" stop-color="#eef2ff"/>
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
  return output;
}

async function upsertIndex(entries) {
  const index = JSON.parse(await fs.readFile(indexPath, 'utf8'));
  const byId = new Map((index.screenshots ?? []).map((item) => [item.id, item]));
  for (const entry of entries) {
    const source = resolveAsset(entry.file);
    const metadata = existsSync(source) ? await sharp(source).metadata() : {};
    byId.set(entry.id, {
      ...byId.get(entry.id),
      ...entry,
      actual_size: {
        width: metadata.width ?? null,
        height: metadata.height ?? null,
      },
    });
  }
  index.generated_at = new Date().toISOString();
  index.base_url = baseUrl;
  index.screenshots = Array.from(byId.values());
  index.capture_notes = {
    ...(index.capture_notes ?? {}),
    last_process_comparison_capture: {
      captured_at: new Date().toISOString(),
      added_or_updated: entries.length,
      rule: 'Process assets are derived Xiaohongshu-ready comparison cards. They reference raw product screenshots and may include labels.',
    },
  };
  await fs.writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  return index;
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);
  await setupRequestMocks(page);

  const entries = [];
  try {
    const resumeId = await findDemoResumeId(page);
    console.log(`[setup] resume ${resumeId}`);

    const theme = await captureThemeProcess(page, resumeId);
    const template = await captureTemplateProcess(page, resumeId);
    const aiFinal = await captureAiOptimizeFinal(page, resumeId);

    const themeCard = await makeVerticalProcessCard({
      title: '主题色切换前后对比',
      subtitle: '同一份简历，换主色后视觉风格马上变化',
      frames: [
        { label: '切换前：默认紫色主题', file: theme.before },
        { label: '切换后：蓝色主题效果', file: theme.after },
      ],
      output: 'screenshots/process/process-theme-color-before-after.png',
    });

    const templateCard = await makeVerticalProcessCard({
      title: '模板切换前后对比',
      subtitle: '内容不重写，版式和气质直接换一套',
      frames: [
        { label: '切换前：星河模板', file: template.before },
        { label: '切换后：蓝折模板', file: template.after },
      ],
      output: 'screenshots/process/process-template-switch-before-after.png',
    });

    const aiGenerateCard = await makeVerticalProcessCard({
      title: 'AI 生成到排版成品',
      subtitle: '先输入岗位和经历，再得到可编辑的排版简历',
      frames: [
        { label: '输入：告诉 AI 求职方向', file: 'screenshots/raw/vertical/ai-resume-wizard-vertical.png' },
        { label: '结果：生成排版好的简历', file: 'screenshots/raw/desktop/editor-pc-workbench-overview-desktop.png' },
      ],
      output: 'screenshots/process/process-ai-generate-input-to-formatted-resume.png',
    });

    const aiOptimizeCard = await makeVerticalProcessCard({
      title: 'AI 按 JD 优化流程',
      subtitle: '从粘贴 JD，到预览优化，再应用到简历',
      frames: [
        { label: '1 输入：粘贴目标岗位 JD', file: 'screenshots/raw/desktop/editor-pc-ai-optimize-input-desktop.png' },
        { label: '2 预览：原文和优化后对比', file: 'screenshots/raw/desktop/editor-pc-ai-optimize-preview-desktop.png' },
        { label: '3 成品：应用后回到排版简历', file: aiFinal },
      ],
      output: 'screenshots/process/process-ai-optimize-input-preview-final.png',
    });

    entries.push(
      {
        id: 'process-theme-color-before-after',
        file: themeCard,
        asset_type: 'process-comparison',
        page: '主题色切换前后对比图',
        summary: '展示同一份简历从默认紫色主题切换到蓝色主题后的视觉变化，适合说明主题切换不是抽象功能，而是能直接改变最终简历风格。',
        visible_elements: ['切换前简历', '切换后简历', '主题色变化', '同一份简历内容'],
        features: ['主题色切换', '简历风格调整', '前后对比'],
        scenarios: ['用户想看换主题色后的真实变化', '推广主题切换能力', '说明简历视觉风格可定制'],
        best_for: ['前后对比图', '小红书过程图', '编辑卖点展示'],
        not_for: ['AI 生成流程', '导出菜单'],
        visual_notes: '竖版 1080x1350，对比标签已加，适合作为小红书正文图。',
        annotation_suggestions: ['可追加圈出标题颜色变化', '不要覆盖简历主体'],
        source_files: [theme.before, theme.after],
      },
      {
        id: 'process-template-switch-before-after',
        file: templateCard,
        asset_type: 'process-comparison',
        page: '模板切换前后对比图',
        summary: '展示同一份简历从星河模板切换到蓝折模板后的排版差异，蓝色折纸页眉和立体签条模块能更直观说明“内容不用重写，版式和气质直接换一套”。',
        visible_elements: ['星河模板', '蓝折模板', '同一份简历内容', '模板前后变化'],
        features: ['模板切换', '多模板预览', '一键换版式'],
        scenarios: ['投递不同岗位想换模板', '用户想看模板切换效果', '展示精美模板能力'],
        best_for: ['前后对比图', '模板卖点图', '小红书正文图'],
        not_for: ['AI 优化结果', '移动端表单'],
        visual_notes: '两张截图使用同一份内容，适合强调“只换模板，不重填内容”。',
        annotation_suggestions: ['标出模板名称', '突出同一内容不同版式'],
        source_files: [template.before, template.after],
      },
      {
        id: 'process-ai-generate-input-to-formatted-resume',
        file: aiGenerateCard,
        asset_type: 'process-comparison',
        page: 'AI 生成到排版成品流程图',
        summary: '展示从 AI 生成输入页到生成排版好简历的结果页，适合解释用户不是只得到一段文字，而是得到可编辑、可导出的简历成品。',
        visible_elements: ['AI 输入页', '岗位和经历输入', '排版后简历', '编辑器工作台'],
        features: ['AI 生成简历', '生成后自动排版', '可编辑简历成品'],
        scenarios: ['用户担心 AI 只生成文本', '需要展示从输入到成品', '推广 AI 简历制作流程'],
        best_for: ['流程图', 'AI 生成卖点图', '小红书核心功能图'],
        not_for: ['主题色对比', '模块管理'],
        visual_notes: '适合作为 AI 生成主题笔记的第 2 或第 3 张图。',
        annotation_suggestions: ['强调输入到成品', '可追加箭头连接两步'],
        source_files: ['screenshots/raw/vertical/ai-resume-wizard-vertical.png', 'screenshots/raw/desktop/editor-pc-workbench-overview-desktop.png'],
      },
      {
        id: 'process-ai-optimize-input-preview-final',
        file: aiOptimizeCard,
        asset_type: 'process-comparison',
        page: 'AI 按 JD 优化三步流程图',
        summary: '展示 AI 一键优化从粘贴 JD、查看优化预览，到应用后回到排版简历的三步过程，适合说明 AI 不会黑箱改写，用户可以先审核再应用。',
        visible_elements: ['JD 输入', 'AI 优化预览', '原文和优化后对比', '应用后简历成品'],
        features: ['AI 一键优化', '按 JD 优化', '优化前后预览', '应用到排版简历'],
        scenarios: ['投递前按 JD 改简历', '用户担心 AI 改坏内容', '需要展示 AI 优化完整链路'],
        best_for: ['三步流程图', 'AI 优化卖点图', '小红书过程图'],
        not_for: ['模板选择', '移动端填写'],
        visual_notes: '三段式流程完整，适合解释从输入到结果的因果关系。',
        annotation_suggestions: ['可强调先预览再应用', '标出 JD 输入和应用按钮'],
        source_files: ['screenshots/raw/desktop/editor-pc-ai-optimize-input-desktop.png', 'screenshots/raw/desktop/editor-pc-ai-optimize-preview-desktop.png', aiFinal],
      },
    );

    const index = await upsertIndex(entries);
    console.log(JSON.stringify({ processAssets: entries.length, totalIndexed: index.screenshots.length }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
