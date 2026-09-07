import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { verifyManifest, verifyBundle } from './verify-release.mjs';
const identity = JSON.parse(await readFile(new URL('../release-identity.json', import.meta.url), 'utf8'));
const manifest = {version:'0.5.0', manifest_version:3, key:identity.publicKey, host_permissions:['https://aijianli.cn/*'], minimum_chrome_version:'116', side_panel:{default_path:'sidepanel.html'}, background:{service_worker:'background.js'}};
test('stable identity and production-only hosts', () => {
  assert.equal(verifyManifest(manifest, identity, '0.5.0'), identity.extensionId);
  for (const change of [{key:undefined}, {version:'0.4.4'}, {host_permissions:['http://localhost:3000/*']}, {content_scripts:[{matches:['<all_urls>']}]}]) {
    assert.throws(() => verifyManifest({...manifest,...change}, identity, '0.5.0'));
  }
});
test('rejects local endpoints and secrets in compiled artifacts', () => {
  verifyBundle('const base="https://aijianli.cn"', 'background.js');
  for (const value of ['http://localhost:3000','http://127.0.0.1','postgresql://user:secret@db','-----BEGIN PRIVATE KEY-----']) assert.throws(() => verifyBundle(value, 'background.js'));
});
