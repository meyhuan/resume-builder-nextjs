import { spawnSync } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyRelease } from './verify-release.mjs';
import { stageWebsiteDownload } from './website-download.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const result = spawnSync(process.execPath, [join(root, 'node_modules/wxt/bin/wxt.mjs'), 'zip'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, WXT_RELEASE_BUILD: '1', WXT_API_BASE_URL: 'https://aijianli.cn' },
});
if (result.error || result.status !== 0) throw new Error('发布构建失败', { cause: result.error });
const verification = await verifyRelease();
const output = join(root, '.output/release');
const archives = (await readdir(output)).filter(name => name.endsWith(`-${verification.version}-chrome.zip`));
if (archives.length !== 1) throw new Error('未找到唯一发布ZIP');
const sha256 = createHash('sha256').update(await readFile(join(output, archives[0]))).digest('hex');
await writeFile(join(output, 'release-artifact.json'), JSON.stringify({ ...verification, archive: archives[0], sha256,
  note: '仅证明构建配置校验通过；上线需另行通过服务端部署与真实浏览器验收。' }, null, 2));
console.log(JSON.stringify({ ...verification, archive: archives[0], sha256 }, null, 2));
await stageWebsiteDownload(root, { ...verification, archive: archives[0], sha256 });
