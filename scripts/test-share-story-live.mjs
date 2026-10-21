import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import path from 'node:path';

const url = 'http://127.0.0.1:3000/m/share-story?platform=desktop';
const outDir = path.resolve('outputs/share-story-live-test');
await fs.mkdir(outDir, { recursive: true });

console.log('Launching browser to test:', url);
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 420, height: 920, deviceScaleFactor: 2 });

page.on('pageerror', err => console.error('[page error]', err.message));

try {
  // Step 1: Navigate to page
  console.log('1. Navigating to share-story desktop view...');
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.screenshot({ path: path.join(outDir, '01-step-choose.png') });

  // Click next button to feeling step
  console.log('2. Proceeding to Step 2 (Feelings)...');
  await page.waitForFunction(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('选好了，写感受'));
    return btn && !btn.disabled;
  });
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('选好了，写感受'));
    if (btn) btn.click();
  });
  await page.waitForFunction(() => document.querySelector('h1')?.textContent.includes('说说你的真实感受'));
  await page.screenshot({ path: path.join(outDir, '02-step-feeling-initial.png') });

  // Select Role: 运营/市场
  console.log('3. Selecting Role: 运营/市场...');
  await page.evaluate(() => {
    const roleBtn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('运营/市场'));
    if (roleBtn) roleBtn.click();
  });

  // Select Reason: 准备找工作
  console.log('4. Selecting Reason...');
  await page.evaluate(() => {
    const radio = document.querySelector('input[name="reason"]');
    if (radio) { radio.click(); radio.dispatchEvent(new Event('change', { bubbles: true })); }
  });

  // Select Feeling
  console.log('5. Selecting Feeling...');
  await page.evaluate(() => {
    const radio = document.querySelector('input[name="feeling"]');
    if (radio) { radio.click(); radio.dispatchEvent(new Event('change', { bubbles: true })); }
  });

  // Extra note
  console.log('6. Filling Extra detail...');
  await page.type('textarea', '主要把之前项目经历里的流水账改成了动词和量化数据。');

  // Check confirmation
  console.log('7. Confirming real experience...');
  await page.evaluate(() => {
    const cb = document.querySelector('input[type="checkbox"]');
    if (cb) {
      cb.checked = true;
      cb.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  const isChecked = await page.$eval('input[type="checkbox"]', el => el.checked);
  console.log('Checkbox is checked:', isChecked);

  page.on('response', async res => {
    if (res.url().includes('/next-api/xhs-note/fixed-story')) {
      console.log('API Response status:', res.status());
      try {
        const json = await res.json();
        console.log('API Response JSON:', JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('API Response text error:', e.message);
      }
    }
  });

  await page.screenshot({ path: path.join(outDir, '03-step-feeling-filled.png') });

  // Click AI Generate button
  console.log('8. Clicking AI generation button...');
  await page.evaluate(() => {
    const genBtn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('生成我的分享正文') || b.textContent.includes('生成'));
    if (genBtn) {
      genBtn.scrollIntoView();
      genBtn.click();
    }
  });

  // Wait for draft screen
  console.log('9. Waiting for AI generation to complete (timeout: 45s)...');
  await page.waitForFunction(() => document.querySelector('h1')?.textContent.includes('检查一下，就能分享'), { timeout: 45000 });
  await page.screenshot({ path: path.join(outDir, '04-step-draft-generated.png') });

  // Extract generated data
  const result = await page.evaluate(() => {
    const titleInput = document.querySelector('input');
    const bodyTextarea = document.querySelector('textarea');
    const tagsEl = document.querySelector('p[class*="tags"]');
    const commentEl = document.querySelector('p[class*="commentText"]');
    const noticeEl = document.querySelector('[role="status"]');

    return {
      title: titleInput ? titleInput.value : '',
      body: bodyTextarea ? bodyTextarea.value : '',
      tags: tagsEl ? tagsEl.textContent.trim() : '',
      pinnedComment: commentEl ? commentEl.textContent.trim() : '',
      notice: noticeEl ? noticeEl.textContent.trim() : '',
    };
  });

  console.log('\n================== AI GENERATION RESULT ==================');
  console.log('【标题】:', result.title, `(${result.title.length}字)`);
  console.log('【标签】:', result.tags);
  console.log('【正文】:\n' + result.body);
  console.log('\n【置顶首评神回复】:\n' + result.pinnedComment);
  console.log('【状态提示】:', result.notice);
  console.log('==========================================================\n');

  // Test regeneration button
  console.log('10. Testing "换个写法 · 让 AI 重新生成"...');
  await page.evaluate(() => {
    const regenBtn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('换个写法') || b.textContent.includes('重新生成'));
    if (regenBtn) regenBtn.click();
  });

  // Wait a moment for generation
  await new Promise(r => setTimeout(r, 6000));
  await page.screenshot({ path: path.join(outDir, '05-step-draft-regenerated.png') });

  const result2 = await page.evaluate(() => {
    const titleInput = document.querySelector('input');
    const bodyTextarea = document.querySelector('textarea');
    const commentEl = document.querySelector('p[class*="commentText"]');
    return {
      title: titleInput ? titleInput.value : '',
      body: bodyTextarea ? bodyTextarea.value : '',
      pinnedComment: commentEl ? commentEl.textContent.trim() : '',
    };
  });

  console.log('【重新生成版本】:');
  console.log('【标题 2】:', result2.title);
  console.log('【正文 2】:\n' + result2.body);

  await fs.writeFile(path.join(outDir, 'test-result.json'), JSON.stringify({ result, result2 }, null, 2));
  console.log('\nLive test passed! Screenshots saved to:', outDir);
} catch (err) {
  console.error('Test execution failed:', err);
  await page.screenshot({ path: path.join(outDir, 'error-screenshot.png') }).catch(() => {});
} finally {
  await browser.close();
}
