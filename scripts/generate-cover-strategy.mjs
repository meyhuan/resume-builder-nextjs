import fs from 'node:fs';
import path from 'node:path';

const PLATFORM_PROFILES = {
  xiaohongshu: {
    label: '小红书',
    maxTitleLength: 16,
    preferredStyles: ['痛点型', '结果型', '反差型'],
    metricFocus: ['曝光', '阅读', '收藏', '评论'],
  },
  wechat: {
    label: '微信公众号',
    maxTitleLength: 24,
    preferredStyles: ['教程型', '信任型', '结果型'],
    metricFocus: ['打开率', '分享', '在看', '收藏'],
  },
  wechat_image: {
    label: '公众号贴图',
    maxTitleLength: 16,
    preferredStyles: ['痛点型', '动作型', '结果型'],
    metricFocus: ['打开率', '分享', '在看', '收藏'],
  },
  douyin: {
    label: '抖音图文',
    maxTitleLength: 14,
    preferredStyles: ['痛点型', '反差型', '动作型'],
    metricFocus: ['曝光', '点击', '滑完率', '互动'],
  },
};

const CANDIDATE_LIBRARY = {
  pain: [
    '简历别再手调 Word',
    '做简历别再改到崩',
    '排版乱？别再硬调',
  ],
  result: [
    'AI 生成后直接排版',
    '从初稿到导出一套做完',
    '简历改完就能导出',
  ],
  contrast: [
    '这才像 AI 简历工具',
    '不是只给你一段文案',
    'AI 写完还能继续改',
  ],
  action: [
    '点哪里就改哪里',
    '模块拖一下就前置',
    '一键换简历风格',
  ],
  tutorial: [
    'AI 简历从内容到导出',
    '一篇讲清 AI 简历流程',
    '简历内容和排版怎么连起来',
  ],
  trust: [
    '真实简历编辑流程拆解',
    '新手做简历的完整路径',
    'AI 简历工具看这几点',
  ],
};

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];
    if (token === '--count') {
      args.count = Number(next);
      index += 1;
    } else if (token === '--help' || token === '-h') {
      args.help = true;
    } else if (!args.taskFile) {
      args.taskFile = token;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
node scripts/generate-cover-strategy.mjs screenshots/notes/<slug>/publish-task.json --count 3
`);
}

function scoreCandidate(candidate, task, profile) {
  const titleLength = [...candidate.title].length;
  const hasPain = /Word|乱|手调|崩|不会|费/.test(candidate.title);
  const hasResult = /导出|排版|生成|改|流程|一套/.test(candidate.title);
  const hasAction = /点|拖|换|一键|直接/.test(candidate.title);
  const usesProofImage = Boolean(candidate.source_image);

  const scores = {
    one_second_clarity: Math.min(5, Math.max(2, candidate.title.length <= profile.maxTitleLength ? 5 : 3)),
    pain_strength: hasPain ? 5 : 3,
    benefit_clarity: hasResult || hasAction ? 5 : 3,
    mobile_readability: titleLength <= profile.maxTitleLength ? 5 : titleLength <= profile.maxTitleLength + 6 ? 4 : 2,
    screenshot_proof: usesProofImage ? 4 : 2,
    platform_fit: profile.preferredStyles.includes(candidate.angle) ? 5 : 4,
  };

  const total = Object.values(scores).reduce((sum, value) => sum + value, 0);
  return {
    ...candidate,
    scores,
    total_score: total,
    max_score: 30,
    recommendation_reason: buildReason(candidate, scores, task),
  };
}

function buildReason(candidate, scores) {
  const reasons = [];
  if (scores.pain_strength >= 5) reasons.push('痛点直接');
  if (scores.benefit_clarity >= 5) reasons.push('收益明确');
  if (scores.mobile_readability >= 5) reasons.push('手机端可读性好');
  if (scores.platform_fit >= 5) reasons.push('符合平台封面节奏');
  return reasons.join('，') || '作为备选角度保留';
}

function buildCandidates(task, count) {
  const coverImage = task.images?.find((image) => image.role === 'cover') || task.images?.[0];
  const workbenchImage = task.images?.find((image) => ['workbench', 'process'].includes(image.role)) || coverImage;
  const detailImage = task.images?.find((image) => ['rich-text', 'module-drag', 'theme-color'].includes(image.role)) || coverImage;

  const byPlatform = {
    xiaohongshu: [
      { angle: '痛点型', title: CANDIDATE_LIBRARY.pain[0], subtitle: '点哪里就能改，排版不用硬调', source_image: coverImage?.file },
      { angle: '结果型', title: CANDIDATE_LIBRARY.result[0], subtitle: 'AI 初稿继续编辑成简历', source_image: workbenchImage?.file },
      { angle: '反差型', title: CANDIDATE_LIBRARY.contrast[1], subtitle: '能编辑、能排版、能导出', source_image: detailImage?.file },
    ],
    wechat: [
      { angle: '教程型', title: CANDIDATE_LIBRARY.tutorial[0], subtitle: '生成、编辑、排版、导出完整流程', source_image: workbenchImage?.file },
      { angle: '信任型', title: CANDIDATE_LIBRARY.trust[0], subtitle: '用真实界面说明怎么改简历', source_image: coverImage?.file },
      { angle: '结果型', title: CANDIDATE_LIBRARY.result[1], subtitle: '把 AI 文案变成可投递简历', source_image: detailImage?.file },
    ],
    wechat_image: [
      { angle: '痛点型', title: CANDIDATE_LIBRARY.pain[0], subtitle: '点一下，直接改', source_image: coverImage?.file },
      { angle: '动作型', title: CANDIDATE_LIBRARY.action[0], subtitle: '正文、模块、主题都能改', source_image: coverImage?.file },
      { angle: '结果型', title: CANDIDATE_LIBRARY.result[0], subtitle: '从 AI 初稿到可投递简历', source_image: workbenchImage?.file },
    ],
    douyin: [
      { angle: '痛点型', title: CANDIDATE_LIBRARY.pain[0], subtitle: '点一下，直接改', source_image: coverImage?.file },
      { angle: '动作型', title: CANDIDATE_LIBRARY.action[0], subtitle: '正文、模块、主题都能改', source_image: coverImage?.file },
      { angle: '反差型', title: CANDIDATE_LIBRARY.contrast[0], subtitle: '不是只生成一段文字', source_image: workbenchImage?.file },
    ],
  };

  return (byPlatform[task.platform] || byPlatform.xiaohongshu).slice(0, count);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (!args.taskFile) throw new Error('Missing publish task path.');

  const taskFile = path.resolve(args.taskFile);
  const task = JSON.parse(fs.readFileSync(taskFile, 'utf8'));
  const profile = PLATFORM_PROFILES[task.platform] || PLATFORM_PROFILES.xiaohongshu;
  const candidates = buildCandidates(task, args.count || 3)
    .map((candidate) => scoreCandidate(candidate, task, profile))
    .sort((a, b) => b.total_score - a.total_score);

  task.cover_strategy = {
    generated_at: new Date().toISOString(),
    platform: task.platform,
    platform_label: profile.label,
    metric_focus: profile.metricFocus,
    scoring_dimensions: [
      'one_second_clarity',
      'pain_strength',
      'benefit_clarity',
      'mobile_readability',
      'screenshot_proof',
      'platform_fit',
    ],
    recommended: candidates[0],
    candidates,
    post_publish_review: {
      compare_by: profile.metricFocus,
      decision_rule: '优先保留点击/打开表现更好的标题角度，再看收藏、分享和评论质量。',
    },
  };

  fs.writeFileSync(taskFile, `${JSON.stringify(task, null, 2)}\n`);
  writeCoverStrategyPage(path.dirname(taskFile), task);
  console.log(`Generated cover strategy: ${taskFile}`);
  console.log(`Recommended: ${candidates[0].title} (${candidates[0].total_score}/30)`);
}

function writeCoverStrategyPage(packageDir, task) {
  const rows = task.cover_strategy.candidates
    .map(
      (candidate, index) => `<tr>
        <td>${index === 0 ? '推荐' : `备选 ${index + 1}`}</td>
        <td><strong>${escapeHtml(candidate.title)}</strong><br><span>${escapeHtml(candidate.subtitle || '')}</span></td>
        <td>${escapeHtml(candidate.angle)}</td>
        <td>${escapeHtml(candidate.source_image || '')}</td>
        <td>${escapeHtml(candidate.total_score)}/${escapeHtml(candidate.max_score)}</td>
        <td>${escapeHtml(candidate.recommendation_reason)}</td>
      </tr>`,
    )
    .join('');

  const scoreRows = Object.entries(task.cover_strategy.recommended.scores)
    .map(([key, value]) => `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}/5</td></tr>`)
    .join('');

  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(task.title)} - 封面点击率策略</title>
  <style>
    body { margin: 32px; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #171717; background: #fafafa; line-height: 1.7; }
    main { max-width: 980px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 28px; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { text-align: left; border-bottom: 1px solid #e5e7eb; padding: 10px; vertical-align: top; }
    th { background: #f9fafb; }
    .score { color: #0f766e; font-weight: 700; }
    code { background: #f4f4f5; padding: 2px 5px; border-radius: 4px; }
  </style>
</head>
<body>
<main>
  <h1>封面点击率策略</h1>
  <p>平台：${escapeHtml(task.cover_strategy.platform_label)} / 发布标题：${escapeHtml(task.title)}</p>
  <h2>推荐封面</h2>
  <p><strong>${escapeHtml(task.cover_strategy.recommended.title)}</strong> <span class="score">${escapeHtml(task.cover_strategy.recommended.total_score)}/${escapeHtml(task.cover_strategy.recommended.max_score)}</span></p>
  <p>${escapeHtml(task.cover_strategy.recommended.recommendation_reason)}</p>
  <h2>候选对比</h2>
  <table>
    <thead><tr><th>优先级</th><th>封面文案</th><th>角度</th><th>建议源图</th><th>评分</th><th>理由</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <h2>推荐封面评分拆解</h2>
  <table><tbody>${scoreRows}</tbody></table>
  <h2>发布后看什么</h2>
  <p>${task.cover_strategy.metric_focus.map((item) => `<code>${escapeHtml(item)}</code>`).join(' ')}</p>
  <p>${escapeHtml(task.cover_strategy.post_publish_review.decision_rule)}</p>
</main>
</body>
</html>`;

  fs.writeFileSync(path.join(packageDir, 'cover-strategy.html'), html);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

main();
