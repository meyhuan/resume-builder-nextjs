import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
const base = process.env.STORY_BASE_URL || 'http://127.0.0.1:3000';
const out = 'public/m/story-packs/v1';
await fs.mkdir(out,{recursive:true});
const browser = await puppeteer.launch({headless:true});
try {
 const page = await browser.newPage();
 await page.setViewport({width:1000,height:1400,deviceScaleFactor:2});
 await page.goto(`${base}/dev/story-materials`,{waitUntil:'networkidle0',timeout:120000});
 await page.waitForFunction(()=>document.querySelector('[data-story-resume]')?.textContent.includes('整理活动报名信息'));
 await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
 await page.evaluate(()=>document.fonts.ready);
 await page.$eval('[data-story-desktop-templates] [data-template-id=lanying]', el=>el.scrollIntoView({block:'center'}));
 for(const kind of ['resume','form','polish','polish-revised','desktop-templates','desktop-order']) await (await page.$(`[data-story-${kind}]`)).screenshot({path:`${out}/source-${kind}.png`});
 const geometry=await page.$eval('[data-story-resume]',root=>{
  const r=root.getBoundingClientRect();
  return [...root.querySelectorAll('[data-section-id]')].map(e=>({id:e.getAttribute('data-section-id'),y:e.getBoundingClientRect().y-r.y,height:e.getBoundingClientRect().height}));
 });
 console.log('Resume regions',JSON.stringify(geometry));
 await page.setViewport({width:390,height:844,deviceScaleFactor:2});
 await page.$eval('[data-open-templates]', button => button.click());
 await page.waitForSelector('[role=dialog]');
 await page.evaluate(()=>document.fonts.ready);
 await page.$eval('[role=dialog] [data-template-id=lanying]', el=>el.scrollIntoView({block:'center'}));
 await (await page.$('[role=dialog]')).screenshot({path:`${out}/source-templates.png`});
 await page.keyboard.press('Escape');
 await page.setViewport({width:1000,height:1400,deviceScaleFactor:2});
 for (const kind of ['checked','reordered']) {
  await page.$eval(`[data-mode=${kind}]`, el=>el.click());
  await page.waitForFunction((mode)=>{const t=document.querySelector('[data-story-resume]')?.innerText||''; return mode==='checked'?t.includes('检查重复报名'):t.indexOf('项目经历')<t.indexOf('教育经历');},{},kind);
  await (await page.$('[data-story-resume]')).screenshot({path:`${out}/source-resume-${kind}.png`});
 }
 console.log('Captured real Lanying resume and product form/settings components.');
} finally {await browser.close();}
