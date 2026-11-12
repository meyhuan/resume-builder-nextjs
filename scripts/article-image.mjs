#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';
import sharp from 'sharp';
import OSS from 'ali-oss';

export async function prepareImage(file, slug, alt) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug || '') || slug.length > 100) throw new Error('输入错误：slug 请使用小写英文、数字和短横线，最多 100 字符。');
  if (!alt?.trim() || alt.length > 300 || /[\r\n]/.test(alt)) throw new Error('输入错误：请提供 1–300 字的单行图片说明。');
  const source = await readFile(file);
  if (source.length > 10 * 1024 * 1024) throw new Error('输入错误：图片不能超过 10 MB。');
  const meta = await sharp(source, { limitInputPixels: 40000000 }).metadata();
  if (!['jpeg', 'png', 'webp'].includes(meta.format) || (meta.pages || 1) > 1) throw new Error('输入错误：仅支持静态 JPG、PNG、WebP。');
  // Re-encode to remove EXIF/location metadata; retain original pixel dimensions.
  const { data, info } = await sharp(source, { limitInputPixels: 40000000 }).rotate().webp({ quality: 90 }).toBuffer({ resolveWithObject: true });
  return { data, slug, alt: alt.trim(), width: info.width, height: info.height, sha256: createHash('sha256').update(data).digest('hex') };
}

export function publicUrl(env, key) {
  const base = env.ALIYUN_OSS_PUBLIC_BASE_URL || `https://${env.ALIYUN_OSS_BUCKET}.${env.ALIYUN_OSS_REGION}.aliyuncs.com`;
  const url = new URL(base);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('配置错误：OSS 公共地址必须是无认证参数的 HTTPS 地址。');
  return `${url.href.replace(/\/$/, '')}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

export async function verifyImage(url, sha256, fetchImpl = fetch) {
  const response = await fetchImpl(url, { redirect: 'error', signal: AbortSignal.timeout(30000) });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error('核验失败：图片尚不能公开访问，请检查 OSS/CDN 权限和域名配置，不要插入草稿。');
  const actual = createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
  if (actual !== sha256) throw new Error('核验失败：公开地址内容与上传图片不一致，不要插入草稿。');
}

async function main() {
  const args = process.argv.slice(2), opts = {};
  if (args.includes('--help')) { console.log('用法：pnpm article:image --file <本地图片> --slug <文章slug> --alt <图片说明> --receipt <回执.json> [--dry-run]\n上传公开文章配图，返回 URL 与 Markdown；不会修改或发布文章。'); return; }
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') { opts.dryRun = true; continue; }
    if (!['--file', '--slug', '--alt', '--receipt'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('输入错误：请使用 --help 查看参数。');
    opts[args[i].slice(2)] = args[++i];
  }
  if (!opts.file || !opts.receipt || resolve(opts.file) === resolve(opts.receipt)) throw new Error('输入错误：需要独立的图片与回执路径。');
  const image = await prepareImage(opts.file, opts.slug, opts.alt);
  if (opts.dryRun) { console.log(JSON.stringify({ valid: true, width: image.width, height: image.height, bytes: image.data.length, networkRequests: 0 })); return; }
  const require = createRequire(import.meta.url);
  createRequire(require.resolve('next/package.json'))('@next/env').loadEnvConfig(process.cwd(), false);
  const env = process.env;
  for (const name of ['ALIYUN_OSS_REGION', 'ALIYUN_OSS_BUCKET', 'ALIYUN_OSS_ENDPOINT', 'ALIYUN_OSS_ACCESS_KEY_ID', 'ALIYUN_OSS_ACCESS_KEY_SECRET']) {
    if (!env[name]) throw new Error(`配置错误：缺少 ${name}，请检查私有环境配置，不要在聊天发送密钥。`);
  }
  let receipt;
  try { receipt = JSON.parse(await readFile(opts.receipt, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw new Error('输入错误：已有回执不可读取，不能忽略后重新上传。'); }
  if (receipt) {
    if (receipt.sha256 !== image.sha256 || receipt.slug !== image.slug || receipt.alt !== image.alt || !receipt.key?.startsWith(`articles/${image.slug}/`) || receipt.url !== publicUrl(env, receipt.key)) throw new Error('输入错误：回执对应其他图片或配置，请使用新的回执路径。');
  } else {
    const key = `articles/${image.slug}/${randomUUID()}.webp`;
    receipt = { key, url: publicUrl(env, key), slug: image.slug, alt: image.alt, sha256: image.sha256, width: image.width, height: image.height, status: 'UPLOAD_PENDING' };
    await mkdir(dirname(resolve(opts.receipt)), { recursive: true });
    await writeFile(opts.receipt, JSON.stringify(receipt, null, 2), { flag: 'wx' });
    let endpoint = env.ALIYUN_OSS_ENDPOINT.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (endpoint.startsWith(`${env.ALIYUN_OSS_BUCKET}.`)) endpoint = endpoint.slice(env.ALIYUN_OSS_BUCKET.length + 1);
    const client = new OSS({ region: env.ALIYUN_OSS_REGION, bucket: env.ALIYUN_OSS_BUCKET, endpoint, secure: true, accessKeyId: env.ALIYUN_OSS_ACCESS_KEY_ID, accessKeySecret: env.ALIYUN_OSS_ACCESS_KEY_SECRET });
    await client.put(key, image.data, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable', 'x-oss-forbid-overwrite': 'true' } });
    receipt.status = 'UPLOADED_UNVERIFIED';
    await writeFile(opts.receipt, JSON.stringify(receipt, null, 2));
  }
  await verifyImage(receipt.url, image.sha256);
  receipt.status = 'VERIFIED';
  receipt.markdown = `![${image.alt.replace(/[\\\[\]]/g, '\\$&')}](${receipt.url})`;
  await writeFile(opts.receipt, JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(/^(输入错误|配置错误|核验失败)/.test(error.message) ? error.message : '图片操作失败。请检查图片、网络和私有 OSS 配置；若已生成回执，保留它并核对其中对象，不要盲目重复上传。');
    process.exitCode = 1;
  });
}
