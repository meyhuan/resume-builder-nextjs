import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import sharp from 'sharp';

const PLATFORM_IMAGE_RULES = {
  xiaohongshu: {
    cover: [{ width: 1080, height: 1440 }, { width: 1242, height: 1660 }, { width: 1080, height: 1350 }],
    body: [{ width: 1080, height: 1440 }, { width: 1080, height: 1350 }, { width: 1080, height: 1080 }],
  },
  wechat: {
    cover: [{ width: 900, height: 383 }, { width: 500, height: 500 }],
    body: [{ width: 900, height: null }, { width: 1080, height: null }],
  },
  wechat_image: {
    cover: [{ width: 1080, height: 1440 }, { width: 1242, height: 1660 }],
    body: [{ width: 1080, height: 1440 }, { width: 1242, height: 1660 }],
  },
  douyin: {
    cover: [{ width: 1242, height: 1660 }, { width: 1080, height: 1920 }, { width: 1080, height: 1440 }],
    body: [{ width: 1242, height: 1660 }, { width: 1080, height: 1920 }, { width: 1080, height: 1440 }],
  },
};

function parseArgs(argv) {
  const args = { open: false };
  for (const token of argv) {
    if (token === '--open') {
      args.open = true;
    } else if (token === '--help' || token === '-h') {
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
node scripts/xhs-publish-assistant.mjs screenshots/notes/<slug>/publish-task.json --open
`);
}

function readTask(taskFile) {
  if (!taskFile) {
    throw new Error('Missing publish task path.');
  }
  if (!fs.existsSync(taskFile)) {
    throw new Error(`Publish task not found: ${taskFile}`);
  }
  return JSON.parse(fs.readFileSync(taskFile, 'utf8'));
}

async function validateTask(task, packageDir) {
  const errors = [];
  const warnings = [];
  const supportedPlatforms = ['xiaohongshu', 'wechat', 'wechat_image', 'douyin'];

  if (!supportedPlatforms.includes(task.platform)) {
    errors.push(`platform must be one of: ${supportedPlatforms.join(', ')}.`);
  }
  if (!task.title?.trim()) errors.push('title is required.');
  if (!task.body?.trim()) errors.push('body is required.');
  if (!Array.isArray(task.hashtags) || task.hashtags.length === 0) errors.push('hashtags are required.');
  const imagesToValidate = task.platform_assets?.images?.length ? task.platform_assets.images : task.images;
  if (!Array.isArray(imagesToValidate) || imagesToValidate.length === 0) errors.push('at least one image is required.');
  if (task.platform === 'xiaohongshu' && task.title && task.title.length > 20) warnings.push(`title is ${task.title.length} chars; 小红书标题建议更短。`);
  if (task.platform === 'douyin' && task.title && task.title.length > 18) warnings.push(`title is ${task.title.length} chars; 抖音图文标题建议更短。`);
  if (['xiaohongshu', 'douyin'].includes(task.platform) && imagesToValidate?.length > 9) warnings.push(`images count is ${imagesToValidate.length}; 图文通常建议 3-8 张。`);
  if (imagesToValidate?.length && !['cover', 'share-cover'].includes(imagesToValidate[0].role)) warnings.push('first image is not marked as cover.');

  for (const image of imagesToValidate || []) {
    const imagePath = path.resolve(packageDir, image.file);
    if (!fs.existsSync(imagePath)) {
      errors.push(`image file missing: ${image.file}`);
      continue;
    }
    const metadata = await sharp(imagePath).metadata();
    const ruleType = ['cover', 'share-cover'].includes(image.role) ? 'cover' : 'body';
    const rules = PLATFORM_IMAGE_RULES[task.platform]?.[ruleType] || [];
    const matches = rules.some((rule) => matchesImageRule(metadata, rule));
    if (rules.length && !matches) {
      warnings.push(
        `${image.file} is ${metadata.width}x${metadata.height}; ${platformImageRuleText(task.platform, ruleType)}`,
      );
    }
  }

  return { errors, warnings };
}

function matchesImageRule(metadata, rule) {
  if (rule.height == null) return metadata.width === rule.width;
  const expectedRatio = rule.width / rule.height;
  const actualRatio = metadata.width / metadata.height;
  return Math.abs(actualRatio - expectedRatio) < 0.015 && metadata.width >= Math.min(rule.width, 900);
}

function platformImageRuleText(platform, type) {
  const labels = {
    xiaohongshu: {
      cover: '小红书封面建议 1080x1440/1242x1660，当前 1080x1350 也可用但需确认裁切。',
      body: '小红书正文图建议统一 1080x1440、1080x1350 或 1080x1080。',
    },
    wechat: {
      cover: '公众号封面建议 900x383，另备 500x500 转发卡片图。',
      body: '公众号正文贴图建议宽度 900 或 1080，高度按内容决定。',
    },
    wechat_image: {
      cover: '公众号贴图首图建议 1080x1440 或 1242x1660，适合手机横滑浏览。',
      body: '公众号贴图建议统一 3:4 竖版图片。',
    },
    douyin: {
      cover: '抖音图文封面建议 1242x1660、1080x1440 或 1080x1920。',
      body: '抖音图文建议所有图片统一 3:4 或 9:16。',
    },
  };
  return labels[platform]?.[type] || 'image size does not match recommended platform dimensions.';
}

function openTarget(target) {
  const command = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', target] : [target];
  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const taskFile = path.resolve(args.taskFile);
  const packageDir = path.dirname(taskFile);
  const task = readTask(taskFile);
  const { errors, warnings } = await validateTask(task, packageDir);

  console.log(`Task: ${taskFile}`);
  console.log(`Title: ${task.title}`);
  console.log(`Platform: ${task.platform}`);
  console.log(`Images: ${task.images?.length || 0}`);
  if (task.platform_assets?.images?.length) {
    console.log(`Platform assets: ${task.platform_assets.images.length}`);
  }
  console.log(`Status: ${task.status || 'unknown'}`);

  if (warnings.length) {
    console.log('\nWarnings:');
    for (const warning of warnings) console.log(`- ${warning}`);
  }

  if (errors.length) {
    console.error('\nErrors:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  const checklist = path.resolve(packageDir, 'publish-checklist.html');
  console.log('\nReady for manual confirmation.');
  console.log(`Checklist: ${checklist}`);
  console.log(`Creator: ${task.publish?.creator_url || 'https://creator.xiaohongshu.com/publish/publish'}`);

  if (args.open) {
    if (fs.existsSync(checklist)) openTarget(checklist);
    openTarget(task.publish?.creator_url || 'https://creator.xiaohongshu.com/publish/publish');
  }
}

main();
