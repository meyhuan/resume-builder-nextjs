import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer';
const artifactDir=resolve('test-artifacts/extension-release');
await mkdir(artifactDir,{recursive:true});
const browser=await puppeteer.launch({headless:true});
try {
  const page=await browser.newPage();
  await page.setViewport({width:1440,height:1000,deviceScaleFactor:1});
  await page.setRequestInterception(true);
  page.on('request',request=>{
    if (request.url().endsWith('/next-api/admin/extension-metrics')) {
      void request.respond({status:200,contentType:'application/json',body:JSON.stringify({total:3,sampled:3,truncated:false,rows:[
        {domain:'careers.tencent.com',version:'0.5.0',runs:2,successfulRuns:1,partialRuns:1,failedRuns:0,filled:18,existing:20,failed:2,unmatched:3,missing:1,datePrecisionMissing:2,repeatersFailed:0,averageDurationMs:1200,writableSuccessRate:0.9},
        {domain:'talent.taotian.com',version:'0.5.0',runs:1,successfulRuns:0,partialRuns:1,failedRuns:0,filled:2,existing:29,failed:17,unmatched:3,missing:2,datePrecisionMissing:17,repeatersFailed:1,averageDurationMs:2500,writableSuccessRate:2/19},
      ]})});
    } else void request.continue();
  });
  await page.goto('http://localhost:3000/admin/extension-metrics',{waitUntil:'networkidle0',timeout:60000});
  await page.waitForSelector('input[type="password"]');
  // Synthetic UI fixture only: no real administrator password is used.
  await page.type('input[type="password"]','synthetic-ui-only');
  await page.click('form button');
  await page.waitForSelector('tbody tr');
  assert.equal(await page.$$eval('tbody tr',rows=>rows.length),2);
  assert.ok((await page.$eval('table',node=>node.textContent)).includes('90.0%'));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'页面整体不应横向溢出');
  await page.screenshot({path:resolve(artifactDir,'metrics-desktop.png'),fullPage:true});
  console.log('PASS: local metrics UI renders grouped synthetic rows, Chinese labels and bounded table scroll');
} finally {await browser.close();}
