/** @typedef {{
 article_title: string;
 article_auther_email: string;
 article_views: number;
 article_likes: number;
 article_collections: number;
 article_html_content: string;
 article_text_content: string;
 article_tags: string[];
 article_category: string;
 article_cover: string;
 article_abstract: string;
 article_likes_users: string[];
 article_collection_users: string[];
 article_code_buy_code: boolean;
 source_url?: string;
 createDate: string;
 updateDate: string;
}} SourceRawArticle */

/** @typedef {{
 article_slug: string;
 article_title: string;
 article_auther_email: string;
 article_views: number;
 article_likes: number;
 article_collections: number;
 article_html_content: string;
 article_text_content: string;
 article_tags: string[];
 article_category: string;
 article_cover: string;
 article_abstract: string;
 article_likes_users: string[];
 article_collection_users: string[];
 article_code_buy_code: boolean;
 source_url?: string;
 createDate: string;
 updateDate: string;
}} OwnedRawArticle */

/** @typedef {{
 status: 'pending' | 'drafted' | 'review' | 'published';
 draft: OwnedRawArticle;
 reference: {
  sourceUrl: string;
  sourceTitle: string;
  sourceAbstract: string;
  sourceCategory: string;
 };
}} RewriteQueueItem */

import { readFile, writeFile, access, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SOURCE_PATH = path.resolve(PROJECT_ROOT, 'files', 'resume.articles.json');
const OUTPUT_PATH = path.resolve(PROJECT_ROOT, 'files', 'aijianli.articles.rewrite-queue.json');
const PUBLISHED_PATH = path.resolve(PROJECT_ROOT, 'files', 'aijianli.articles.json');
const DEFAULT_AUTHOR_EMAIL = 'content@aijianli.cn';
const SLUG_MAX_LENGTH = 64;
const SITE_NAME = '智简简历';
const SITE_URL = 'https://aijianli.cn';
const DEFAULT_MODEL_NAME = 'qwen-plus';
const DEFAULT_DELAY_MS = 1200;

/** @typedef {{
  name: string;
  displayName: string;
  baseUrl: string;
  apiKeyEnv: string;
 }} AiModelConfig */

/** @type {readonly AiModelConfig[]} */
const MODELS = [
  {
    name: 'qwen3.5-flash',
    displayName: '通义千问 Qwen3.5-Flash',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKeyEnv: 'DASHSCOPE_API_KEY',
  },
  {
    name: 'qwen-max',
    displayName: '通义千问 Max',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKeyEnv: 'DASHSCOPE_API_KEY',
  },
];

function getModelByName(name) {
  const model = MODELS.find((m) => m.name === name);
  return model ?? MODELS[0];
}

function resolveApiKey(model) {
  const key = process.env[model.apiKeyEnv] ?? '';
  if (!key) {
    throw new Error(`Missing environment variable: ${model.apiKeyEnv}`);
  }
  return key;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function assertFetchAvailable() {
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is not available. Please use Node.js 18+ (recommended Node.js 20).');
  }
}

/**
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} value
 * @returns {number}
 */
function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return parsed;
}

