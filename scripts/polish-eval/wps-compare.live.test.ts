// @vitest-environment node
/**
 * Live comparison: run the optimized section-polish pipeline (prompt + deterministic
 * guard sanitizer + missing-fact extraction) against the WPS sample inputs and dump
 * side-by-side results and evaluation metrics.
 *
 * Run: $env:AI_LIVE_EVAL="1"; pnpm vitest run scripts/polish-eval/wps-compare.live.test.ts --config scripts/vitest.unified-ai.config.ts
 * Optional: $env:WPS_COMPARE_OUT="path/to/out.json"; $env:WPS_COMPARE_ROLES="0,1,3,7"
 */
import { describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { readFileSync, writeFileSync } from 'node:fs';
import { createOpenAIClient, getModelByName } from '@/lib/ai/ai-runtime-config';
import { resolveThinkingMode } from '@/lib/ai/thinking-policy';
import {
  buildPolishSystemPrompt,
  buildPolishUserPrompt,
} from '@/lib/ai/section-prompt-builder';
import type { SectionModuleType } from '@/lib/ai/section-types';
import {
  newTechTerms,
  placeholderCount,
  styleIssues,
  sanitizePolishedHtml,
  ungroundedNumbers,
  toMissingFacts,
} from '@/lib/ai/output-guards';

interface SampleModule {
  module: string;
  original: string;
  polished: string;
}
interface Sample {
  role: string;
  modules: SampleModule[];
}

const MODULE_MAP: Record<string, SectionModuleType> = {
  教育背景: 'education',
  工作经历: 'experience',
  实习经历: 'internship',
  项目经历: 'project',
  校园经历: 'campus',
  个人技能: 'skills',
  个人总结: 'self-evaluation',
};

const samples: Sample[] = JSON.parse(
  readFileSync('docs/wps-polish-samples-2026-10-18/samples.json', 'utf8'),
);

describe.skipIf(process.env.AI_LIVE_EVAL !== '1')('WPS comparison (live)', () => {
  it('polishes sample modules with optimized prompts and guards', async () => {
    const roleIdx = (process.env.WPS_COMPARE_ROLES ?? '0,1,3,7')
      .split(',')
      .map(Number);
    const modelConfig = getModelByName('');
    const client = createOpenAIClient(
      modelConfig,
      resolveThinkingMode('default'),
    );
    const jobs = roleIdx.flatMap((i) =>
      samples[i].modules.map((m) => ({ role: samples[i].role, ...m })),
    );
    const evaluate = async (job: (typeof jobs)[number]) => {
        const moduleType = MODULE_MAP[job.module] ?? 'generic';
        const res = await client.chat.completions.create({
          model: modelConfig.name,
          messages: [
            {
              role: 'system',
              content: buildPolishSystemPrompt(
                'graduate',
                moduleType,
                'professional',
                false,
              ),
            },
            { role: 'user', content: buildPolishUserPrompt(job.original) },
          ],
          temperature: 0.35,
          max_tokens: 4096,
        });
        const rawOurs = res.choices[0]?.message?.content ?? '';
        const ours = sanitizePolishedHtml(
          job.original,
          rawOurs,
          moduleType,
          false,
        );
        const plain = ours.replace(/<[^>]+>/g, '');
        const missingFacts = toMissingFacts(ours);
        return {
          role: job.role,
          module: job.module,
          moduleType,
          original: job.original,
          wps: job.polished,
          rawOurs,
          ours,
          model: modelConfig.name,
          finishReason: res.choices[0]?.finish_reason,
          missingFacts,
          stats: {
            origLen: job.original.length,
            wpsLen: job.polished.length,
            oursLen: plain.length,
            bulletCount: (ours.match(/<li>/g) ?? []).length,
            isSingleUl: /^<ul>[\s\S]*<\/ul>$/.test(ours.trim()),
            oursPlaceholders: placeholderCount(ours),
            wpsPlaceholders: (job.polished.match(/X/g) ?? []).length,
            oursUngroundedNums: ungroundedNumbers(job.original, ours),
            wpsUngroundedNums: ungroundedNumbers(job.original, job.polished),
            oursNewTerms: newTechTerms(job.original, plain),
            wpsNewTerms: newTechTerms(job.original, job.polished),
            oursStyle: styleIssues(ours, moduleType),
          },
        };
      };
    const results: Awaited<ReturnType<typeof evaluate>>[] = [];
    for (let start = 0; start < jobs.length; start += 5) {
      results.push(...await Promise.all(jobs.slice(start, start + 5).map(evaluate)));
      console.log(`WPS comparison: ${results.length}/${jobs.length}`);
    }
    const out =
      process.env.WPS_COMPARE_OUT ?? 'scripts/polish-eval/wps-compare.out.json';
    writeFileSync(out, JSON.stringify(results, null, 2), 'utf8');
    expect(results.length).toBe(jobs.length);
  }, 600000);
});
