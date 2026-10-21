// @vitest-environment node
import { it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { sanitizePolishedHtml, ungroundedNumbers, newTechTerms, removePlaceholderAt } from '@/lib/ai/output-guards';

it.skipIf(process.env.WPS_GUARD_REVIEW !== '1')('records guard boundary probes and placeholder removal outputs', () => {
  const probes = [
    { name: 'unknown tool and proficiency', source: '只会 Python 基础语法。', raw: '<ul><li>熟练使用 Rust 开发业务系统。</li></ul>' },
    { name: 'date number reused as achievement', source: '2025年7月开始实习。', raw: '<ul><li>累计完成7项项目。</li></ul>' },
    { name: 'absolute claim softened but still absolute', source: '帮忙登记物品。', raw: '<ul><li>物品登记零差错。</li></ul>' },
  ].map(p => {
    const cleaned = sanitizePolishedHtml(p.source, p.raw, 'experience', false);
    return { ...p, cleaned, numbers: ungroundedNumbers(p.source, cleaned), terms: newTechTerms(p.source, cleaned) };
  });
  const samples = JSON.parse(readFileSync('test-artifacts/wps-current-review/comparison.json', 'utf8')) as { role: string; module: string; ours: string }[];
  const removals = samples.filter(s => s.ours.includes('[X]')).map(s => {
    let removed = s.ours;
    while (removed.includes('[X]')) removed = removePlaceholderAt(removed, 0);
    return { role: s.role, module: s.module, original: s.ours, removed };
  });
  writeFileSync('test-artifacts/wps-current-review/guard-probes.json', JSON.stringify({ probes, removals }, null, 2));
  expect(probes).toHaveLength(3);
});
