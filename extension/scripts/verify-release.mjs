import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function verifyManifest(manifest, identity, version) {
  assert.equal(manifest.version, version, '发布版本与package.json不一致');
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.key, identity.publicKey, '缺少固定的发布ID公钥');
  const id = [...createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest('hex').slice(0, 32)]
    .map(char => String.fromCharCode(97 + parseInt(char, 16))).join('');
  assert.equal(id, identity.extensionId, '发布公钥和ID不一致');
  assert.deepEqual(manifest.host_permissions, ['https://aijianli.cn/*']);
  assert.equal(manifest.minimum_chrome_version, '116');
  assert.ok(manifest.side_panel?.default_path);
  assert.ok(manifest.background?.service_worker);
  assert.ok(!manifest.externally_connectable, '发布版不接受外部消息');
  assert.ok(!manifest.content_scripts?.length, '不得自动扫描所有网页');
  return id;
}

export function verifyBundle(text, name) {
  assert.ok(!/localhost|127\.0\.0\.1|0\.0\.0\.0|postgres(?:ql)?:\/\/|BEGIN (?:RSA )?PRIVATE KEY/i.test(text), `${name}混入本地地址或敏感配置`);
  if (name === 'background.js') assert.ok(text.includes('https://aijianli.cn'), '后台没有生产API地址');
}

export async function verifyRelease(root) {
  const extensionRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
  root ||= join(extensionRoot, '.output/release/chrome-mv3');
  const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'));
  const identity = JSON.parse(await readFile(join(extensionRoot, 'release-identity.json'), 'utf8'));
  const { version } = JSON.parse(await readFile(join(extensionRoot, 'package.json'), 'utf8'));
  const id = verifyManifest(manifest, identity, version);
  const files = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else {
        assert.ok(!/\.map$|\.env|\.pem$|\.key$|\.test\./i.test(entry.name), `不应分发${entry.name}`);
        if (/\.(js|json|html|css|txt)$/.test(entry.name)) verifyBundle(await readFile(path, 'utf8'), entry.name);
        files.push(path);
      }
    }
  }
  await walk(root);
  for (const path of [manifest.side_panel.default_path, manifest.background.service_worker, ...Object.values(manifest.icons), 'THIRD_PARTY_NOTICES.txt', 'INSTALL.zh-CN.txt']) {
    assert.ok((await readFile(join(root, path))).length, `缺少发布资源${path}`);
  }
  return { version, extensionId: id, apiBase: 'https://aijianli.cn', fileCount: files.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await verifyRelease(process.argv[2]), null, 2));
}
