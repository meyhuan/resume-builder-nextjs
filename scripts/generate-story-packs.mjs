/** Fixed 1080×1440 cards. Source captures are real components; copy is deliberately fixed. */
import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';
import sharp from 'sharp';
const root=process.cwd();
const out=path.join(root,'public/m/story-packs/v1');
const review=path.join(root,'outputs/story-sharing-ui/lanying-implemented-v1');
await fs.mkdir(review,{recursive:true});
const packs=JSON.parse((await fs.readFile('src/lib/xhs-note/story-packs.json','utf8')).replace(/^\uFEFF/,''));
const src={};
for(const kind of ['resume','resume-checked','resume-reordered','form','polish','polish-revised','templates','desktop-templates','desktop-order']) src[kind]='data:image/png;base64,'+(await fs.readFile(path.join(out,`source-${kind}.png`))).toString('base64');
const e=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const img=(kind,cls='')=>`<img class="${cls}" src="${src[kind]}" alt="${kind}">`;
const original='帮忙整理报名表，检查重复的人，再做名单。';
const revised='整理活动报名信息，核对重复记录，汇总参与名单。';
const checked='协助整理活动报名信息，检查重复报名，并汇总参与名单。';
const tag=s=>`<div class="tag">${s}</div>`;
let resumeKind='resume';
const resume=(cls='')=>`<div class="paper ${cls}">${img(resumeKind)}</div>`;
const crop=(section,cls='')=>`<div class="crop ${section} ${cls}">${img(resumeKind==='resume-reordered'?'resume':resumeKind)}</div>`;
const compare=(b=false)=>`<div class="comparison"><div><small>原文</small><p>${b?revised:original}</p></div><div><small>${b?'核对后示例':'润色示例'}</small><p>${b?checked:revised}</p></div></div>`;
const notes={templates:['标题有层级','经历分段清楚','选完模板，再检查正文和分页'],editing:['从一段经历开始','内容出现在这里','内容改完，检查长段落和分页'],'ai-polish':['已有事实','表达更清楚','事实、数字和职责范围，自己核对']};
function content(p,i){
 const mobile=p.platform==='mobile', b=p.variant==='B', t=p.feature;
 resumeKind=t==='ai-polish'&&b&&i===2?'resume-checked':(!mobile&&t==='editing'&&b?'resume-reordered':'resume');
 if(t==='templates'){
  if(i===0)return `<div class="cover ${b?'alternate':''}">${resume('hero-paper')}${b?`<div class="inset">${tag('标题层级')}${crop('education')}</div>`:`<div class="floating">${img(mobile?'templates':'desktop-templates')}</div>`}</div>`;
  if(i===1)return `<div class="operation">${resume('back-paper')}<div class="operation-panel ${mobile?'mobile-panel':'desktop-panel'}">${img(mobile?'templates':'desktop-templates')}</div><div class="operation-label">${mobile?'手机预览 · 模板选择':'电脑编辑器 · 模板选择'}</div></div>`;
  return `<div class="details">${tag(b?'标题层级':'标题有层级')}${crop('base')}${tag(b?'正文密度与日期对齐':'经历分段清楚')}${crop('work')}<div class="tip">${notes[t][2]}</div></div>`;
 }
 if(t==='editing'){
  if(i===0 && !mobile && b)return `<div class="sequence">${tag('顺序示意 · 想突出的经历先展示')}${crop('project')}${crop('education')}<div class="tip">顺序可以调整，内容仍由你决定</div>${resume('sequence-paper')}</div>`;
  if(i===0)return `<div class="cover">${resume('hero-paper')}<div class="floating ${mobile?'':'edit-float'}">${mobile?img('form'):`${tag('编辑区域示意')}${crop('project')}`}</div></div>`;
  if(i===1 && mobile)return `<div class="form-large">${img('form')}<div class="operation-label">手机端 · 项目经历</div></div>`;
  if(i===1 && b)return `<div class="operation">${resume('back-paper')}<div class="operation-panel desktop-panel">${img('desktop-order')}</div><div class="operation-label">电脑端 · 模块管理</div></div>`;
  if(i===1)return `<div class="details">${tag('点选经历正文 · 编辑区域示意')}${crop('project','selected')}<div class="text-note"><small>在简历画面上继续修改</small><p>${revised}</p></div>${resume('small-result')}</div>`;
  if(!mobile && b)return `<div class="sequence">${tag('项目经历 → 教育经历 · 顺序示意')}${crop('project')}${crop('education')}<div class="tip">修改后，检查整页阅读顺序</div>${resume('sequence-paper')}</div>`;
  return `<div class="details">${tag('填好的项目经历')}${crop('project')}<div class="checks"><span>日期</span><span>错字</span><span>段落长度</span></div>${resume('small-result')}<div class="side-note">${notes[t][2]}</div></div>`;
 }
 if(i===0)return `<div class="ai-cover">${compare(mobile&&b)}${resume('ai-paper')}<div class="ai-note">${b?'先核对，再采用':'表达可以调整\n经历不能增加'}</div></div>`;
 if(i===1 && mobile)return `<div class="polish-large">${img(b?'polish-revised':'polish')}<div class="tip">从实际做过的内容开始</div><div class="text-note"><small>任务 + 动作 + 交付物</small><p>活动报名整理<br />核对重复记录<br />汇总参与名单</p></div></div>`;
 if(i===1)return `<div class="desktop-compare">${tag('同一段经历 · 文案对比示例')}${compare(false)}<div class="tip">逐项核对，再放进简历</div>${crop('project')}</div>`;
 return `<div class="details">${tag(b?'核对后示例':'把准确的表达放进简历')}${b?`<div class="text-note"><p>${checked}</p></div>`:''}${crop('project')}<div class="checks"><span>事实准确</span><span>职责范围</span><span>自己的语气</span></div>${resume('small-result')}<div class="side-note">AI 建议<br />不等于最终稿</div></div>`;
}
const css=`
:root{--paper:#faf9f6;--white:#fff;--ink:#111119;--accent:#7055de;--soft:#efebfc;--line:#e8e4ef;--muted:#737987;--yellow:#fff1a3;--shadow:#7055de20;--font:'Microsoft YaHei','Noto Sans SC',sans-serif}*{box-sizing:border-box}body{margin:0;background:var(--paper);font-family:var(--font);color:var(--ink)}.card{width:1080px;height:1440px;padding:54px 56px 40px;position:relative;overflow:hidden}h1{font-size:94px;line-height:1.18;font-weight:900;letter-spacing:-4px;margin:0;position:relative;z-index:2}h1 span{display:block;color:var(--accent);white-space:nowrap}h1 b{font-weight:900;white-space:nowrap;display:block}.sub{font-size:35px;line-height:1.5;margin:22px 0 25px;position:relative;z-index:2}.sub mark{color:var(--ink);background:linear-gradient(transparent 48%,var(--yellow) 48%);padding:0 2px}.stage{height:940px;position:relative;overflow:hidden}.footer{position:absolute;bottom:28px;left:56px;right:56px;font-size:23px;color:var(--muted);display:flex;justify-content:space-between}.paper{background:var(--white);box-shadow:0 4px 28px var(--shadow);border:10px solid var(--white);border-radius:16px;overflow:hidden}.paper img{width:100%;display:block}.cover{height:100%;position:relative}.hero-paper{width:662px;position:absolute;left:0;top:0}.floating{position:absolute;width:410px;right:0;bottom:60px;background:var(--white);border:8px solid var(--white);border-radius:25px;box-shadow:0 8px 38px var(--shadow);overflow:hidden;max-height:750px}.floating>img{width:100%;display:block}.alternate .hero-paper{width:720px;left:100px}.inset{position:absolute;bottom:80px;left:0;width:900px;background:var(--white);border:9px solid var(--white);border-radius:16px;box-shadow:0 4px 28px var(--shadow)}.inset .crop{height:150px}.inset .crop.education img{top:-372px}.operation{height:100%;position:relative}.back-paper{width:750px;position:absolute;left:30px;top:0}.operation-panel{position:absolute;box-shadow:0 6px 30px var(--shadow);border-radius:28px;overflow:hidden;background:var(--white);border:8px solid var(--white)}.operation-panel img{width:100%;display:block}.mobile-panel{width:580px;right:0;top:75px;height:795px}.desktop-panel{width:540px;right:0;top:70px;height:800px}.operation-label{position:absolute;bottom:0;left:0;font-size:28px;color:var(--accent);background:var(--soft);padding:14px 24px;border-radius:10px}.tag{font-size:32px;line-height:1.4;color:var(--white);background:var(--accent);border-radius:24px;padding:10px 25px;width:max-content;max-width:100%;margin:10px 0 18px}.crop{position:relative;overflow:hidden;background:var(--white);border:4px solid var(--yellow);border-radius:18px;width:100%;height:275px;margin-bottom:32px}.crop img{width:100%;max-width:none;position:absolute;left:0;top:0}.crop.base{height:270px}.crop.base img{top:0}.crop.education{height:155px}.crop.education img{top:-408px}.crop.work{height:190px}.crop.work img{top:-555px}.crop.project{height:190px}.crop.project img{top:-730px}.details .tip{margin-top:26px}.tip{background:var(--soft);color:var(--accent);border-radius:16px;font-size:30px;line-height:1.5;padding:22px 26px}.small-result{width:300px;position:absolute;left:0;bottom:0}.side-note{position:absolute;right:0;top:625px;width:450px;font-size:41px;font-weight:700;line-height:1.55;white-space:pre-line}.checks{display:flex;gap:16px;margin:26px 0}.checks span{flex:1;text-align:center;background:var(--soft);border-radius:10px;padding:18px 8px;font-size:28px;color:var(--accent)}.form-large{position:relative;width:580px;margin:auto;height:100%}.form-large>img{width:100%;border-radius:22px;box-shadow:0 5px 28px var(--shadow)}.form-large .operation-label{bottom:0}.edit-float{width:650px;bottom:100px}.edit-float .crop{margin:0;height:135px}.edit-float .crop img{top:-487px}.selected{outline:5px solid var(--accent);outline-offset:3px}.text-note{padding:26px 30px;border:2px solid var(--line);background:var(--white);border-radius:18px}.text-note small{font-size:27px;color:var(--accent)}.text-note p{font-size:39px;line-height:1.65;margin:14px 0}.sequence .crop{margin-bottom:24px}.sequence-paper{position:absolute;width:340px;right:0;bottom:0}.sequence .tip{width:460px;font-size:35px}.comparison{display:grid;gap:25px}.comparison>div{background:var(--white);border:2px solid var(--line);border-radius:22px;padding:27px 32px}.comparison>div:last-child{background:var(--soft);border-color:var(--accent)}.comparison small{font-size:28px;color:var(--muted)}.comparison>div:last-child small{color:var(--accent)}.comparison p{font-size:42px;line-height:1.65;font-weight:600;margin:12px 0 0}.ai-paper{width:280px;position:absolute;right:0;bottom:0}.ai-note{position:absolute;bottom:130px;left:12px;font-size:46px;line-height:1.5;font-weight:700;white-space:pre-line;width:490px}.polish-large>img{width:640px;display:block;margin:0 auto 30px;border-radius:22px;box-shadow:0 5px 28px var(--shadow)}.polish-large .text-note{margin-top:28px}.polish-large .text-note p{font-size:35px;line-height:1.5}.desktop-compare .comparison{gap:16px}.desktop-compare .comparison p{font-size:36px}.desktop-compare .tip{margin:20px 0}.desktop-compare .crop{height:190px}.card.ai .footer{font-size:20px}.card.ai .details .crop{margin-top:24px}.card.ai .details .text-note p{font-size:34px}.card.ai .details .small-result{width:250px;bottom:0}.card.ai .details .side-note{top:730px;font-size:38px}
`;
const browser=await puppeteer.launch({headless:true});
const manifest=[];
try{
 const page=await browser.newPage();await page.setViewport({width:1080,height:1440,deviceScaleFactor:1});
 for(const p of packs){
  const files=[];
  for(let i=0;i<3;i++){
   const title=p.titles[i].split('\n');
   const subtitle=i===0?p.subtitle:i===1?(p.feature==='templates'?'看看真实界面，再选适合的版式':p.feature==='editing'?'用具体内容，展示这一步怎么做':'基于已有内容，查看另一种表达'):(p.feature==='templates'?'清晰的模块结构，让简历更易阅读':p.feature==='editing'?'成品与细节，都值得再看一遍':'留下准确的，改掉不符合的');
   const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><style>${css}</style><article class="card ${p.feature==='ai-polish'?'ai':''}"><h1><b>${e(title[0])}</b><span>${e(title[1]||'')}</span></h1><p class="sub"><mark>${e(subtitle)}</mark></p><div class="stage">${content(p,i)}</div><footer class="footer"><span>智简简历 · 产品示例</span><span>${p.feature==='ai-polish'?'文案示例，非实测 AI 输出':'人物与经历为模拟数据'}</span></footer></article></html>`;
   await page.setContent(html,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
   await page.evaluate(()=>Promise.all([...document.images].map(im=>im.decode())));
   const overflow=await page.$$eval('h1 b,h1 span',els=>els.some(el=>el.scrollWidth>el.clientWidth));
   if(overflow)throw new Error(`${p.id} card ${i+1} headline overflows`);
   const file=`${p.id}-${i+1}.png`;await page.screenshot({path:path.join(out,file)});files.push(file);
  }
  const buffers=await Promise.all(files.map(file=>sharp(path.join(out,file)).resize(540,720).toBuffer()));
  await sharp({create:{width:1620,height:720,channels:3,background:'#faf9f6'}}).composite(buffers.map((input,i)=>({input,left:i*540,top:0}))).png().toFile(path.join(review,`${p.id}.png`));
  manifest.push({...p,files});console.log(p.id);
 }
}finally{await browser.close();}
await fs.writeFile(path.join(review,'manifest.json'),JSON.stringify({version:'fixed-story-v1',width:1080,height:1440,template:'lanying',packs:manifest},null,2));
const gallery=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>蓝营分享素材 · 实际输出</title><style>body{background:#faf9f6;color:#181823;font-family:system-ui;margin:32px auto;max-width:1500px;padding:0 20px}h1{font-size:32px}section{margin:40px 0}img{width:100%;border:1px solid #ddd}a{color:#7055de}p{line-height:1.8}</style><h1>蓝营分享素材 · 实际输出</h1><p>12 组 / 36 张 · 每张 1080 × 1440。下面展示的是 H5 实际使用的图片。人物与经历均为模拟数据；AI 对比文字为示例。<br><a href="http://127.0.0.1:3000/m/share-story?test=1">打开 H5 分享页面</a></p>${packs.map(p=>`<section><h2>${p.name}</h2><img src="${p.id}.png"><p><a href="../lanying-concepts-v1/${p.id}.png">查看此前设计稿</a></p></section>`).join('')}</html>`;
await fs.writeFile(path.join(review,'index.html'),gallery);
console.log('36 cards and comparison gallery generated.');
