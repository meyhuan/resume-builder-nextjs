import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_LOG_FILE = path.join('docs', 'seo', 'marketing-publish-log.json');

function parseArgs(argv) {
  const args = { logFile: DEFAULT_LOG_FILE };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];
    if (token === '--log-file') {
      args.logFile = next;
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
node scripts/sync-xhs-publish-log.mjs screenshots/notes/<slug>/publish-task.json
`);
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function daysAfter(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

function taskToRecord(task, taskFile) {
  const publishedAt = task.publish?.published_at || '';
  return {
    slug: task.slug,
    platform: task.platform,
    status: task.status,
    title: task.title,
    published_url: task.publish?.published_url || '',
    published_at: publishedAt,
    note_file: path.join(path.dirname(taskFile), 'note.md').replaceAll(path.sep, '/'),
    task_file: taskFile.replaceAll(path.sep, '/'),
    image_count: task.images?.length || 0,
    image_roles: (task.images || []).map((image) => image.role),
    hashtags: task.hashtags || [],
    review_due: publishedAt
      ? {
          after_24h: daysAfter(publishedAt, 1),
          after_72h: daysAfter(publishedAt, 3),
          after_7d: daysAfter(publishedAt, 7),
        }
      : {},
    metrics: {
      views: null,
      likes: null,
      collects: null,
      comments: null,
      shares: null,
      updated_at: '',
    },
    updated_at: new Date().toISOString(),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (!args.taskFile) throw new Error('Missing publish task path.');

  const taskFile = path.resolve(args.taskFile);
  if (!fs.existsSync(taskFile)) {
    throw new Error(`Publish task not found: ${taskFile}`);
  }

  const task = readJson(taskFile);
  const logFile = path.resolve(args.logFile);
  const log = readJson(logFile, {
    generated_at: new Date().toISOString(),
    updated_at: '',
    records: [],
  });

  const relativeTaskFile = path.relative(process.cwd(), taskFile);
  const record = taskToRecord(task, relativeTaskFile);
  const existingIndex = log.records.findIndex((item) => item.slug === record.slug);
  if (existingIndex >= 0) {
    const existing = log.records[existingIndex];
    log.records[existingIndex] = {
      ...existing,
      ...record,
      metrics: existing.metrics || record.metrics,
      metric_history: existing.metric_history || record.metric_history,
    };
  } else {
    log.records.push(record);
  }

  log.records.sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
  log.updated_at = new Date().toISOString();
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.writeFileSync(logFile, `${JSON.stringify(log, null, 2)}\n`);

  console.log(`Synced marketing publish log: ${logFile}`);
  console.log(`Records: ${log.records.length}`);
}

main();
