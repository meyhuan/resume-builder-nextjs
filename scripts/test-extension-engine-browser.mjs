import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import ts from 'typescript';
import puppeteer from 'puppeteer';

// Transpile actual self-contained engine modules, never a copied test implementation.
async function moduleAt(name) {
  const source=await readFile(`extension/lib/${name}.ts`,'utf8');
  const {outputText}=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}});
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const {collectPageSnapshot}=await moduleAt('page-scanner');
const {runRepeaterEngine}=await moduleAt('repeater-engine');
const {buildFillPlan}=await moduleAt('mapping');
const {applyFillActions}=await moduleAt('fill-executor');
const profile={experiences:Array.from({length:4},(_,i)=>({company:`合成测试公司${i+1}`,position:`测试岗位${i+1}`,description:`测试职责${i+1}`}))};
const browser=await puppeteer.launch({headless:true});
try {
  const page=await browser.newPage();
  await page.setViewport({width:1000,height:900});
  // No real recruitment site, credentials, personal information or network calls.
  await page.setRequestInterception(true);
  page.on('request',request=>void request.abort());
  const field=(label,tag='input')=>`<div class="kuma-uxform-field"><div class="kuma-uxform-field-label">${label}</div><div><${tag}></${tag}></div></div>`;
  for (const depth of [0,14]) {
    const row=`<div class="field-group-row">${field('公司名称')}${field('职务')}${field('职务描述','textarea')}</div>`;
    await page.setContent(`<html lang="zh-CN"><style>body{font:16px sans-serif;padding:24px}input,textarea{display:block;margin:6px;width:300px}.field-group-row{border:1px solid #ccc;padding:12px;margin:12px}</style><form><section class="uxcore-card"><h2>工作经历</h2>${'<div>'.repeat(depth)}<div class="rows">${row}<button type="button" class="add-more-btn-link">添加工作经历</button></div>${'</div>'.repeat(depth)}</section><button type="submit">提交简历</button><button type="button" id="save">保存</button></form></html>`);
    await page.evaluate(()=>{
      window.qa={submits:0,saves:0};
      document.querySelector('form').onsubmit=e=>{e.preventDefault();window.qa.submits++;};
      document.querySelector('#save').onclick=()=>window.qa.saves++;
      document.querySelector('.add-more-btn-link').onclick=()=>setTimeout(()=>{
        const clone=document.querySelector('.field-group-row').cloneNode(true);
        clone.classList.add('decoration-'+document.querySelectorAll('.field-group-row').length);
        clone.querySelectorAll('input,textarea').forEach(n=>{n.value='';n.removeAttribute('data-aijianli-field-id');});
        document.querySelector('.rows').insertBefore(clone,document.querySelector('.add-more-btn-link'));
      },120);
    });
    const before=await page.evaluate(collectPageSnapshot,null);
    const expanded=await page.evaluate(runRepeaterEngine,before.repeaters,{experiences:4});
    assert.equal(expanded.addedRows,3,`depth ${depth}: 应新增3条`);
    const snapshot=await page.evaluate(collectPageSnapshot,null);
    const plan=buildFillPlan(profile,snapshot.fields);
    const result=await page.evaluate(applyFillActions,plan.actions);
    assert.equal(result.filled,12);
    const values=await page.$$eval('.field-group-row',rows=>rows.map(row=>[...row.querySelectorAll('input,textarea')].map(n=>n.value)));
    assert.deepEqual(values,profile.experiences.map(item=>[item.company,item.position,item.description]));
    assert.equal((await page.evaluate(runRepeaterEngine,snapshot.repeaters,{experiences:4})).addedRows,0);
    const repeated=await page.evaluate(applyFillActions,plan.actions);
    assert.equal(repeated.filled,0);
    assert.equal(repeated.alreadyFilled,12);
    assert.deepEqual(await page.evaluate(()=>window.qa),{submits:0,saves:0});
    console.log(`PASS: Chromium generic ${depth}-level layout adds 3 rows, fills all 12 fields in record order, repeat is idempotent, zero save/submit`);
  }
  await mkdir('test-artifacts/extension-release',{recursive:true});
  await page.screenshot({path:'test-artifacts/extension-release/synthetic-four-experiences.png',fullPage:true});
  await page.setContent('<input type="date" data-aijianli-field-id="date">');
  const actions=[{fieldId:'date',value:'2023-02'}];
  assert.equal((await page.evaluate(applyFillActions,actions)).filled,0);
  assert.equal(await page.$eval('input',n=>n.value),'');
  assert.equal((await page.evaluate(applyFillActions,actions,{allowMonthStart:true})).filled,1);
  assert.equal(await page.$eval('input',n=>n.value),'2023-02-01');
  console.log('PASS: native Chromium date remains blank without consent; explicit synthetic-test consent completes first day');
} finally {await browser.close();}
