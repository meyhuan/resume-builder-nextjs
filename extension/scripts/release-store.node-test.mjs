import { test } from 'node:test';
import assert from 'node:assert/strict';
import { storeBuildOptions, selectWxtArchive } from './release-store.mjs';

test('store builds are isolated and always use the production API', () => {
  for (const target of ['chrome', 'edge']) {
    const result = storeBuildOptions(target, { WXT_API_BASE_URL: 'http://localhost:3000', WXT_RELEASE_BUILD: '0' });
    assert.equal(result.output, `.output/store/${target}`);
    assert.equal(result.env.WXT_API_BASE_URL, 'https://aijianli.cn');
    assert.equal(result.env.WXT_RELEASE_BUILD, '1');
    assert.equal(result.env.WXT_STORE_TARGET, target);
  }
});

test('rejects missing or path-like store targets', () => {
  for (const target of [undefined, '', 'firefox', '../release', 'chrome/../../release']) {
    assert.throws(() => storeBuildOptions(target));
  }
});

test('selects the emitted scoped-package archive, ignoring older and renamed store ZIPs', () => {
  const archive = 'aijianliapplication-autofill-extension-0.5.1-chrome.zip';
  assert.equal(selectWxtArchive([archive, 'old-0.5.0-chrome.zip', 'zhijian-autofill-0.5.1-chrome-store.zip'], '0.5.1'), archive);
  assert.throws(() => selectWxtArchive([], '0.5.1'));
  assert.throws(() => selectWxtArchive([archive, 'another-0.5.1-chrome.zip'], '0.5.1'));
});
