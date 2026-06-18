#!/usr/bin/env node

const SITE_URL = 'https://aijianli.cn';
const DEFAULT_SITEMAP_URL = `${SITE_URL}/sitemap.xml`;
const INDEX_NOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const BAIDU_PUSH_ENDPOINT = 'https://data.zz.baidu.com/urls';

function printUsage() {
  console.log([
    'Usage: pnpm seo:submit [options]',
    '',
    'Options:',
    '  --dry-run                  Print URLs and payload intent without submitting.',
    '  --url <url>                Add one URL. Can be repeated.',
    '  --urls <file>              Add URLs from a newline-delimited file.',
    '  --sitemap <url>            Load URLs from a sitemap XML. Defaults to https://aijianli.cn/sitemap.xml when no URL is provided.',
    '  --provider <all|baidu|indexnow>',
    '                             Submission provider. Defaults to all.',
    '  --limit <number>           Limit URL count after de-duplication.',
    '  --help                     Show this help.',
  ].join('\n'));
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    provider: 'all',
    sitemap: null,
    urls: [],
    urlFiles: [],
    limit: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--url') {
      const value = argv[++index];
      if (!value) throw new Error('Missing value for --url.');
      options.urls.push(value);
    } else if (arg === '--urls') {
      const value = argv[++index];
      if (!value) throw new Error('Missing value for --urls.');
      options.urlFiles.push(value);
    } else if (arg === '--sitemap') {
      const value = argv[++index];
      if (!value) throw new Error('Missing value for --sitemap.');
      options.sitemap = value;
    } else if (arg === '--provider') {
      const value = argv[++index];
      if (!['all', 'baidu', 'indexnow'].includes(value)) {
        throw new Error('--provider must be one of: all, baidu, indexnow.');
      }
      options.provider = value;
    } else if (arg === '--limit') {
      const value = Number(argv[++index]);
      if (!Number.isInteger(value) || value <= 0) {
        throw new Error('--limit must be a positive integer.');
      }
      options.limit = value;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function readUrlFile(filePath) {
  const fs = await import('node:fs/promises');
  const content = await fs.readFile(filePath, 'utf8');
  return content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

async function fetchSitemapUrls(sitemapUrl) {
  const response = await fetch(sitemapUrl);
  if (!response.ok) {
    throw new Error(`Failed to load sitemap ${sitemapUrl}: ${response.status} ${response.statusText}`);
  }
  const xml = await response.text();
  const urls = [];
  const locRegex = /<loc>(.*?)<\/loc>/g;
  let match = locRegex.exec(xml);
  while (match !== null) {
    urls.push(decodeXml(match[1].trim()));
    match = locRegex.exec(xml);
  }
  return urls;
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function normalizeUrls(urls, limit) {
  const normalized = Array.from(new Set(
    urls
      .map((url) => url.trim())
      .filter((url) => url.startsWith(SITE_URL)),
  ));
  return limit ? normalized.slice(0, limit) : normalized;
}

async function collectUrls(options) {
  const rawUrls = [...options.urls];
  for (const filePath of options.urlFiles) {
    rawUrls.push(...await readUrlFile(filePath));
  }
  if (rawUrls.length === 0) {
    rawUrls.push(...await fetchSitemapUrls(options.sitemap ?? DEFAULT_SITEMAP_URL));
  } else if (options.sitemap) {
    rawUrls.push(...await fetchSitemapUrls(options.sitemap));
  }
  return normalizeUrls(rawUrls, options.limit);
}

function assertEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Re-run with --dry-run to preview without submitting.`);
  }
  return value;
}

async function submitIndexNow(urls) {
  const key = assertEnv('INDEXNOW_KEY');
  const keyLocation = process.env.INDEXNOW_KEY_LOCATION || `${SITE_URL}/indexnow.txt`;
  const response = await fetch(INDEX_NOW_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      host: SITE_URL.replace('https://', ''),
      key,
      keyLocation,
      urlList: urls,
    }),
  });
  const body = response.ok ? 'IndexNow submission succeeded.' : await response.text();
  return { provider: 'indexnow', ok: response.ok, status: response.status, body };
}

async function submitBaidu(urls) {
  const token = assertEnv('BAIDU_PUSH_TOKEN');
  const endpoint = `${BAIDU_PUSH_ENDPOINT}?site=${encodeURIComponent(SITE_URL)}&token=${encodeURIComponent(token)}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
    body: urls.join('\n'),
  });
  const body = response.ok ? 'Baidu URL submission succeeded.' : await response.text();
  return { provider: 'baidu', ok: response.ok, status: response.status, body };
}

function printDryRun(urls, provider) {
  console.log(`[seo:submit] dry run provider=${provider} urlCount=${urls.length}`);
  for (const url of urls) {
    console.log(url);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }
  const urls = await collectUrls(options);
  if (urls.length === 0) {
    console.log('[seo:submit] No eligible URLs to submit.');
    return;
  }
  if (options.dryRun) {
    printDryRun(urls, options.provider);
    return;
  }
  const results = [];
  if (options.provider === 'all' || options.provider === 'indexnow') {
    results.push(await submitIndexNow(urls));
  }
  if (options.provider === 'all' || options.provider === 'baidu') {
    results.push(await submitBaidu(urls));
  }
  for (const result of results) {
    console.log(`[seo:submit] ${result.provider} status=${result.status} ok=${result.ok}`);
    console.log(result.body);
  }
  if (results.some((result) => !result.ok)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[seo:submit] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
