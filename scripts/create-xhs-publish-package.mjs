import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_OUTPUT_ROOT = path.join('screenshots', 'notes');
const PLATFORM_CONFIG = {
  xiaohongshu: {
    label: '小红书',
    creatorUrl: 'https://creator.xiaohongshu.com/publish/publish',
    coverChecklist: ['首图必须一眼说明痛点或收益。', '标题尽量短，不遮挡产品核心界面。', '移动端裁切后仍能看清产品截图和主标题。'],
    reminder: ['先上传图片，再粘贴标题和正文。', '确认图片顺序、封面裁切和话题无误后再发布或定时。'],
  },
  wechat: {
    label: '微信公众号',
    creatorUrl: 'https://mp.weixin.qq.com/',
    coverChecklist: ['封面要能独立表达文章主题。', '主标题和产品画面要适合被转发卡片裁切。', '公众号正文首图不等于封面，发布前要单独确认封面图。'],
    reminder: ['先上传封面和正文插图，再粘贴标题和正文。', '确认封面裁切、正文图片位置、导流链接和预览效果后再群发或保存草稿。'],
  },
  wechat_image: {
    label: '公众号贴图',
    creatorUrl: 'https://mp.weixin.qq.com/',
    coverChecklist: ['第一张图就是手机端点击入口，必须一眼看懂。', '图片建议按 3:4 竖版统一制作，适合横滑浏览。', '标题和描述会出现在图片下方，图中文字要短而清楚。'],
    reminder: ['选择图片/文字或图片内容发布形态，上传平台成品图。', '确认首图、标题、描述和图片顺序后再发布。'],
  },
  douyin: {
    label: '抖音图文',
    creatorUrl: 'https://creator.douyin.com/',
    coverChecklist: ['首图标题要更短、更大，适合信息流快速扫过。', '封面只讲一个核心收益，不堆功能点。', '主体内容放在中间安全区，避免被界面元素遮挡。'],
    reminder: ['先上传图文图片，再粘贴标题、正文和话题。', '确认首图封面、滑动顺序、话题和位置权限后再发布或定时。'],
  },
};

