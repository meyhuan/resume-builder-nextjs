import assert from 'node:assert/strict';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

// Called only after the production release verifier succeeds. Never stages a dev build.
export async function stageWebsiteDownload(extensionRoot, release) {
  assert.equal(release.apiBase, 'https://aijianli.cn');
  assert.match(release.version, /^\d+\.\d+\.\d+$/);
  assert.match(release.sha256, /^[a-f0-9]{64}$/);
  assert.equal(release.archive, `aijianliapplication-autofill-extension-${release.version}-chrome.zip`);
  const source = join(extensionRoot, '.output/release', release.archive);
  const bytes = await readFile(source);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), release.sha256);
  assert.equal(bytes.subarray(0, 4).toString('hex'), '504b0304', '不是 ZIP 安装包');
  const destination = join(extensionRoot, '../public/downloads/extension');
  const metadataDir = join(extensionRoot, '../src/features/extension-guide');
  await mkdir(destination, { recursive: true });
  await mkdir(metadataDir, { recursive: true });
  const filename = `zhijian-autofill-${release.version}.zip`;
  await copyFile(source, join(destination, filename));
  await writeFile(join(metadataDir, 'release.json'), JSON.stringify({
    version: release.version, filename, href: `/downloads/extension/${filename}`,
    sha256: release.sha256, size: bytes.length, extensionId: release.extensionId,
  }, null, 2) + '\n');
  console.log(`Website download staged: public/downloads/extension/${filename}`);
}