/**
 * @returns {{
 *  generate: boolean;
 *  publish: boolean;
 *  modelName: string;
 *  skip: number;
 *  limit: number;
 *  delayMs: number;
 *  category: string;
 * }}
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const generate = args.includes('--generate');
  const publish = args.includes('--publish');
  const modelArgIdx = args.findIndex((a) => a === '--model');
  const modelName = modelArgIdx >= 0 ? (args[modelArgIdx + 1] ?? DEFAULT_MODEL_NAME) : DEFAULT_MODEL_NAME;
  const skipArgIdx = args.findIndex((a) => a === '--skip');
  const skip = skipArgIdx >= 0 ? parsePositiveInt(args[skipArgIdx + 1] ?? '') : 0;
  const limitArgIdx = args.findIndex((a) => a === '--limit');
  const limit = limitArgIdx >= 0 ? parsePositiveInt(args[limitArgIdx + 1] ?? '') : 0;
  const delayArgIdx = args.findIndex((a) => a === '--delay');
  const delayMs = delayArgIdx >= 0 ? parsePositiveInt(args[delayArgIdx + 1] ?? '') : DEFAULT_DELAY_MS;
  const categoryArgIdx = args.findIndex((a) => a === '--category');
  const category = categoryArgIdx >= 0 ? (args[categoryArgIdx + 1] ?? '').trim() : '';
  return { generate, publish, modelName, skip, limit, delayMs, category };
}

/**
 * @param {AiModelConfig} model
 * @param {string} apiKey
 * @param {Array<{ role: 'system' | 'user' | 'assistant'; content: string }>} messages
 * @returns {Promise<{ content: string, usage: any }>}
 */
async function chatCompletion(model, apiKey, messages) {
  const url = `${model.baseUrl}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model.name,
      messages,
      temperature: 0.7,
      top_p: 0.9,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI request failed (${res.status}): ${text.slice(0, 500)}`);
  }
  /** @type {unknown} */
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('AI response is empty');
  }
  return { content, usage: data?.usage || {} };
}

/**
 * @param {string} raw
 * @returns {string}
 */
function extractJsonString(raw) {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1).trim();
  return trimmed;
}

/**
 * @param {string} raw
 * @returns {{ abstract: string; htmlContent: string; textContent: string; tags?: unknown }}
 */
function parseAiJson(raw) {
  const jsonString = extractJsonString(raw);
  try {
    return JSON.parse(jsonString);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse AI JSON: ${message}. Preview: ${jsonString.slice(0, 240)}`);
  }
}

/**
 * @param {RewriteQueueItem} item
 * @param {AiModelConfig} model
 * @param {string} apiKey
 * @returns {Promise<{ article: OwnedRawArticle, stats: { usage: any, durationMs: number } }>}
 */
async function generateOwnedArticle(item, model, apiKey) {
  const title = item.draft.article_title;
  const category = item.draft.article_category;
  const tags = item.draft.article_tags;
  const referenceAbstract = item.reference.sourceAbstract;
  const systemPrompt = `你现在是一位化名为“职场学长”的独立开发者，目前在做一款名为【${SITE_NAME}】（${SITE_URL}）的开源/免费简历工具。

你的核心人设与写作风格：
1) 真实坦诚：像学长带学弟一样聊天，用“我”和“你”交流。偶尔可以吐槽一下“我以前看简历时最怕遇到……”或者“我自己刚毕业时也踩过这种坑”。
2) 极度务实：反对“废话文学”和“包装过度”。直接给出 [错误示范] vs [正确示范] 的对比，甚至直接给出可以“照抄”的句式。
3) 痛点洞察：你懂技术也懂业务，知道 HR 和业务面在看简历时“几秒钟扫过”的真实状态。
4) 软广植入：在文章中顺其自然地提到你的产品（例如：“这也是为什么我后来自己写了 ${SITE_NAME}，直接帮大家把排版锁死，省得在 Word 里调格式浪费时间”，或者“用 ${SITE_NAME} 的 AI 优化功能直接帮你把这句话润色了”）。
5) 拒绝 AI 味：不要使用“总而言之”“在这个瞬息万变的时代”“综上所述”等传统 AI 模板句。多用短句，语气要松弛。
6) 绝对原创：参考内容仅用于理解主题，你的输出必须是100%全新的框架和文字。`;
  const userPrompt = `请为 ${SITE_NAME} 生成一篇原创中文文章，要求：

主题标题：${title}
分类：${category}
标签：${tags.join(', ')}

参考内容/摘要（仅用于理解用户想看什么主题，禁止复用原句）：
${referenceAbstract}

