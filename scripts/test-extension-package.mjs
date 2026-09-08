import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer';
const directory=resolve('extension/.output/release/chrome-mv3');
const identity=JSON.parse(await readFile('extension/release-identity.json','utf8'));
const {version}=JSON.parse(await readFile('extension/package.json','utf8'));
const browser=await puppeteer.launch({headless:true,ignoreDefaultArgs:['--disable-extensions'],args:[`--disable-extensions-except=${directory}`,`--load-extension=${directory}`]});
let diagnosticPage;
try {
  const target=await browser.waitForTarget(target=>target.type()==='service_worker' && target.url()===`chrome-extension://${identity.extensionId}/background.js`,{timeout:15000});
  assert.ok(target,'发布版后台未启动或ID不稳定');
  const page=await browser.newPage();
  diagnosticPage=page;
  await page.setViewport({width:400,height:900,deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',error=>{errors.push(error.message);console.log('PAGE ERROR:',error.message);});
  await page.goto(`chrome-extension://${identity.extensionId}/sidepanel.html`,{waitUntil:'networkidle0'});
  await page.waitForFunction(()=>document.body.textContent.includes('同意并开始使用'),{timeout:5000});
  const state=await page.evaluate(async()=>({
    manifest:chrome.runtime.getManifest(),
    connected:(await chrome.runtime.sendMessage({type:'status'})).connected,
    logoLoaded:document.querySelector('img')?.naturalWidth>0,
  }));
  assert.equal(state.manifest.version,version);
  assert.equal(state.connected,false);
  assert.equal(state.logoLoaded,true);
  assert.deepEqual(errors,[]);
  await mkdir('test-artifacts/extension-release',{recursive:true});
  await page.screenshot({path:resolve('test-artifacts/extension-release/fresh-install.png'),fullPage:true});
  console.log(`PASS: clean isolated Chromium profile loads actual release package, ID ${identity.extensionId}, onboarding and logo; no auth or host permissions granted`);
  // Seed only synthetic connection state. Disable service-worker networking first:
  // this exercises Chrome's real URL redaction without contacting production APIs.
  const worker=await target.worker();
  await worker.evaluate(async()=>{
    globalThis.fetch=async()=>new Response('',{status:503});
    await chrome.storage.local.set({accessToken:'synthetic-package-test',onboardingAccepted:true,autoConnectEnabled:false});
  });
  const recruiting=await browser.newPage();
  await recruiting.setRequestInterception(true);
  recruiting.on('request',request=>void request.respond({status:200,contentType:'text/html',body:'<!doctype html><title>Isolated recruiting form</title><label>Name<input></label>'}));
  await recruiting.goto('https://talent.taotian.com/personal/social-resume');
  await recruiting.bringToFront();
  const unpermitted=await page.evaluate(async()=>{
    const [tab]=await chrome.tabs.query({active:true,lastFocusedWindow:true});
    return {hasTabId:typeof tab?.id==='number',hasUrl:!!tab?.url,status:await chrome.runtime.sendMessage({type:'status'})};
  });
  assert.equal(unpermitted.hasTabId,true);
  assert.equal(unpermitted.hasUrl,false,'Fresh release must not silently gain recruiting-site permissions');
  assert.equal(unpermitted.status.page,null);
  assert.equal(unpermitted.status.pageIssue,'site_access_required');
  await page.waitForFunction(()=>document.body.textContent.includes('授权并重新检测'));
  const controls=await page.evaluate(()=>({
    fillDisabled:[...document.querySelectorAll('button')].find(b=>b.textContent==='一键填写此页面')?.disabled,
    recoveryEnabled:[...document.querySelectorAll('button')].find(b=>b.textContent==='授权并重新检测')?.disabled===false,
    reason:document.getElementById('page-availability')?.textContent,
  }));
  assert.equal(controls.fillDisabled,true);
  assert.equal(controls.recoveryEnabled,true);
  assert.ok(controls.reason.includes('尚无法读取当前页面地址'));
  await page.screenshot({path:resolve('test-artifacts/extension-release/site-access-required.png'),fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS: actual release + real Chrome redacted tab URL reproduces missing-permission condition; connected UI explains disabled fill and exposes enabled recovery; no real login, permission grant, form fill, or submission.');
} catch (error) {
  if (diagnosticPage) {
    await mkdir('test-artifacts/extension-release',{recursive:true});
    await diagnosticPage.screenshot({path:resolve('test-artifacts/extension-release/fresh-install-failure.png'),fullPage:true});
    console.log('ISOLATED PAGE:',await diagnosticPage.$eval('body',node=>node.innerText.slice(0,1500)));
    console.log('STATUS:',await Promise.race([
      diagnosticPage.evaluate(async()=>{try {return await chrome.runtime.sendMessage({type:'status'});} catch(error) {return {error:String(error)};}}),
      new Promise(resolve=>setTimeout(()=>resolve({error:'status timeout'}),2000)),
    ]));
  }
  throw error;
} finally {await browser.close();}
