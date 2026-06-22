import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const OUTPUT_FILE = path.join('docs', 'seo', 'marketing-workbench.html');
const SCREENSHOT_INDEX = path.join('screenshots', 'index', 'screenshot-index.json');
const PUBLISH_LOG = path.join('docs', 'seo', 'marketing-publish-log.json');
const NOTES_DIR = path.join('docs', 'seo', 'offsite-aeo-notes');
const PACKAGES_DIR = path.join('screenshots', 'notes');

function parseArgs(argv) {
  return {
    open: argv.includes('--open'),
  };
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function walkFiles(dir, matcher, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, matcher, results);
    } else if (matcher(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

function getScreenshotStats() {
  const data = readJson(SCREENSHOT_INDEX, { screenshots: [] });
  const screenshots = Array.isArray(data) ? data : data.screenshots || [];
  const byViewport = countBy(screenshots, (item) => item.viewport || 'unknown');
  const byBestFor = new Map();

  for (const item of screenshots) {
    for (const tag of item.best_for || []) {
      byBestFor.set(tag, (byBestFor.get(tag) || 0) + 1);
    }
  }

  return {
    count: screenshots.length,
    byViewport,
    topBestFor: [...byBestFor.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
  };
}

function getPublishPackages() {
  return walkFiles(PACKAGES_DIR, (file) => path.basename(file) === 'publish-task.json')
    .map((file) => {
      const task = readJson(file, {});
      return {
        ...task,
        task_file: normalizePath(file),
        checklist_file: normalizePath(path.join(path.dirname(file), 'publish-checklist.html')),
        cover_strategy_file: normalizePath(path.join(path.dirname(file), 'cover-strategy.html')),
        platform_images_file: normalizePath(path.join(path.dirname(file), 'platform-images.html')),
      };
    })
    .filter((task) => task.status !== 'archived')
    .sort((a, b) => String(b.publish?.published_at || b.generated_at || '').localeCompare(String(a.publish?.published_at || a.generated_at || '')));
}

function getContentDrafts() {
  return walkFiles(NOTES_DIR, (file) => file.endsWith('.md'))
    .filter((file) => path.basename(file).toLowerCase() !== 'readme.md')
    .map((file) => {
      const content = fs.readFileSync(file, 'utf8');
      const title = content.match(/^#\s+(.+)$/m)?.[1] || path.basename(file);
      return {
        file: normalizePath(file),
        title,
        platform: inferPlatform(path.basename(file)),
        length: content.length,
        updated_at: fs.statSync(file).mtime.toISOString(),
      };
    })
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

function inferPlatform(name) {
  if (name.includes('xhs')) return '小红书';
  if (name.includes('wechat-image')) return '公众号贴图';
  if (name.includes('wechat') || name.includes('weixin') || name.includes('公众号')) return '公众号贴图';
  if (name.includes('douyin') || name.includes('抖音')) return '抖音图文';
  if (name.includes('zhihu')) return '知乎';
  if (name.includes('juejin')) return '掘金/CSDN';
  if (name.includes('v2ex')) return 'V2EX';
  return '其他';
}

function countBy(items, getter) {
  const counts = {};
  for (const item of items) {
    const key = getter(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function normalizePath(file) {
  return file.replaceAll(path.sep, '/');
}

function fileHref(file) {
  return encodeURI(path.relative(path.dirname(OUTPUT_FILE), file).replaceAll(path.sep, '/'));
}

function absoluteHref(file) {
  return encodeURI(path.resolve(file).replaceAll(path.sep, '/'));
}

function statusLabel(status) {
  const labels = {
    draft: '草稿',
    ready_for_review: '待审核发布',
    scheduled: '已定时',
    published: '已发布',
    needs_fix: '需修正',
    archived: '已归档',
  };
  return labels[status] || status || '未知';
}

function getNextActions(packages, drafts, log) {
  const actions = [];
  const ready = packages.filter((item) => item.status === 'ready_for_review');
  const publishedWithoutMetrics = (log.records || []).filter(
    (item) => item.status === 'published' && item.metrics?.views == null,
  );
  const socialDrafts = drafts.filter((item) => ['小红书', '微信公众号', '抖音图文'].includes(item.platform));

  if (ready.length) {
    actions.push(`有 ${ready.length} 个发布包待人工检查和发布。`);
  }
  if (publishedWithoutMetrics.length) {
    actions.push(`有 ${publishedWithoutMetrics.length} 篇已发布笔记还没有回填数据表现。`);
  }
  if (socialDrafts.length > packages.length) {
    actions.push(`有社媒草稿尚未生成发布包，可继续做成待发布任务。`);
  }
  actions.push('下一组内容建议围绕 AI 生成、JD 匹配、模板切换、模块拖拽，分别改写成小红书、公众号和抖音图文。');

  return actions;
}

function renderWorkbench() {
  const screenshotStats = getScreenshotStats();
  const packages = getPublishPackages();
  const drafts = getContentDrafts();
  const log = readJson(PUBLISH_LOG, { records: [] });
  const publishedCount = packages.filter((item) => item.status === 'published').length;
  const readyCount = packages.filter((item) => item.status === 'ready_for_review').length;
  const nextActions = getNextActions(packages, drafts, log);

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>智简简历营销工作台</title>
  <style>
    :root { color-scheme: light; --line:#e5e7eb; --text:#171717; --muted:#6b7280; --bg:#f8fafc; --panel:#fff; --brand:#0f766e; }
    body { margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--text); background: var(--bg); }
    header { padding: 28px 36px 20px; background: #ffffff; border-bottom: 1px solid var(--line); }
    main { padding: 28px 36px 48px; max-width: 1280px; margin: 0 auto; }
    h1 { margin: 0; font-size: 28px; }
    h2 { margin: 0 0 14px; font-size: 18px; }
    p { margin: 6px 0; color: var(--muted); }
    a { color: #155dfc; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .grid { display: grid; gap: 16px; }
    .stats { grid-template-columns: repeat(4, minmax(0, 1fr)); margin-bottom: 20px; }
    .two { grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr); }
    .panel { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 18px; }
    .stat strong { display: block; font-size: 30px; line-height: 1.1; }
    .stat span { color: var(--muted); font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
    th { color: #374151; font-weight: 650; background: #f9fafb; }
    .pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 3px 9px; background: #ecfdf5; color: #047857; font-size: 12px; }
    .muted { color: var(--muted); }
    .actions li { margin-bottom: 8px; }
    .links { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 12px; }
    .links a { border: 1px solid var(--line); border-radius: 6px; padding: 7px 10px; background: #fff; }
    .score { font-weight: 700; color: var(--brand); }
    @media (max-width: 900px) { .stats, .two { grid-template-columns: 1fr; } header, main { padding-left: 18px; padding-right: 18px; } }
  </style>
</head>
<body>
<header>
  <h1>智简简历营销工作台</h1>
  <p>更新时间：${escapeHtml(new Date().toLocaleString('zh-CN', { hour12: false }))}</p>
  <div class="links">
    <a href="${fileHref(PUBLISH_LOG)}">发布记录总表</a>
    <a href="${fileHref(SCREENSHOT_INDEX)}">截图索引</a>
    <a href="${fileHref(path.join('screenshots', 'index', 'product-feature-map.md'))}">产品功能地图</a>
    <a href="${fileHref(path.join('docs', 'seo', 'xiaohongshu-publishing-automation.md'))}">发布自动化说明</a>
  </div>
</header>
<main>
  <section class="grid stats">
    ${renderStat('截图资产', screenshotStats.count, '可用于内容配图的索引截图')}
    ${renderStat('内容草稿', drafts.length, '站外 AEO/社媒/知乎草稿')}
    ${renderStat('发布包', packages.length, '已生成的可发布任务')}
    ${renderStat('已发布', publishedCount, `待发布 ${readyCount} 篇`)}
  </section>

  <section class="grid two">
    <div class="panel">
      <h2>下一步</h2>
      <ul class="actions">${nextActions.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </div>
    <div class="panel">
      <h2>截图图库</h2>
      ${renderKeyValues(screenshotStats.byViewport)}
      <p class="muted">高频用途：${screenshotStats.topBestFor.map(([name, count]) => `${escapeHtml(name)} ${count}`).join('；')}</p>
    </div>
  </section>

  <section class="panel" style="margin-top:16px;">
    <h2>平台发布包</h2>
    ${renderPackagesTable(packages)}
  </section>

  <section class="panel" style="margin-top:16px;">
    <h2>内容草稿</h2>
    ${renderDraftsTable(drafts)}
  </section>

  <section class="panel" style="margin-top:16px;">
    <h2>发布记录</h2>
    ${renderLogTable(log.records || [])}
  </section>
</main>
</body>
</html>`;
}

function renderStat(label, value, detail) {
  return `<div class="panel stat"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span><p>${escapeHtml(detail)}</p></div>`;
}

function renderKeyValues(values) {
  const rows = Object.entries(values);
  if (!rows.length) return '<p class="muted">暂无数据</p>';
  return `<table><tbody>${rows
    .map(([key, value]) => `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`)
    .join('')}</tbody></table>`;
}

function renderPackagesTable(packages) {
  if (!packages.length) return '<p class="muted">暂无发布包</p>';
  return `<table>
    <thead><tr><th>标题</th><th>平台</th><th>封面策略</th><th>状态</th><th>图片</th><th>入口</th><th>链接</th></tr></thead>
    <tbody>${packages
      .map(
        (item) => `<tr>
          <td>${escapeHtml(item.title || item.slug)}</td>
          <td>${escapeHtml(platformLabel(item.platform))}</td>
          <td>${renderCoverStrategyCell(item)}</td>
          <td><span class="pill">${escapeHtml(statusLabel(item.status))}</span></td>
          <td>${escapeHtml(item.images?.length || 0)}</td>
          <td><a href="${fileHref(item.checklist_file)}">发布清单</a> · ${fs.existsSync(item.cover_strategy_file) ? `<a href="${fileHref(item.cover_strategy_file)}">封面策略</a> · ` : ''}${fs.existsSync(item.platform_images_file) ? `<a href="${fileHref(item.platform_images_file)}">成品图</a> · ` : ''}<a href="${fileHref(item.task_file)}">JSON</a></td>
          <td>${item.publish?.published_url ? `<a href="${escapeHtml(item.publish.published_url)}">打开笔记</a>` : '<span class="muted">未发布</span>'}</td>
        </tr>`,
      )
      .join('')}</tbody>
  </table>`;
}

function renderCoverStrategyCell(item) {
  const recommended = item.cover_strategy?.recommended;
  if (!recommended) return '<span class="muted">未生成</span>';
  return `<strong>${escapeHtml(recommended.title)}</strong><br><span class="score">${escapeHtml(recommended.total_score)}/${escapeHtml(recommended.max_score)}</span> <span class="muted">${escapeHtml(recommended.angle)}</span>`;
}

function platformLabel(platform) {
  const labels = {
    xiaohongshu: '小红书',
    wechat: '微信公众号',
    wechat_image: '公众号贴图',
    douyin: '抖音图文',
    zhihu: '知乎',
  };
  return labels[platform] || platform || '未知';
}

function renderDraftsTable(drafts) {
  if (!drafts.length) return '<p class="muted">暂无草稿</p>';
  return `<table>
    <thead><tr><th>标题</th><th>平台</th><th>文件</th><th>更新时间</th></tr></thead>
    <tbody>${drafts
      .map(
        (item) => `<tr>
          <td>${escapeHtml(item.title)}</td>
          <td>${escapeHtml(item.platform)}</td>
          <td><a href="${fileHref(item.file)}">${escapeHtml(item.file)}</a></td>
          <td>${escapeHtml(item.updated_at.slice(0, 10))}</td>
        </tr>`,
      )
      .join('')}</tbody>
  </table>`;
}

function renderLogTable(records) {
  if (!records.length) return '<p class="muted">暂无发布记录</p>';
  return `<table>
    <thead><tr><th>标题</th><th>平台</th><th>发布时间</th><th>复查</th></tr></thead>
    <tbody>${records
      .map(
        (item) => `<tr>
          <td>${escapeHtml(item.title)}<br><a href="${escapeHtml(item.published_url)}">发布链接</a></td>
          <td>${escapeHtml(platformLabel(item.platform))}</td>
          <td>${escapeHtml(item.published_at || '-')}</td>
          <td>24h ${escapeHtml(item.review_due?.after_24h?.slice(0, 10) || '-')}<br>72h ${escapeHtml(item.review_due?.after_72h?.slice(0, 10) || '-')}<br>7d ${escapeHtml(item.review_due?.after_7d?.slice(0, 10) || '-')}</td>
        </tr>`,
      )
      .join('')}</tbody>
  </table>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function openFile(file) {
  const target = path.resolve(file);
  const command = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', target] : [target];
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.unref();
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, renderWorkbench());
  console.log(`Generated marketing workbench: ${path.resolve(OUTPUT_FILE)}`);
  if (args.open) openFile(OUTPUT_FILE);
}

main();
