import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SPECS = {
  xiaohongshu: {
    label: '小红书',
    card: { width: 1080, height: 1440, type: 'vertical-card' },
  },
  douyin: {
    label: '抖音图文',
    card: { width: 1080, height: 1440, type: 'vertical-card' },
  },
  wechat: {
    label: '微信公众号',
    cover: { width: 900, height: 383, type: 'wide-cover' },
    share: { width: 500, height: 500, type: 'square-cover' },
    body: { width: 1080, type: 'wechat-body' },
  },
  wechat_image: {
    label: '公众号贴图',
    card: { width: 1080, height: 1440, type: 'vertical-card' },
  },
};

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];
    if (token === '--help' || token === '-h') {
      args.help = true;
    } else if (!args.taskFile) {
      args.taskFile = token;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
node scripts/generate-platform-image-assets.mjs screenshots/notes/<slug>/publish-task.json
`);
}

function readTask(taskFile) {
  if (!fs.existsSync(taskFile)) throw new Error(`Publish task not found: ${taskFile}`);
  return JSON.parse(fs.readFileSync(taskFile, 'utf8'));
}

function imageTitle(task, image) {
  if (image.role === 'cover' || image.order === 1) {
    return task.cover_strategy?.recommended?.title || image.overlay_title || task.title;
  }
  return image.overlay_title || task.title;
}

async function createVerticalCard({ source, target, title, subtitle, width, height, platform }) {
  const headerHeight = 260;
  const footerHeight = 120;
  const margin = 64;
  const imageBox = {
    width: width - margin * 2,
    height: height - headerHeight - footerHeight - margin,
  };

  const resized = await sharp(source)
    .resize({ width: imageBox.width, height: imageBox.height, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
  const resizedMeta = await sharp(resized).metadata();
  const imageLeft = Math.round((width - resizedMeta.width) / 2);
  const imageTop = headerHeight + Math.round((imageBox.height - resizedMeta.height) / 2);

  const headerSvg = svg(width, height, `
    <rect width="100%" height="100%" fill="#f7fbfa"/>
    <rect x="0" y="0" width="${width}" height="${headerHeight + 34}" fill="#e9f5f1"/>
    ${textBlock(title, margin, 86, width - margin * 2, 64, '#10201b', 2, 1.08, 32)}
    ${textBlock(subtitle || platform, margin, 194, width - margin * 2, 30, '#47645b', 2, 1.18, 30)}
    <rect x="${imageLeft - 14}" y="${imageTop - 14}" width="${resizedMeta.width + 28}" height="${resizedMeta.height + 28}" rx="28" fill="#ffffff"/>
    <rect x="${imageLeft - 14}" y="${imageTop - 14}" width="${resizedMeta.width + 28}" height="${resizedMeta.height + 28}" rx="28" fill="none" stroke="#d7e4df" stroke-width="2"/>
    <text x="${margin}" y="${height - 58}" font-size="28" fill="#47645b" font-family="Noto Sans SC, Microsoft YaHei, Arial">智简简历｜搜 aijianli.cn 开始 AI 生成简历</text>
  `);

  await sharp(headerSvg)
    .composite([{ input: resized, left: imageLeft, top: imageTop }])
    .png()
    .toFile(target);
}

async function createWideCover({ source, target, title, subtitle, width, height }) {
  const bg = await sharp(source)
    .resize({ width, height, fit: 'cover' })
    .blur(14)
    .modulate({ brightness: 0.75, saturation: 0.8 })
    .png()
    .toBuffer();
  const preview = await sharp(source)
    .resize({ width: 370, height: 260, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
  const meta = await sharp(preview).metadata();
  const previewLeft = width - meta.width - 42;
  const previewTop = Math.round((height - meta.height) / 2);

  const overlay = svg(width, height, `
    <rect width="100%" height="100%" fill="#10201b" opacity="0.72"/>
    ${textBlock(title, 46, 92, 420, 42, '#ffffff', 2, 1.12, 22)}
    ${textBlock(subtitle || '从内容到排版导出', 48, 240, 400, 22, '#d6f2e8', 1, 1.2, 16)}
    <rect x="${previewLeft - 10}" y="${previewTop - 10}" width="${meta.width + 20}" height="${meta.height + 20}" rx="18" fill="#ffffff"/>
  `);

  await sharp(bg)
    .composite([
      { input: overlay, left: 0, top: 0 },
      { input: preview, left: previewLeft, top: previewTop },
    ])
    .png()
    .toFile(target);
}

async function createSquareCover({ source, target, title, subtitle, width, height }) {
  const preview = await sharp(source)
    .resize({ width: 420, height: 250, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
  const meta = await sharp(preview).metadata();

  const overlay = svg(width, height, `
    <rect width="100%" height="100%" fill="#e9f5f1"/>
    ${textBlock(title, 42, 68, 416, 40, '#10201b', 2, 1.12, 18)}
    ${textBlock(subtitle || 'AI 简历完整流程', 44, 176, 410, 22, '#47645b', 1, 1.2, 16)}
    <rect x="${Math.round((width - meta.width) / 2) - 8}" y="230" width="${meta.width + 16}" height="${meta.height + 16}" rx="16" fill="#ffffff"/>
  `);

  await sharp(overlay)
    .composite([{ input: preview, left: Math.round((width - meta.width) / 2), top: 238 }])
    .png()
    .toFile(target);
}

async function createWechatBody({ source, target, title, width }) {
  const screenshot = await sharp(source)
    .resize({ width: width - 96, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
  const meta = await sharp(screenshot).metadata();
  const headerHeight = 148;
  const height = headerHeight + meta.height + 72;
  const left = Math.round((width - meta.width) / 2);

  const background = svg(width, height, `
    <rect width="100%" height="100%" fill="#ffffff"/>
    <rect x="0" y="0" width="${width}" height="${headerHeight}" fill="#f1f8f5"/>
    ${textBlock(title, 48, 54, width - 96, 38, '#10201b', 2, 1.12, 24)}
    <rect x="${left - 10}" y="${headerHeight + 22}" width="${meta.width + 20}" height="${meta.height + 20}" rx="18" fill="#ffffff" stroke="#d7e4df" stroke-width="2"/>
  `);

  await sharp(background)
    .composite([{ input: screenshot, left, top: headerHeight + 32 }])
    .png()
    .toFile(target);
}

function svg(width, height, body) {
  return Buffer.from(`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`);
}

function textBlock(text, x, y, maxWidth, fontSize, color, maxLines, lineHeight = 1.15, charsPerLineOverride) {
  const charsPerLine = charsPerLineOverride || Math.max(6, Math.floor(maxWidth / fontSize));
  const lines = wrapText(text, charsPerLine).slice(0, maxLines);
  return lines
    .map((line, index) => `<text x="${x}" y="${y + index * fontSize * lineHeight}" font-size="${fontSize}" font-weight="700" fill="${color}" font-family="Noto Sans SC, Microsoft YaHei, Arial">${escapeXml(line)}</text>`)
    .join('');
}

function wrapText(text, charsPerLine) {
  const normalized = String(text).replace(/\s+/g, ' ').trim();
  const lines = [];
  let current = '';
  for (const char of normalized) {
    current += char;
    if ([...current].length >= charsPerLine) {
      lines.push(current.trim());
      current = '';
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines.length ? lines : [''];
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function rel(file, base) {
  return path.relative(base, file).replaceAll(path.sep, '/');
}

async function generateAssets(taskFile) {
  const packageDir = path.dirname(taskFile);
  const task = readTask(taskFile);
  const spec = SPECS[task.platform];
  if (!spec) throw new Error(`Unsupported platform: ${task.platform}`);

  const outputDir = path.join(packageDir, 'platform-images');
  fs.mkdirSync(outputDir, { recursive: true });

  const generated = [];
  if (task.platform === 'wechat') {
    const coverImage = task.images.find((image) => image.role === 'cover') || task.images[0];
    const coverSource = path.resolve(packageDir, coverImage.file);
    const coverTitle = task.cover_strategy?.recommended?.title || imageTitle(task, coverImage);
    const coverTarget = path.join(outputDir, 'cover-900x383.png');
    const shareTarget = path.join(outputDir, 'share-500x500.png');
    await createWideCover({ source: coverSource, target: coverTarget, title: coverTitle, subtitle: coverImage.overlay_title, ...spec.cover });
    await createSquareCover({ source: coverSource, target: shareTarget, title: coverTitle, subtitle: coverImage.overlay_title, ...spec.share });
    generated.push({ role: 'cover', file: rel(coverTarget, packageDir), width: 900, height: 383, source: coverImage.file });
    generated.push({ role: 'share-cover', file: rel(shareTarget, packageDir), width: 500, height: 500, source: coverImage.file });

    for (const image of task.images) {
      const source = path.resolve(packageDir, image.file);
      const target = path.join(outputDir, `body-${String(image.order).padStart(2, '0')}-${image.role}.png`);
      await createWechatBody({ source, target, title: image.overlay_title || task.title, width: spec.body.width });
      const meta = await sharp(target).metadata();
      generated.push({ order: image.order, role: `body-${image.role}`, file: rel(target, packageDir), width: meta.width, height: meta.height, source: image.file });
    }
  } else {
    for (const image of task.images) {
      const source = path.resolve(packageDir, image.file);
      const target = path.join(outputDir, `${String(image.order).padStart(2, '0')}-${image.role}-1080x1440.png`);
      await createVerticalCard({
        source,
        target,
        title: imageTitle(task, image),
        subtitle: image.overlay_title,
        width: spec.card.width,
        height: spec.card.height,
        platform: spec.label,
      });
      generated.push({ order: image.order, role: image.role, file: rel(target, packageDir), width: spec.card.width, height: spec.card.height, source: image.file });
    }
  }

  task.platform_assets = {
    generated_at: new Date().toISOString(),
    platform: task.platform,
    status: 'ready',
    output_dir: rel(outputDir, packageDir),
    images: generated,
  };
  fs.writeFileSync(taskFile, `${JSON.stringify(task, null, 2)}\n`);
  writeAssetSheet(packageDir, task);
  refreshPublishChecklistImageSection(packageDir, task);
  console.log(`Generated platform image assets: ${outputDir}`);
  console.log(`Images: ${generated.length}`);
}

function refreshPublishChecklistImageSection(packageDir, task) {
  const checklistFile = path.join(packageDir, 'publish-checklist.html');
  if (!fs.existsSync(checklistFile) || !task.platform_assets?.images?.length) return;

  const html = fs.readFileSync(checklistFile, 'utf8');
  const outputDir = task.platform_assets.output_dir || 'platform-images';
  const imageItems = task.platform_assets.images
    .map((image) => {
      const fileHref = encodeURI(image.file);
      const label = image.order ? `图 ${image.order}` : image.role;
      return `<li>
          <a href="${fileHref}" target="_blank" rel="noreferrer">
            <img src="${fileHref}" alt="${escapeXml(label)}: ${escapeXml(image.role)}">
          </a>
          <div>
            <strong>${escapeXml(label)}</strong>：${escapeXml(image.role)} / ${escapeXml(`${image.width}x${image.height}`)}<br>
            <a href="${fileHref}" target="_blank" rel="noreferrer">${escapeXml(image.file)}</a>
          </div>
        </li>`;
    })
    .join('\n');

  const replacement = `<section>
    <h2>图片顺序</h2>
    <p>这里是<strong>上传平台用的成品图</strong>，不是原始截图。</p>
    <p>
      <a href="${encodeURI(`${outputDir}/`)}" target="_blank" rel="noreferrer">打开成品图片目录</a>
      · <a href="${encodeURI('platform-images.html')}" target="_blank" rel="noreferrer">查看成品图规格表</a>
    </p>
    <ol>${imageItems}</ol>
  </section>`;

  const updated = html.replace(/<section>\s*<h2>图片顺序<\/h2>[\s\S]*?<\/section>/, replacement);
  fs.writeFileSync(checklistFile, updated);
}

function writeAssetSheet(packageDir, task) {
  const rows = task.platform_assets.images
    .map((image) => `<li><a href="${encodeURI(image.file)}" target="_blank"><img src="${encodeURI(image.file)}" alt="${escapeXml(image.role)}"></a><div><strong>${escapeXml(image.role)}</strong><br>${escapeXml(image.width)}x${escapeXml(image.height)}<br>${escapeXml(image.file)}</div></li>`)
    .join('');
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeXml(task.title)} - 平台成品图</title>
  <style>
    body { margin: 32px; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #fafafa; color: #171717; }
    main { max-width: 980px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 28px; }
    ol { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 18px; }
    li { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #fff; }
    img { width: 100%; max-height: 260px; object-fit: contain; background: #f8fafc; border-radius: 6px; }
    a { color: #155dfc; word-break: break-all; }
  </style>
</head>
<body><main><h1>平台成品图</h1><p>${escapeXml(task.platform)} / ${escapeXml(task.title)}</p><ol>${rows}</ol></main></body></html>`;
  fs.writeFileSync(path.join(packageDir, 'platform-images.html'), html);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (!args.taskFile) throw new Error('Missing publish task path.');
  await generateAssets(path.resolve(args.taskFile));
}

main();
