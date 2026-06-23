import fs from 'node:fs';
import path from 'node:path';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function musicSection(strategy) {
  return `<section data-music-strategy="douyin">
    <h2>配乐建议</h2>
    <p><strong>方向：</strong>${escapeHtml(strategy.mood)}</p>
    <p><strong>节奏：</strong>${escapeHtml(strategy.tempo)}</p>
    <p><strong>搜索词：</strong>${strategy.search_keywords.map((item) => `<code>${escapeHtml(item)}</code>`).join(' ')}</p>
    ${strategy.song_candidates?.length ? `<p><strong>候选音乐名：</strong>${strategy.song_candidates.map((item) => `<code>${escapeHtml(item)}</code>`).join(' ')}</p>` : ''}
    <p><strong>音量：</strong>${escapeHtml(strategy.volume)}</p>
    <p><strong>理由：</strong>${escapeHtml(strategy.reason)}</p>
    <p><strong>避免：</strong></p>
    <ul>${strategy.avoid.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
  </section>
  `;
}

function main() {
  const taskFile = process.argv[2];
  if (!taskFile) throw new Error('Missing publish-task.json path.');
  const task = JSON.parse(fs.readFileSync(taskFile, 'utf8'));
  if (task.platform !== 'douyin') throw new Error('Only douyin tasks are supported.');
  if (!task.music_strategy) throw new Error('Missing music_strategy in task.');

  const checklistFile = path.join(path.dirname(taskFile), 'publish-checklist.html');
  let html = fs.readFileSync(checklistFile, 'utf8');
  html = html.replace(/<section data-music-strategy="douyin">[\s\S]*?<\/section>\s*/g, '');
  html = html.replace(/(\s*<section>\s*\n\s*<h2>发布提醒<\/h2>)/, `${musicSection(task.music_strategy)}$1`);
  fs.writeFileSync(checklistFile, html);
  console.log(`Updated music checklist: ${checklistFile}`);
}

main();