内容要求：
1. 结构编排：
   - 开篇（1-2段）：破冰，用一个学长视角的真实痛点切入。
   - 核心要点（2-4个 H2）：每个要点必须带“Before / After 对比”或“具体案例”。
   - 工具结合（自然植入）：在一个最痛的环节，提到“我自己做的 ${SITE_NAME} 是怎么解决这个问题的（比如无水印、AI一键润色、ATS友好）”。
   - 结尾（行动清单）：给出 2-3 个马上能去做的 Action Items。

2. HTML 格式输出要求：
   - 只使用 h2, h3, p, ul, ol, li, strong, blockquote 标签。
   - 段落要短（移动端阅读友好），善用 <strong> 加粗重点。
   - 可以用 blockquote 引用一些“HR 原话”或“学长语录”。

3. 其他：
   - 纯文本版本 (textContent) 需要去掉所有 HTML 标签。
   - 摘要 (abstract) 限制在 100-150 字，作为文章的引言/Meta Description，必须能吸引点击。
   - 严禁出现“UP简历”“upcv”“转载”等字眼。

输出格式：只返回严格合法的 JSON（不要 markdown 代码块），结构为：
{
  "abstract": "string",
  "htmlContent": "string",
  "textContent": "string",
  "tags": ["string"]
}

