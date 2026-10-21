/** Recover generated campaign originals; never redraw or resize the approved artwork. */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const review = 'outputs/story-sharing-ui/sage-generated-v2';
const spec = JSON.parse(await fs.readFile('docs/xhs-story-sage-prompts.json', 'utf8'));
const codex = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
const threads = ['01a14e90-5cf0-7dd1-b966-e7e1c20a7395', '01a151d7-b9f3-7753-9ee4-3f068bd5b6b5'];
const found = new Map();
async function scan(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { await scan(file); continue; }
    if (!entry.name.endsWith('.jsonl') || !threads.some(id => entry.name.includes(id))) continue;
    for (const line of (await fs.readFile(file, 'utf8')).split('\n')) {
      if (!line.includes('image_gen.generation')) continue;
      let event; try { event = JSON.parse(line); } catch { continue; }
      const item = event.payload?.item;
      if (item?.kind !== 'image_gen.generation' || item.status !== 'completed') continue;
      const match = spec.images.find(image => item.revisedPrompt?.startsWith(image.prompt));
      if (!match) continue;
      const source = path.join(codex, 'generated_images', event.payload.thread_id, `${item.id}.png`);
      try { await fs.access(source); } catch { continue; }
      found.set(match.id, { source, prompt: item.revisedPrompt });
    }
  }
}
await scan(path.join(codex, 'sessions', '2026', '10'));
const output = 'public/m/story-packs/sage-v2';
await fs.mkdir(review, { recursive: true });
await fs.mkdir(output, { recursive: true });
const assets = [];
for (const image of spec.images) {
  const item = found.get(image.id);
  if (!item) continue;
  const bytes = await fs.readFile(item.source);
  if (bytes.subarray(1, 4).toString() !== 'PNG') throw new Error(`Invalid PNG: ${image.id}`);
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (width < 1000 || Math.abs(width / height - 0.75) > 0.01) throw new Error(`Invalid portrait: ${image.id}`);
  await fs.copyFile(item.source, `${output}/${image.id}.png`);
  assets.push({ id: image.id, file: `/m/story-packs/sage-v2/${image.id}.png`, width, height,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'), ...item });
}
const missing = spec.images.filter(image => !found.has(image.id)).map(image => image.id);
await fs.writeFile(`${review}/manifest.json`, JSON.stringify({ generator: spec.generator, complete: missing.length === 0, assets, missing }, null, 2));
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
await fs.writeFile(`${review}/index.html`, `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>智简简历 · 鼠尾草绿素材</title><style>body{margin:32px;background:#f6f2e9;font-family:system-ui;color:#293f36}section{margin:36px 0}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}img{width:100%;height:auto}a{color:inherit}</style><h1>智简简历 · 12 组产品分享素材</h1><p>AI 设计示意图，人物与经历为模拟数据。已完成 ${assets.length} / 36 张。</p>${spec.packs.map(pack => `<section><h2>${escape(pack.name)}</h2><div class="cards">${[1,2,3].map(i => found.has(`${pack.id}-${i}`) ? `<a href="../../../public/m/story-packs/sage-v2/${pack.id}-${i}.png"><img loading="lazy" src="../../../public/m/story-packs/sage-v2/${pack.id}-${i}.png" alt="${escape(pack.titles[i-1])}"></a>` : '<p>待完成</p>').join('')}</div></section>`).join('')}</html>`);
console.log(JSON.stringify({ completed: assets.length, missing }, null, 2));
if (process.argv.includes('--require-complete') && missing.length) process.exitCode = 1;
