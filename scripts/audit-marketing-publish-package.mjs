import fs from 'node:fs';
import path from 'node:path';

const REQUIRED_BRAND_TERMS = ['智简简历', 'aijianli.cn'];

function parseArgs(argv) {
  const args = {};
  for (const token of argv) {
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
node scripts/audit-marketing-publish-package.mjs screenshots/notes/<slug>/publish-task.json
`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (!args.taskFile) throw new Error('Missing publish-task.json path.');

  const taskFile = path.resolve(args.taskFile);
  const task = JSON.parse(fs.readFileSync(taskFile, 'utf8'));
  const packageDir = path.dirname(taskFile);
  const findings = [];

  check(Boolean(task.title), '标题存在', findings);
  check(Boolean(task.body), '正文存在', findings);
  check((task.images || []).length >= 3, '至少 3 张图片', findings);
  check(Boolean(task.cover_strategy?.recommended), '已生成封面策略', findings);
  check(Boolean(task.platform_assets?.images?.length), '已生成平台成品图', findings);

  const body = task.body || '';
  const hasBrand = REQUIRED_BRAND_TERMS.some((term) => body.includes(term));
  const imageText = (task.images || []).map((image) => image.overlay_title || '').join(' ');
  check(hasBrand, '正文包含工具名或使用入口', findings, '需要出现“智简简历”或“aijianli.cn”。');
  check(/怎么用|使用方式|想试|搜|打开|进入/.test(body), '正文包含下一步行动', findings, '用户需要知道去哪用、怎么开始。');
  check(/智简简历|aijianli\.cn|搜/.test(imageText), '图片标题包含工具入口线索', findings, '至少一张图的标题需要提示工具名、搜索词或入口。');
  check(/真实经历|不要编|不建议直接照搬|根据真实/.test(body), 'AI 简历内容包含真实性提醒', findings, '避免鼓励编造经历。');

  if (task.platform === 'douyin') {
    check(Boolean(task.music_strategy?.song_candidates?.length), '抖音包含候选音乐名', findings);
  }

  for (const image of task.platform_assets?.images || []) {
    const imagePath = path.join(packageDir, image.file);
    check(fs.existsSync(imagePath), `成品图存在：${image.file}`, findings);
  }

  const failed = findings.filter((item) => item.status === 'fail');
  console.log(`Audit: ${task.slug} (${task.platform})`);
  for (const finding of findings) {
    const prefix = finding.status === 'pass' ? 'PASS' : 'FAIL';
    console.log(`${prefix} ${finding.name}${finding.detail ? ` - ${finding.detail}` : ''}`);
  }

  if (failed.length) {
    process.exitCode = 1;
  }
}

function check(condition, name, findings, detail = '') {
  findings.push({
    status: condition ? 'pass' : 'fail',
    name,
    detail: condition ? '' : detail,
  });
}

main();