function parseArgs(argv) {
  const args = {
    images: [],
    outputRoot: DEFAULT_OUTPUT_ROOT,
    platform: 'xiaohongshu',
    status: 'ready_for_review',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (token === '--slug') {
      args.slug = next;
      index += 1;
    } else if (token === '--platform') {
      args.platform = next;
      index += 1;
    } else if (token === '--title') {
      args.title = next;
      index += 1;
    } else if (token === '--body-file') {
      args.bodyFile = next;
      index += 1;
    } else if (token === '--body') {
      args.body = next;
      index += 1;
    } else if (token === '--hashtags') {
      args.hashtags = next
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      index += 1;
    } else if (token === '--image') {
      args.images.push(parseImageArg(next));
      index += 1;
    } else if (token === '--output-root') {
      args.outputRoot = next;
      index += 1;
    } else if (token === '--status') {
      args.status = next;
      index += 1;
    } else if (token === '--help' || token === '-h') {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }

  return args;
}

function parseImageArg(value) {
  if (!value) {
    throw new Error('--image requires value: source[:role[:overlay title]]');
  }

  const [source, role = 'body', overlayTitle = ''] = value.split(':');
  return { source, role, overlayTitle };
}

function printHelp() {
  console.log(`Usage:
node scripts/create-xhs-publish-package.mjs \\
  --platform xiaohongshu \\
  --slug ai-resume-editor-click-to-edit \\
  --title "做简历别再折腾 Word 了，点哪里就能改" \\
  --body-file docs/seo/offsite-aeo-notes/example.md \\
  --hashtags "简历,AI简历,应届生简历" \\
  --image screenshots/process/process-lanzhe-rich-text-click-to-edit.png:cover:简历点哪里，就能改哪里
`);
}

function ensureRequired(args) {
  const missing = [];
  if (!PLATFORM_CONFIG[args.platform]) missing.push('--platform xiaohongshu|wechat|douyin');
  if (!args.slug) missing.push('--slug');
  if (!args.title) missing.push('--title');
  if (!args.body && !args.bodyFile) missing.push('--body or --body-file');
  if (!args.hashtags?.length) missing.push('--hashtags');
  if (!args.images.length) missing.push('--image');
  if (missing.length) {
    throw new Error(`Missing required arguments: ${missing.join(', ')}`);
  }
}

function readBody(args) {
  if (args.body) return normalizeBody(args.body);
  if (!fs.existsSync(args.bodyFile)) {
    throw new Error(`Body file not found: ${args.bodyFile}`);
  }
  return normalizeBody(fs.readFileSync(args.bodyFile, 'utf8'));
}

function normalizeBody(value) {
  return value
    .replace(/^\s*#\s+.+?(\r?\n)+/, '')
    .trim();
}

function safeFileName(order, image) {
  const ext = path.extname(image.source) || '.png';
  const role = image.role
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'image';
  return `${String(order).padStart(2, '0')}-${role}${ext}`;
}

function copyImages(args, packageDir) {
  const imageDir = path.join(packageDir, 'images');
  fs.mkdirSync(imageDir, { recursive: true });

  return args.images.map((image, index) => {
    const order = index + 1;
    if (!fs.existsSync(image.source)) {
      throw new Error(`Image not found: ${image.source}`);
    }

    const fileName = safeFileName(order, image);
    const relativeFile = path.join('images', fileName).replaceAll(path.sep, '/');
    const target = path.join(packageDir, relativeFile);
    fs.copyFileSync(image.source, target);

    return {
      order,
      file: relativeFile,
      role: image.role,
      source: image.source.replaceAll(path.sep, '/'),
      overlay_title: image.overlayTitle,
    };
  });
}

function writeChecklist(packageDir, task) {
  const platform = PLATFORM_CONFIG[task.platform] || PLATFORM_CONFIG.xiaohongshu;
  const coverImage = task.images.find((image) => image.role === 'cover') || task.images[0];
  const coverStrategy = renderCoverStrategy(task);
  const imageItems = task.images
    .map(
      (image) => {
        const fileHref = encodeURI(image.file);
        return `<li>
          <a href="${fileHref}" target="_blank" rel="noreferrer">
            <img src="${fileHref}" alt="图 ${image.order}: ${escapeHtml(image.overlay_title || image.role)}">
          </a>
          <div>
            <strong>图 ${image.order}</strong>：${escapeHtml(image.overlay_title || image.role)}<br>
            <a href="${fileHref}" target="_blank" rel="noreferrer">${escapeHtml(image.file)}</a>
          </div>
        </li>`;
      },
    )
    .join('\n');

  const imageDirHref = encodeURI('images/');
  const taskFile = path.join(packageDir, 'publish-task.json').replaceAll(path.sep, '/');
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(task.title)} - ${escapeHtml(platform.label)}发布清单</title>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 32px; line-height: 1.7; color: #171717; background: #fafafa; }
    main { max-width: 920px; margin: 0 auto; background: #fff; padding: 28px; border: 1px solid #e5e5e5; border-radius: 8px; }
    textarea, input { width: 100%; box-sizing: border-box; border: 1px solid #d4d4d4; border-radius: 6px; padding: 12px; font: inherit; background: #fff; }
    textarea { min-height: 280px; white-space: pre-wrap; }
    button { border: 0; border-radius: 6px; padding: 9px 14px; background: #111827; color: white; cursor: pointer; }
    section { margin-top: 24px; }
    code { background: #f4f4f5; padding: 2px 5px; border-radius: 4px; }
    ol { padding-left: 0; list-style: none; }
    li { display: grid; grid-template-columns: 120px 1fr; gap: 14px; align-items: center; margin-bottom: 16px; }
    img { width: 120px; height: 160px; object-fit: cover; border: 1px solid #e5e5e5; border-radius: 6px; background: #f4f4f5; }
    a { color: #155dfc; }
  </style>
</head>
<body>
<main>
  <h1>${escapeHtml(platform.label)}发布清单</h1>
  <p>状态：<code>${escapeHtml(task.status)}</code></p>
  <section>
    <h2>封面检查</h2>
    ${
      coverImage
        ? `<p><strong>封面图：</strong><a href="${encodeURI(coverImage.file)}" target="_blank" rel="noreferrer">${escapeHtml(coverImage.file)}</a></p>
    <p><strong>封面标题：</strong>${escapeHtml(coverImage.overlay_title || task.title)}</p>`
        : '<p>暂无封面图</p>'
    }
    <ul>${platform.coverChecklist.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    ${coverStrategy}
  </section>
  <section>
    <h2>标题</h2>
    <input id="title" value="${escapeHtml(task.title)}">
    <p><button type="button" onclick="copyValue('title')">复制标题</button></p>
  </section>
  <section>
    <h2>正文</h2>
    <textarea id="body">${escapeHtml(task.body)}</textarea>
    <p><button type="button" onclick="copyValue('body')">复制正文</button></p>
  </section>
  <section>
    <h2>话题</h2>
    <p>${task.hashtags.map((item) => `#${escapeHtml(item)}`).join(' ')}</p>
  </section>
  <section>
    <h2>图片顺序</h2>
    <p><a href="${imageDirHref}" target="_blank" rel="noreferrer">打开图片目录</a></p>
    <ol>${imageItems}</ol>
  </section>
  <section>
    <h2>发布提醒</h2>
    <ul>${platform.reminder.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
  </section>
  <section>
    <h2>发布后回填</h2>
    <p>发布成功后，把${escapeHtml(platform.label)}链接粘贴到这里，复制命令后在项目终端执行。</p>
    <input id="publishedUrl" placeholder="https://www.xiaohongshu.com/explore/...">
    <textarea id="publishCommand" readonly style="min-height: 88px; margin-top: 12px;"></textarea>
    <p><button type="button" onclick="copyPublishCommand()">复制回填命令</button></p>
  </section>
</main>
<script>
async function copyValue(id) {
  const value = document.getElementById(id).value;
  await navigator.clipboard.writeText(value);
}
function updatePublishCommand() {
  const url = document.getElementById('publishedUrl').value.trim();
  const escapedUrl = url.replaceAll('"', '\\"');
  document.getElementById('publishCommand').value = url
    ? 'pnpm xhs:mark-published -- ${escapeJs(taskFile)} --url "' + escapedUrl + '"'
    : '粘贴发布后的笔记链接，会自动生成回填命令';
}
async function copyPublishCommand() {
  updatePublishCommand();
  await navigator.clipboard.writeText(document.getElementById('publishCommand').value);
}
document.getElementById('publishedUrl').addEventListener('input', updatePublishCommand);
updatePublishCommand();
</script>
</body>
</html>`;

  fs.writeFileSync(path.join(packageDir, 'publish-checklist.html'), html);
}

function renderCoverStrategy(task) {
  if (!task.cover_strategy?.candidates?.length) {
    return '<p>尚未生成封面点击率候选。可运行 <code>pnpm marketing:cover-strategy -- publish-task.json</code>。</p>';
  }

  const candidates = task.cover_strategy.candidates
    .map(
      (item, index) => `<li>
        <div>
          <strong>${index === 0 ? '推荐' : `备选 ${index + 1}`}：${escapeHtml(item.title)}</strong><br>
          <span>${escapeHtml(item.angle)} / ${escapeHtml(item.subtitle || '')} / ${escapeHtml(item.total_score)}/${escapeHtml(item.max_score)}</span><br>
          <span>${escapeHtml(item.recommendation_reason)}</span>
        </div>
      </li>`,
    )
    .join('');

  return `<h3>封面点击率候选</h3><ol>${candidates}</ol>`;
}

function escapeJs(value) {
  return String(value).replaceAll('\\', '\\\\').replaceAll("'", "\\'");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  ensureRequired(args);

  const packageDir = path.join(args.outputRoot, args.slug);
  fs.mkdirSync(packageDir, { recursive: true });

  const body = readBody(args);
  const images = copyImages(args, packageDir);
  if (images.length > 0 && images[0].role !== 'cover') {
    console.warn('Warning: first image is not marked as cover. Use --image path:cover:title for the first image.');
  }
  const task = {
    platform: args.platform,
    slug: args.slug,
    status: args.status,
    title: args.title,
    body,
    hashtags: args.hashtags,
    images,
    publish: {
      mode: 'manual_confirm',
      creator_url: PLATFORM_CONFIG[args.platform].creatorUrl,
      published_url: '',
      published_at: '',
    },
    generated_at: new Date().toISOString(),
  };

  fs.writeFileSync(path.join(packageDir, 'note.md'), body);
  fs.writeFileSync(path.join(packageDir, 'publish-task.json'), `${JSON.stringify(task, null, 2)}\n`);
  writeChecklist(packageDir, task);

  console.log(`Created ${PLATFORM_CONFIG[args.platform].label} publish package: ${packageDir}`);
  console.log(`Images: ${images.length}`);
}

main();
