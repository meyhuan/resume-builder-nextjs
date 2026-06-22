import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];
    if (token === '--url') {
      args.url = next;
      index += 1;
    } else if (token === '--at') {
      args.at = next;
      index += 1;
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
node scripts/xhs-mark-published.mjs screenshots/notes/<slug>/publish-task.json --url "https://www.xiaohongshu.com/..."
`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  if (!args.taskFile) throw new Error('Missing publish task path.');
  if (!args.url) throw new Error('Missing --url.');

  const taskFile = path.resolve(args.taskFile);
  if (!fs.existsSync(taskFile)) {
    throw new Error(`Publish task not found: ${taskFile}`);
  }

  const task = JSON.parse(fs.readFileSync(taskFile, 'utf8'));
  task.status = 'published';
  task.publish = {
    ...(task.publish || {}),
    published_url: args.url,
    published_at: args.at || new Date().toISOString(),
  };

  fs.writeFileSync(taskFile, `${JSON.stringify(task, null, 2)}\n`);
  console.log(`Marked as published: ${taskFile}`);
  console.log(`URL: ${task.publish.published_url}`);
  console.log(`Published at: ${task.publish.published_at}`);

  const syncResult = spawnSync(
    process.execPath,
    [path.join('scripts', 'sync-xhs-publish-log.mjs'), taskFile],
    { stdio: 'inherit' },
  );
  if (syncResult.status !== 0) {
    process.exitCode = syncResult.status || 1;
  }
}

main();