🚨【极其重要 - JSON格式警告】🚨
所有字符串内部如果需要表示引用，请一律使用**中文双引号（“”）**或**单引号（''）**。
绝对不允许在 JSON 字符串值中出现未转义的英文双引号（"），这会导致 JSON.parse 崩溃！
示例错误： "htmlContent": "<p>他说："你好"</p>"
示例正确： "htmlContent": "<p>他说：“你好”</p>"`;
  const startTime = performance.now();
  const { content: raw, usage } = await chatCompletion(model, apiKey, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);
  const endTime = performance.now();
  const parsed = parseAiJson(raw);
  const abstract = parsed?.abstract;
  const htmlContent = parsed?.htmlContent;
  const textContent = parsed?.textContent;
  const nextTags = parsed?.tags;
  if (typeof abstract !== 'string' || typeof htmlContent !== 'string' || typeof textContent !== 'string') {
    throw new Error('AI JSON missing required fields');
  }
  /** @type {string[]} */
  const safeTags = Array.isArray(nextTags) ? nextTags.filter((t) => typeof t === 'string') : tags;
  const nowIso = new Date().toISOString();
  const article = {
    ...item.draft,
    article_abstract: abstract.trim(),
    article_html_content: htmlContent.trim(),
    article_text_content: textContent.trim(),
    article_tags: safeTags.length > 0 ? safeTags : tags,
    updateDate: nowIso,
  };
  return { article, stats: { usage, durationMs: endTime - startTime } };
}

function hashString(value) {
  /** @type {number} */
  let hash = 5381;
  for (const ch of value) {
    hash = ((hash << 5) + hash) ^ ch.charCodeAt(0);
  }
  return (hash >>> 0).toString(36);
}

function normalizeSlug(value) {
  /** @type {string} */
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized.slice(0, SLUG_MAX_LENGTH);
}

function getSlugCandidate(article) {
  /** @type {string} */
  const sourceUrl = (article.source_url ?? '').trim();
  if (sourceUrl) {
    const parts = sourceUrl.split('/');
    const filename = parts[parts.length - 1] ?? '';
    const slugFromFilename = filename.replace('.html', '').trim();
    if (slugFromFilename) return normalizeSlug(slugFromFilename);
  }
  const titleSlug = normalizeSlug(article.article_title);
  if (titleSlug) return titleSlug;
  return `article-${hashString(article.article_title || sourceUrl || 'untitled')}`;
}

function ensureUniqueSlug(slugCandidate, slugCounts) {
  const current = slugCounts.get(slugCandidate);
  if (current === undefined) {
    slugCounts.set(slugCandidate, 1);
    return slugCandidate;
  }
  const nextCount = current + 1;
  slugCounts.set(slugCandidate, nextCount);
  const suffix = `-${nextCount}`;
  const baseMax = Math.max(1, SLUG_MAX_LENGTH - suffix.length);
  const base = slugCandidate.slice(0, baseMax).replace(/-$/g, '');
  return `${base}${suffix}`;
}

function toOwnedDraft(article, slug) {
  /** @type {string} */
  const nowIso = new Date().toISOString();
  return {
    article_slug: slug,
    article_title: article.article_title,
    article_auther_email: DEFAULT_AUTHOR_EMAIL,
    article_views: 0,
    article_likes: 0,
    article_collections: 0,
    article_html_content: '',
    article_text_content: '',
    article_tags: Array.isArray(article.article_tags) ? article.article_tags : [],
    article_category: article.article_category || '简历写作',
    article_cover: '',
    article_abstract: '',
    article_likes_users: [],
    article_collection_users: [],
    article_code_buy_code: false,
    createDate: nowIso,
    updateDate: nowIso,
  };
}

async function main() {
  const args = parseArgs();
  if (args.generate) {
    assertFetchAvailable();
    const modelConfig = getModelByName(args.modelName);
    resolveApiKey(modelConfig);
  }
  /** @type {string} */
  const raw = await readFile(SOURCE_PATH, { encoding: 'utf8' });
  /** @type {unknown} */
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('resume.articles.json must be an array');
  }
  /** @type {SourceRawArticle[]} */
  const sourceArticles = parsed;
  /** @type {Map<string, RewriteQueueItem>} */
  const existingBySourceUrl = new Map();
  if (await fileExists(OUTPUT_PATH)) {
    const existingRaw = await readFile(OUTPUT_PATH, { encoding: 'utf8' });
    const existingParsed = JSON.parse(existingRaw);
    if (Array.isArray(existingParsed)) {
      for (const item of existingParsed) {
        const src = item?.reference?.sourceUrl;
        if (typeof src === 'string' && src.trim()) {
          existingBySourceUrl.set(src.trim(), item);
        }
      }
    }
  }
  /** @type {Map<string, number>} */
  const slugCounts = new Map();
  /** @type {RewriteQueueItem[]} */
  const queue = sourceArticles.map((a) => {
    const sourceUrl = (a.source_url ?? '').trim();
    const existing = sourceUrl ? existingBySourceUrl.get(sourceUrl) : undefined;
    if (existing) {
      const existingSlug = existing?.draft?.article_slug;
      if (typeof existingSlug === 'string' && existingSlug.trim()) {
        ensureUniqueSlug(normalizeSlug(existingSlug), slugCounts);
      }
      return existing;
    }
    const slugCandidate = getSlugCandidate(a);
    const slug = ensureUniqueSlug(slugCandidate, slugCounts);
    const draft = toOwnedDraft(a, slug);
    return {
      status: 'pending',
      draft,
      reference: {
        sourceUrl,
        sourceTitle: a.article_title,
        sourceAbstract: a.article_abstract,
        sourceCategory: a.article_category,
      },
    };
  });

  /** @type {OwnedRawArticle[]} */
  const generatedArticles = [];
  /** @type {Array<{ slug: string; title: string; reason: string }>} */
  const failedItems = [];
  if (args.generate) {
    const modelConfig = getModelByName(args.modelName);
    const apiKey = resolveApiKey(modelConfig);
    const categoryFilter = args.category;
    /** @type {RewriteQueueItem[]} */
    const candidates = queue.filter((item) => {
      if (item.status !== 'pending') return false;
      if (!categoryFilter) return true;
      return item.draft.article_category === categoryFilter;
    });
    const skippedCandidates = candidates.slice(args.skip);
    const limit = args.limit > 0 ? args.limit : skippedCandidates.length;
    const picked = skippedCandidates.slice(0, limit);
    for (let i = 0; i < picked.length; i += 1) {
      const item = picked[i];
      process.stdout.write(`Generating (${i + 1}/${picked.length}) [Offset: ${args.skip + i}]: ${item.draft.article_slug} - ${item.draft.article_title}\n`);
      
      try {
        const { article: generated, stats } = await generateOwnedArticle(item, modelConfig, apiKey);
        item.draft = generated;
        item.status = 'drafted';
        generatedArticles.push(generated);

        const timeSec = (stats.durationMs / 1000).toFixed(2);
        const pTokens = stats.usage?.prompt_tokens || 0;
        const cTokens = stats.usage?.completion_tokens || 0;
        const speed = cTokens > 0 ? (cTokens / (stats.durationMs / 1000)).toFixed(1) : 0;
        process.stdout.write(`  -> [${modelConfig.name}] 耗时: ${timeSec}s | 速度: ${speed} tokens/s | HTML长度: ${generated.article_html_content.length}字\n`);
        process.stdout.write(`  -> Tokens: ${pTokens} (prompt) + ${cTokens} (completion) = ${pTokens + cTokens}\n`);
        process.stdout.write(`  -> 摘要: ${generated.article_abstract.replace(/\\n/g, ' ').substring(0, 60)}...\n\n`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(`  -> ❌ 生成失败: ${message}\n\n`);
        failedItems.push({
          slug: item.draft.article_slug,
          title: item.draft.article_title,
          reason: message
        });
      }

      if (args.delayMs > 0 && i < picked.length - 1) {
        await sleep(args.delayMs);
      }
    }
  }
  /** @type {string} */
  const outputJson = `${JSON.stringify(queue, null, 2)}\n`;
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, outputJson, { encoding: 'utf8' });

  if (args.publish && generatedArticles.length > 0) {
    /** @type {OwnedRawArticle[]} */
    const existingPublished = (await fileExists(PUBLISHED_PATH))
      ? JSON.parse(await readFile(PUBLISHED_PATH, { encoding: 'utf8' }))
      : [];
    const publishedArray = Array.isArray(existingPublished) ? existingPublished : [];
    /** @type {Map<string, OwnedRawArticle>} */
    const bySlug = new Map(publishedArray
      .filter((a) => a && typeof a.article_slug === 'string')
      .map((a) => [a.article_slug, a]));
    for (const article of generatedArticles) {
      bySlug.set(article.article_slug, article);
    }
    const merged = Array.from(bySlug.values());
    const publishedJson = `${JSON.stringify(merged, null, 2)}\n`;
    await writeFile(PUBLISHED_PATH, publishedJson, { encoding: 'utf8' });
    process.stdout.write(`Published dataset updated: ${PUBLISHED_PATH}\n`);
    process.stdout.write(`Published items: ${merged.length}\n`);
  }
  /** @type {Record<string, number>} */
  const categoryCounts = {};
  for (const item of queue) {
    const cat = item.reference.sourceCategory || 'unknown';
    categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
  }
  process.stdout.write(`Rewrite queue generated: ${OUTPUT_PATH}\n`);
  process.stdout.write(`Items: ${queue.length}\n`);
  process.stdout.write(`Categories: ${JSON.stringify(categoryCounts)}\n`);
  if (args.generate) {
    process.stdout.write(`Generated drafts: ${generatedArticles.length}\n`);
    if (failedItems.length > 0) {
      process.stdout.write(`\n=== 🚨 失败汇总 (${failedItems.length} 篇) ===\n`);
      for (const f of failedItems) {
        process.stdout.write(`- [${f.slug}] ${f.title}\n  原因: ${f.reason}\n`);
      }
      process.stdout.write(`\n💡 如何重新生成这些失败的文章？\n`);
      process.stdout.write(`因为脚本会自动跳过已经 'drafted' 或 'published' 的文章，你只需要直接再次运行之前的命令，它就会自动去跑那些仍然是 'pending'（即刚才失败）的文章：\n`);
      process.stdout.write(`> node .\\scripts\\generate-rewrite-queue.mjs --generate --limit 10 --publish\n`);
    }
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
