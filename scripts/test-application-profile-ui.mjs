// Real Chromium UI with synthetic API responses. No database writes or real account.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import puppeteer from 'puppeteer';

const base='http://localhost:3000';
const blank=()=>({version:1,personal:{fullName:'',englishName:'',gender:'',birthDate:'',maritalStatus:'',healthStatus:'',height:'',weight:'',photoUrl:''},contact:{phone:'',alternatePhone:'',email:'',alternateEmail:'',currentCity:'',hometown:'',householdRegistration:'',address:''},identity:{idType:'',idNumber:'',nationality:'',ethnicity:'',politicalStatus:''},jobPreference:{targetRole:'',targetCity:'',employmentType:'',expectedSalary:'',availableDate:'',acceptAdjustment:''},education:[],experiences:[],projects:[],campus:[],abilities:{skills:'',certificates:'',languages:'',selfEvaluation:''},links:{personalWebsite:'',github:'',portfolio:'',linkedin:''},emergencyContact:{name:'',relationship:'',phone:''},familyMembers:[],commonAnswers:[]});
let profile=blank(),resumeId=null,syncs=0,saves=0,failSave=false;
const browser=await puppeteer.launch({headless:true});
try {
 const page=await browser.newPage();
 await page.setViewport({width:1280,height:900});
 await page.setCookie({name:'auth_uid',value:'synthetic-profile-ui',url:base});
 await page.setRequestInterception(true);
 page.on('request',request=>{
  const url=new URL(request.url());
  const respond=(body,status=200)=>void request.respond({status,contentType:'application/json',body:JSON.stringify(body)});
  if(url.origin!==base)return void request.abort();
  if(url.pathname==='/next-api/extension/authorizations')return respond([]);
  if(url.pathname==='/next-api/application-profile/sync'){
   syncs++;resumeId=JSON.parse(request.postData()).resumeId;
   profile.personal.fullName||='合成测试用户';
   profile.contact.email||='synthetic@example.invalid';
   if(!profile.experiences.length)profile.experiences.push({id:'synthetic-work',type:'work',company:'合成测试公司',position:'测试岗位',industry:'',location:'',startDate:'2023-03',endDate:'至今',description:'合成测试经历'});
   return respond({profile,defaultResumeId:resumeId});
  }
  if(url.pathname==='/next-api/application-profile'){
   if(request.method()==='PUT'){
    saves++;if(failSave)return respond({error:'合成保存失败'},503);
    const data=JSON.parse(request.postData());profile=data.profile;resumeId=data.defaultResumeId;
    return respond({updatedAt:new Date().toISOString()});
   }
   return respond({profile,defaultResumeId:resumeId,resumes:[{id:'resume-a',title:'合成简历甲'},{id:'resume-b',title:'合成简历乙'}]});
  }
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/next-api/'))return respond({code:200,data:null});
  void request.continue();
 });
 const click=async text=>{
  const button=await page.evaluateHandle(text=>[...document.querySelectorAll('button')].find(n=>n.innerText.trim()===text),text);
  assert.ok(button.asElement(),`Missing button: ${text}`);
  await button.evaluate(n=>n.scrollIntoView({block:'center'}));
  await button.asElement().click();await button.dispose();
 };
 const contains=async text=>page.waitForFunction(text=>document.body.innerText.includes(text),{},text);
 await page.goto(`${base}/dashboard/application-profile`);
 await page.waitForSelector('[aria-label="默认简历"]');
 await page.select('[aria-label="默认简历"]','resume-b');
 await click('从简历补充空缺');
 await page.waitForFunction(()=>document.getElementById('基本信息-fullName')?.value==='合成测试用户');
 assert.equal(syncs,1);assert.equal(saves,0);
 assert.ok(!(await page.$eval('body',n=>n.innerText.includes('有未保存的修改'))));
 await page.reload();await page.waitForSelector('[aria-label="默认简历"]');
 await page.waitForFunction(()=>document.getElementById('基本信息-fullName')?.value==='合成测试用户');
 assert.equal(await page.$eval('[aria-label="默认简历"]',n=>n.value),'resume-b');
 console.log('PASS: selection -> direct sync -> saved profile/default resume survive refresh');

 await click('从简历补充空缺');await page.waitForFunction(()=>document.querySelectorAll('button').length>0);
 await page.waitForFunction(()=>!document.querySelector('fieldset').disabled);
 assert.equal(profile.experiences.length,1);
 console.log('PASS: repeated sync does not duplicate synthetic experience');

 await page.click('#基本信息-birthDate');await page.waitForSelector('[data-radix-popper-content-wrapper]');
 const dateText=await page.$eval('[data-radix-popper-content-wrapper]',n=>n.innerText);
 assert.ok(!/January|February|March|Today|Clear|Monday|Sunday/.test(dateText));
 assert.ok(/年|月/.test(dateText));await page.keyboard.press('Escape');
 const city=await page.$('#联系方式-currentCity');await city.evaluate(n=>n.scrollIntoView({block:'center'}));
 await city.click();await page.waitForSelector('[role="listbox"]',{visible:true});
 const below=await page.evaluate(()=>{const input=document.getElementById('联系方式-currentCity').getBoundingClientRect();const list=document.querySelector('[role="listbox"]').getBoundingClientRect();return list.top>=input.bottom-2;});
 assert.ok(below,'Suggestions should appear below input');await page.keyboard.press('Escape');
 console.log('PASS: Chinese date popup and below-input suggestions');

 const name=await page.$('#基本信息-fullName');await name.click({clickCount:3});await name.type('合成手动编辑');
 const before=syncs;await click('从简历补充空缺');await contains('请先保存当前修改');assert.equal(syncs,before);
 failSave=true;await click('保存资料');await contains('合成保存失败');
 assert.equal(await page.$eval('#基本信息-fullName',n=>n.value),'合成手动编辑');
 failSave=false;await click('保存资料');await contains('网申资料已保存');
 await page.reload();await page.waitForFunction(()=>document.getElementById('基本信息-fullName')?.value==='合成手动编辑');
 console.log('PASS: manual edit protected; failed save retains values; retry persists');
 await mkdir('test-artifacts/application-profile-basic-qa',{recursive:true});
 await page.screenshot({path:'test-artifacts/application-profile-basic-qa/desktop.png'});
 await page.setViewport({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile horizontal overflow');
 await page.screenshot({path:'test-artifacts/application-profile-basic-qa/mobile.png'});
 console.log('PASS: desktop/mobile screenshots, no horizontal overflow at 390px');
}finally{await browser.close();}
