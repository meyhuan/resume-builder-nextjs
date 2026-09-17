import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, readdir, copyFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyRelease } from './verify-release.mjs';

export function storeBuildOptions(target, env = process.env) {
  assert.ok(['chrome', 'edge'].includes(target), '请选择 chrome 或 edge');
  return {
    // Both stores use the Chromium build. The Edge runtime still needs separate QA.
    target,
    output: `.output/store/${target}`,
    env: { ...env, WXT_STORE_TARGET: target, WXT_RELEASE_BUILD: '1', WXT_API_BASE_URL: 'https://aijianli.cn' },
  };
}

export function selectWxtArchive(files, version) {
  const matches = files.filter(name => name.endsWith(`-${version}-chrome.zip`));
  assert.equal(matches.length, 1, '未找到唯一的当前版本 WXT ZIP');
  return matches[0];
}

export async function releaseStore(target) {
  const options = storeBuildOptions(target);
  const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const result = spawnSync(process.execPath, [join(root, 'node_modules/wxt/bin/wxt.mjs'), 'zip'], {
    cwd: root, stdio: 'inherit', env: options.env,
  });
  if (result.error || result.status !== 0) throw new Error('商店构建失败', { cause: result.error });
  const output = join(root, options.output);
  const verification = await verifyRelease(join(output, 'chrome-mv3'), 'store');
  const wxtArchive = selectWxtArchive(await readdir(output), verification.version);
  const source = join(output, wxtArchive);
  const bytes = await readFile(source);
  assert.equal(bytes.readUInt32LE(0), 0x04034b50, '不是 ZIP 文件');
  const filename = `zhijian-autofill-${verification.version}-${target}-store.zip`;
  await copyFile(source, join(output, filename));
  const artifact = {
    ...verification, target, filename, size: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    readiness: 'draft-upload-only',
    pending: ['取得商店实际ID并配置服务器白名单', '准备审核人员可独立使用的登录方式', '完成对应浏览器正式环境验收'],
  };
  await writeFile(join(output, 'store-artifact.json'), JSON.stringify(artifact, null, 2) + '\n');
  // Deliberately do not stageWebsiteDownload: never replace the manual ZIP or ID.
  console.log(JSON.stringify(artifact, null, 2));
  return artifact;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await releaseStore(process.argv[2]);
}
