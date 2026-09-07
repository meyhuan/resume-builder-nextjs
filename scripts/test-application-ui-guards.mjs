import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
// Pure UI regression: all APIs are synthetic fixtures; never touches database.
const browser=await puppeteer.launch({headless:true});
try {
  const page=await browser.newPage();
  await page.setViewport({width:1280,height:900});
  await page.setCookie({name:'auth_uid',value:'synthetic-ui-guard',url:'http://localhost:3000'});
  let item={id:'synthetic-row',companyName:'合成公司',jobTitle:'合成岗位',status:'DRAFT',note:null,nextActionType:null,nextActionAt:null,deadlineAt:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),resume:null,events:[]};
  let patches=0;
  await page.setRequestInterception(true);
  page.on('request',request=>{
    const url=new URL(request.url());
    if(url.origin!=='http://localhost:3000') return void request.abort();
    if(url.pathname==='/next-api/applications') return void request.respond({status:200,contentType:'application/json',body:JSON.stringify([item])});
    if(url.pathname==='/next-api/applications/synthetic-row') {
      assert.equal(request.method(),'PATCH');patches++;
      const body=JSON.parse(request.postData());
      setTimeout(()=>{item={...item,...body};void request.respond({status:200,contentType:'application/json',body:JSON.stringify(item)});},800);
      return;
    }
    if(url.pathname.startsWith('/next-api/')||url.pathname.startsWith('/api/')) return void request.respond({status:200,contentType:'application/json',body:'{"code":200,"data":null}'});
    void request.continue();
  });
  await page.goto('http://localhost:3000/dashboard/applications');
  await page.waitForSelector('article button');
  await page.click('article button');
  await page.waitForSelector('[role="dialog"] textarea',{visible:true});
  await page.type('[role="dialog"] textarea','未保存的测试备注');
  let prompts=0;
  const dismiss=dialog=>{prompts++;void dialog.dismiss();};
  page.on('dialog',dismiss);
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>document.querySelector('[role="dialog"] textarea')?.value==='未保存的测试备注');
  assert.equal(prompts,1);
  page.off('dialog',dismiss);page.once('dialog',dialog=>void dialog.accept());
  await page.keyboard.press('Escape');
  await page.waitForSelector('[role="dialog"]',{hidden:true});
  const tabs=await page.$$('[aria-label="投递记录分类"] button');
  await tabs[1].click();await page.waitForSelector('article',{hidden:true});
  await tabs[1].click();await page.waitForSelector('article');
  const update=await page.evaluateHandle(()=>[...document.querySelectorAll('article button')].find(n=>n.innerText==='确认已投递'));
  await update.asElement().click({clickCount:2});
  assert.ok(await page.$eval('article',n=>n.innerText.includes('待投递')),'响应前不应显示已投递');
  await page.waitForFunction(()=>document.querySelector('article')?.innerText.includes('已投递'));
  assert.equal(patches,1,'重复点击产生多次PATCH');
  console.log('PASS: actual browser drawer cancel preserves unsaved note; confirmed close dismisses; repeated category click clears filter; double-click sends one PATCH and waits for acknowledgement');
} finally {await browser.close();}
