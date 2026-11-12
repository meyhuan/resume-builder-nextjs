import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { prepareImage, publicUrl, verifyImage } from './article-image.mjs';

test('validates images, strips metadata, rejects unsupported content and unsafe slugs', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'article-image-'));
  try {
    const file = join(dir, 'image.png');
    await sharp({ create: { width: 16, height: 12, channels: 3, background: '#7c3aed' } }).withMetadata().png().toFile(file);
    const result = await prepareImage(file, 'test-article', '示例图片');
    const meta = await sharp(result.data).metadata();
    assert.equal(meta.format, 'webp');
    assert.equal(meta.exif, undefined);
    assert.equal(result.width, 16);
    await assert.rejects(prepareImage(file, '../private', '说明'));
    await assert.rejects(prepareImage(file, 'test', ''));
    await writeFile(file, '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>');
    await assert.rejects(prepareImage(file, 'test', '说明'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('builds permanent HTTPS URLs and rejects signed or credential-bearing bases', () => {
  assert.equal(publicUrl({ ALIYUN_OSS_BUCKET: 'test', ALIYUN_OSS_REGION: 'oss-cn-hangzhou' }, 'articles/a/b.webp'), 'https://test.oss-cn-hangzhou.aliyuncs.com/articles/a/b.webp');
  assert.equal(publicUrl({ ALIYUN_OSS_PUBLIC_BASE_URL: 'https://cdn.example.com/assets/' }, 'a.webp'), 'https://cdn.example.com/assets/a.webp');
  for (const base of ['http://example.com', 'https://user:pass@example.com', 'https://example.com?signature=x']) assert.throws(() => publicUrl({ ALIYUN_OSS_PUBLIC_BASE_URL: base }, 'a.webp'));
});

test('only accepts publicly readable matching image bytes', async () => {
  const data = Buffer.from('test-image');
  const hash = createHash('sha256').update(data).digest('hex');
  await verifyImage('https://example.com/a.webp', hash, async () => new Response(data, { headers: { 'content-type': 'image/webp' } }));
  await assert.rejects(verifyImage('https://example.com/a.webp', hash, async () => new Response('', { status: 403 })));
  await assert.rejects(verifyImage('https://example.com/a.webp', hash, async () => new Response('different', { headers: { 'content-type': 'image/webp' } })));
  await assert.rejects(verifyImage('https://example.com/a.webp', hash, async () => new Response('<html/>', { headers: { 'content-type': 'text/html' } })));
});
