// @vitest-environment node
import { it, expect, vi } from 'vitest';
import { createServer } from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer';
vi.mock('server-only', () => ({}));
import { createJsonRunner, runAssistant } from '@/lib/ai/unified/engine';
import { getDefaultModel } from '@/lib/ai/ai-runtime-config';

it.skipIf(process.env.AI_LAYOUT_BROWSER !== '1')('real browser and model: guide, answer, apply, relay and scroll anchoring', async () => {
  const out = 'test-artifacts/assistant-layout-live'; mkdirSync(out, { recursive: true });
  const records: any[] = [];
  const report: any = { model: getDefaultModel().name, fixture: 'synthetic lab; real engine and model; no account or quota writes', records };
  const server = createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', 'content-type');
    if (req.method === 'OPTIONS') { res.end(); return; }
    const abort = new AbortController(); res.on('close', () => abort.abort());
    try {
      let raw = ''; for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw);
      res.setHeader('Content-Type', 'application/x-ndjson'); res.flushHeaders();
      const events: any[] = [];
      const emit = (event: any) => { events.push({ type: event.type, stage: event.stage, chars: event.text?.length }); res.write(JSON.stringify({ requestId: body.requestId, ...event }) + '\n'); };
      const turn = await runAssistant({ ...body, resume: body.resumeData, allowDirect: false,
        run: createJsonRunner({ provider: 'dashscope', model: '', apiKey: '', baseURL: '' }, AbortSignal.any([abort.signal, AbortSignal.timeout(150000)])),
        charge: async () => {}, onProgress: stage => emit({ type: 'progress', stage }), onPreview: text => emit({ type: 'preview', text }),
      });
      records.push({ blockId: body.task.blockId, reviewed: body.reviewedBlockIds, turn, events });
      emit({ type: 'result', turn }); res.end();
    } catch (error) { report.serverError = error instanceof Error ? error.message : String(error); res.end(); }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 800 }); page.setDefaultTimeout(180000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(String(error)));
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (request.url().includes('/next-api/') || request.url().includes('/analytics/events')) void request.respond({ status: 200, contentType: 'application/json', body: '{}' });
    else void request.continue();
  });
  await page.evaluateOnNewDocument((port) => {
    const native = window.fetch.bind(window);
    window.fetch = (input, init) => typeof input === 'string' && input.endsWith('/next-api/ai/chat/task')
      ? native(`http://127.0.0.1:${port}`, { ...init, headers: { 'Content-Type': 'application/json' } }) : native(input, init);
    const w = window as any; w.layoutFrames = []; w.replyNodes = new Map(); w.replaced = [];
    const sample = () => {
      const viewport = document.querySelector('[data-testid="assistant-conversation"]');
      const articles = [...document.querySelectorAll<HTMLElement>('[data-assistant-turn]')];
      for (const article of articles) {
        const id = article.dataset.assistantTurn; const node = article.querySelector('[data-assistant-reply]');
        if (w.replyNodes.has(id) && w.replyNodes.get(id) !== node) w.replaced.push(id);
        w.replyNodes.set(id, node);
      }
      const last = articles.at(-1); const reply = last?.querySelector('[data-assistant-reply]');
      if (viewport && reply) w.layoutFrames.push({ id: last?.dataset.assistantTurn, busy: reply.getAttribute('aria-busy'), top: reply.getBoundingClientRect().top, scroll: viewport.scrollTop, height: reply.getBoundingClientRect().height, input: document.querySelector('textarea[aria-label="向 AI 描述修改需求"]')?.getBoundingClientRect().top });
      requestAnimationFrame(sample);
    }; requestAnimationFrame(sample);
  }, port);
  const click = async (text: string) => {
    await page.waitForFunction(text => [...document.querySelectorAll('button')].some(b => !b.disabled && b.textContent?.trim().includes(text)), {}, text);
    await page.evaluate(text => { const b = [...document.querySelectorAll('button')].find(b => !b.disabled && b.textContent?.trim().includes(text)); b?.click(); }, text);
  };
  const idle = () => page.waitForFunction(() => !document.querySelector('[data-assistant-reply][aria-busy="true"]'));
  try {
    await page.goto((process.env.AI_TEST_BASE || 'http://localhost:3000') + '/dev/assistant-lab', { waitUntil: 'networkidle0', timeout: 120000 });
    await click('加载布局验收简历');
    await page.waitForSelector('textarea[aria-label="向 AI 描述修改需求"]');
    await page.type('textarea[aria-label="向 AI 描述修改需求"]', '我不知道怎么写，请引导我');
    await page.click('button[aria-label="发送消息"]');
    await page.waitForSelector('[data-testid="question-stepper"]'); await idle();
    await page.screenshot({ path: out + '/01-questions.png' });
    expect(records[0].turn.questions.length).toBeGreaterThan(0);
    for (let i = 0; i < records[0].turn.questions.length; i++) {
      const text = '我负责整理物品信息、核对领取时间与联系方式，活动当天协助登记和发放，结束后整理未领取清单交给负责人。没有具体指标，请仅基于原文润色。';
      await click('自己填写');
      await page.focus('textarea[aria-label="你的回答"]');
      await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control');
      await page.keyboard.type(text);
      await click(i === records[0].turn.questions.length - 1 ? '提交回答' : '确认，下一题');
    }
    await page.waitForSelector('[data-assistant-reply][aria-busy="true"]');
    // Genuine upward wheel input while the real model is running.
    const box = await page.$eval('[data-testid="assistant-conversation"]', el => { const r=el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+100}; });
    await page.mouse.move(box.x, box.y); await page.mouse.wheel({ deltaY: -350 });
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent === '回到最新'));
    await new Promise(resolve => setTimeout(resolve, 150));
    const paused = await page.$eval('[data-testid="assistant-conversation"]', el => el.scrollTop);
    await idle();
    const after = await page.$eval('[data-testid="assistant-conversation"]', el => el.scrollTop);
    report.pausedScroll = { before: paused, after, delta: Math.abs(after-paused) };
    expect(Math.abs(after-paused)).toBeLessThanOrEqual(2);
    expect(records[1].turn.proposals.length).toBeGreaterThan(0);
    await page.screenshot({ path: out + '/02-paused-final.png' });
    await click('回到最新'); await click('应用这一处');
    await page.screenshot({ path: out + '/03-applied.png' });
    for (let i=0; i<2; i++) {
      await click('继续优化下一段');
      await page.waitForSelector('[data-assistant-reply][aria-busy="true"]'); await idle();
      await click('应用这一处');
    }
    expect(records.map(r => r.blockId)).toEqual(['campus-activity','campus-activity','project-layout','summary-layout']);
    const next = await page.evaluate(() => [...document.querySelectorAll('button')].some(b => b.textContent?.includes('继续优化下一段')));
    expect(next).toBe(false);
    await page.screenshot({ path: out + '/04-complete.png' });
    const metrics = await page.evaluate(() => {
      const w=window as any; const transitions=[];
      for(let i=1;i<w.layoutFrames.length;i++) {const a=w.layoutFrames[i-1],b=w.layoutFrames[i];if(a.id===b.id&&a.busy==='true'&&b.busy==='false') transitions.push({id:b.id,topShift:Math.abs(b.top-a.top),heightShrink:Math.max(0,a.height-b.height),inputShift:Math.abs(b.input-a.input)});}
      return {transitions,replaced:w.replaced,frames:w.layoutFrames};
    });
    report.metrics=metrics; report.errors=errors;
    expect(metrics.replaced).toEqual([]);
    for (const t of metrics.transitions) { expect(t.topShift).toBeLessThanOrEqual(2); expect(t.heightShrink).toBeLessThanOrEqual(2); }
    expect(errors).toEqual([]); report.passed=true;
  } finally {
    if (!report.passed) { report.body = await page.$eval('body', el => el.innerText).catch(()=>''); await page.screenshot({path:out+'/failure.png'}).catch(()=>{}); }
    writeFileSync(out+'/report.json', JSON.stringify(report,null,2));
    await browser.close(); await new Promise<void>(resolve => server.close(()=>resolve()));
  }
}, 600000);
