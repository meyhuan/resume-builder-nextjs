import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_LOG_FILE = path.join('docs', 'seo', 'marketing-publish-log.json');
const METRIC_FIELDS = ['views', 'likes', 'collects', 'comments', 'shares', 'followers', 'clicks', 'reads'];

function parseArgs(argv) {
  const args = { metrics: {}, logFile: DEFAULT_LOG_FILE };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];
    if (token === '--slug') {
      args.slug = next;
      index += 1;
    } else if (token === '--url') {
      args.url = next;
      index += 1;
    } else if (token === '--notes') {
      args.notes = next;
      index += 1;
    } else if (token === '--log-file') {
      args.logFile = next;
      index += 1;
    } else if (token === '--help' || token === '-h') {
      args.help = true;
    } else if (token.startsWith('--')) {
      const field = token.slice(2);
      if (!METRIC_FIELDS.includes(field)) {
        throw new Error(`Unknown metric: ${token}`);
      }
      args.metrics[field] = parseMetric(next);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
node scripts/update-marketing-metrics.mjs --slug douyin-resume-click-to-edit --views 1200 --likes 18 --collects 9 --comments 2 --shares 1 --notes "24h"
`);
}

function parseMetric(value) {
  if (value == null) throw new Error('Metric value is required.');
  const normalized = String(value).replace(/,/g, '').trim();
  const number = Number(normalized);
  if (!Number.isFinite(number)) throw new Error(`Invalid metric value: ${value}`);
  return number;
}

function readJson(file) {
  if (!fs.existsSync(file)) throw new Error(`File not found: ${file}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (!args.slug && !args.url) throw new Error('Use --slug or --url to identify a record.');
  if (!Object.keys(args.metrics).length && !args.notes) throw new Error('No metrics or notes provided.');

  const logFile = path.resolve(args.logFile);
  const log = readJson(logFile);
  const index = log.records.findIndex((record) => {
    if (args.slug) return record.slug === args.slug;
    return record.published_url === args.url;
  });
  if (index < 0) throw new Error(`Record not found: ${args.slug || args.url}`);

  const record = log.records[index];
  const previousMetrics = record.metrics || {};
  const updatedAt = new Date().toISOString();
  const snapshot = {
    captured_at: updatedAt,
    metrics: args.metrics,
    notes: args.notes || '',
  };

  record.metrics = {
    views: previousMetrics.views ?? null,
    likes: previousMetrics.likes ?? null,
    collects: previousMetrics.collects ?? null,
    comments: previousMetrics.comments ?? null,
    shares: previousMetrics.shares ?? null,
    followers: previousMetrics.followers ?? null,
    clicks: previousMetrics.clicks ?? null,
    reads: previousMetrics.reads ?? null,
    ...args.metrics,
    notes: args.notes ?? previousMetrics.notes ?? '',
    updated_at: updatedAt,
  };
  record.metric_history = [...(record.metric_history || []), snapshot];
  record.updated_at = updatedAt;
  log.records[index] = record;
  log.updated_at = updatedAt;

  fs.writeFileSync(logFile, `${JSON.stringify(log, null, 2)}\n`);
  console.log(`Updated metrics for ${record.slug}`);
  console.log(JSON.stringify(record.metrics, null, 2));
}

main();
