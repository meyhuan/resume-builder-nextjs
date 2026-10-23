// @vitest-environment node
import { it, expect, vi } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
vi.mock('server-only', () => ({}));
import { createJsonRunner, runAssistant } from '@/lib/ai/unified/engine';
import { MODULE_POLISH_REQUEST } from '@/lib/ai/unified/policy';
import { getDefaultModel } from '@/lib/ai/ai-runtime-config';
import type { ResumeData } from '@/entities/resume/resume-data';

it.skipIf(process.env.AI_LIVE_EVAL !== '1')('samples the actual desktop unified pipeline against WPS', async () => {
  const samples = JSON.parse(readFileSync('docs/wps-polish-samples-2026-10-18/samples.json', 'utf8')) as {
    role: string; modules: { module: string; original: string; polished: string }[];
  }[];
  const cases = [[0, '项目经历'], [1, '个人技能'], [9, '工作经历'], [9, '个人技能'],
    [5, '校园经历'], [7, '教育背景'], [3, '个人总结']] as const;
  const results = [];
  const variant = process.env.WPS_BLOCK_VARIANT || 'text';
  for (const [roleIndex, title] of cases) {
    const sample = samples[roleIndex];
    const resume = { id: 'synthetic-wps', name: '合成对照简历', sections: sample.modules.map((m, i) => ({
      id: `s${i}`, title: m.module, columns: 1,
      blocks: [variant === 'structured' && /工作|实习|项目|校园/.test(m.module)
        ? { id: `b${i}`, type: m.module === '项目经历' ? 'project' : m.module === '校园经历' ? 'campus' : 'experience',
          contentHtml: `<p>${m.original}</p>`, company: '', position: '', name: '', organization: '', startDate: '', endDate: '' }
        : { id: `b${i}`, type: 'text', html: `<p>${m.original}</p>` }],
    })) } as ResumeData;
    const index = sample.modules.findIndex((m) => m.module === title);
    const run = createJsonRunner({ provider: 'dashscope', model: '', apiKey: '', baseURL: '' }, AbortSignal.timeout(150000));
    const started = Date.now();
    const result = await runAssistant({
      task: { id: crypto.randomUUID(), resumeId: resume.id, feature: 'polish', blockId: `b${index}`, label: title, entry: 'module' },
      turns: [], text: MODULE_POLISH_REQUEST, messageSource: 'suggestion', allowDirect: false,
      requestId: crypto.randomUUID(), resume, run, charge: async () => {},
    });
    results.push({ role: sample.role, module: title, original: sample.modules[index].original,
      variant, wps: sample.modules[index].polished, model: getDefaultModel().name, elapsedMs: Date.now() - started, result });
    console.log(`Unified WPS comparison: ${results.length}/${cases.length}, proposals=${result.proposals.length}, questions=${result.questions.length}`);
    writeFileSync(`test-artifacts/wps-current-review/unified-${variant}.json`, JSON.stringify(results, null, 2));
  }
  expect(results).toHaveLength(cases.length);
}, 600000);
