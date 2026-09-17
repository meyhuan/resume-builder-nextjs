// Fresh isolated Chromium profiles only. No onboarding acceptance, credentials or API writes.
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer';
import { verifyRelease } from '../extension/scripts/verify-release.mjs';

for (const store of ['chrome', 'edge']) {
  const directory = resolve(`extension/.output/store/${store}/chrome-mv3`);
  const report = await verifyRelease(directory, 'store');
  const browser = await puppeteer.launch({ headless: true, ignoreDefaultArgs: ['--disable-extensions'],
    args: [`--disable-extensions-except=${directory}`, `--load-extension=${directory}`] });
  try {
    const target = await browser.waitForTarget(target => target.type() === 'service_worker' && target.url().startsWith('chrome-extension://') && target.url().endsWith('/background.js'));
    const localId = new URL(target.url()).hostname;
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`chrome-extension://${localId}/sidepanel.html`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.textContent.includes('同意并开始使用'));
    const state = await page.evaluate(async () => ({
      manifest: chrome.runtime.getManifest(),
      status: await chrome.runtime.sendMessage({ type: 'status' }),
      logo: document.querySelector('img')?.naturalWidth,
      granted: await chrome.permissions.getAll(),
    }));
    assert.equal(state.manifest.version, report.version);
    assert.equal(state.manifest.key, undefined);
    assert.equal(state.status.connected, false);
    assert.equal(state.status.onboardingAccepted, false);
    assert.ok(state.logo > 0);
    assert.deepEqual(state.granted.origins, ['https://aijianli.cn/*']);
    assert.deepEqual(errors, []);
    console.log(`PASS: ${store} upload bundle starts in isolated Chromium with logo and onboarding; no broad site access. Local unpacked ID is NOT the store ID.`);
  } finally { await browser.close(); }
}
console.log('NOTE: Edge runtime and store-installed authentication are still unverified.');
