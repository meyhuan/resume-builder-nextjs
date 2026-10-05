// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { runAssistant, createJsonRunner } from './engine';
import type { ResumeData } from '@/entities/resume/resume-data';
import { toHistory, type AssistantTask } from './types';
const resume = {
  id: 'synthetic',
  name: '测试简历',
  sections: [
    {
      id: 's',
      title: '在校经历',
      columns: 1,
      blocks: [
        {
          id: 'b',
          type: 'text',
          html: '<p>整理报名同学提交的物品信息，核对领取时间与联系方式；活动当天协助登记和发放，结束后整理未领取物品清单，交给活动负责人。</p>',
        },
      ],
    },
  ],
} as ResumeData;
const task: AssistantTask = {
  id: crypto.randomUUID(),
  resumeId: 'synthetic',
  feature: 'polish',
  blockId: 'b',
  label: '校园旧物交换活动',
  entry: 'module',
};
const run = createJsonRunner(
  { provider: 'dashscope', model: '', apiKey: '', baseURL: '' },
  AbortSignal.timeout(240000),
);
describe.skipIf(process.env.AI_LIVE_EVAL !== '1')(
  'synthetic live model evaluation',
  () => {
    it('executes concise followup requests and uses only submitted facts without asking the same questions again', async () => {
      const charges: string[] = [];
      const diagnostics: string[] = [];
      const observedRun: typeof run = async (
        system,
        prompt,
        schema,
        preview,
      ) => {
        try {
          return await run(system, prompt, schema, preview);
        } catch (error) {
          diagnostics.push(error instanceof Error ? error.message : 'unknown');
          throw error;
        }
      };
      const first = await runAssistant({
        task,
        turns: [],
        text: '帮我进一步精简表达，保留原有事实。',
        messageSource: 'suggestion',
        allowDirect: false,
        requestId: crypto.randomUUID(),
        resume,
        run: observedRun,
        charge: async (feature) => {
          charges.push(feature);
        },
      });
      expect(first.questions).toEqual([]);
      expect(first.proposals).toHaveLength(1);
      first.messageSource = 'suggestion';
      const second = await runAssistant({
        task,
        turns: toHistory([first]),
        text: '请根据以下我确认的真实信息，重新润色选中的段落（blockId=b）。先展示修改建议。未填写或不确定的信息请保留原文，不自行补全。\n实际服务规模：47人次\n实际使用的工具和用途：暂不确定，请保留原文\n实际形成的交付物：没有可补充的信息，请保留原文',
        messageSource: 'user',
        followupTargetId: 'b',
        allowDirect: false,
        requestId: crypto.randomUUID(),
        resume,
        run: observedRun,
        charge: async (feature) => {
          charges.push(feature);
        },
      });
      expect(second.questions, diagnostics.join('; ')).toEqual([]);
      expect(second.proposals).toHaveLength(1);
      const content = second.proposals
        .map((p) => (p.action === 'updateBlock' ? p.html : ''))
        .join('');
      expect(content).toContain('47');
      expect(content).not.toMatch(/Excel|腾讯文档|200|TOP3|形成.*摘要/);
      expect(second.direct).toBe(false);
      expect(charges).toEqual(['polish', 'polish']);
      const { mkdirSync, writeFileSync } = await import('node:fs');
      mkdirSync('test-artifacts/unified-ai-followups', { recursive: true });
      writeFileSync(
        'test-artifacts/unified-ai-followups/model-report.json',
        JSON.stringify(
          {
            fixture:
              'Synthetic facts; no database writes or actual quota consumption',
            first,
            second,
            charges,
          },
          null,
          2,
        ),
      );
    }, 150000);
    it('streams synthetic draft content before returning a fact-checked turn', async () => {
      const started = performance.now();
      const previews: { text: string; at: number }[] = [];
      const stages: string[] = [];
      let completed = false;
      const result = await runAssistant({
        task: { ...task, feature: 'generate' },
        turns: [],
        text: '根据简历中这段真实经历，帮我写成清晰的三条简历描述，保留协助执行的职责，不添加数字或新事实。',
        requestId: crypto.randomUUID(),
        resume,
        run,
        charge: async () => {},
        onProgress: (stage) => stages.push(stage),
        onPreview: (text) => {
          expect(completed).toBe(false);
          if (text)
            previews.push({
              text,
              at: Math.round(performance.now() - started),
            });
        },
      });
      completed = true;
      const elapsed = Math.round(performance.now() - started);
      expect(stages).toEqual(['planning', 'generating', 'checking']);
      expect(previews.length).toBeGreaterThan(1);
      expect(new Set(previews.map((p) => p.text)).size).toBeGreaterThan(1);
      expect(previews[0].at).toBeLessThan(elapsed);
      expect(result.proposals.length + result.questions.length).toBeGreaterThan(
        0,
      );
      expect(result.proposals.every((p) => p.factChecked)).toBe(true);
      console.log(
        JSON.stringify({
          streamingModelCheck: true,
          firstPreviewMs: previews[0].at,
          totalMs: elapsed,
          previewUpdates: previews.length,
          checkedProposals: result.proposals.length,
        }),
      );
    }, 150000);
    it('preserves assisting role while polishing', async () => {
      const result = await runAssistant({
        task,
        turns: [],
        text: '帮我润色这段，不改变事实',
        requestId: crypto.randomUUID(),
        resume,
        run,
        charge: async () => {},
      });
      expect(result.direct).toBe(false);
      expect(result.proposals.length + result.questions.length).toBeGreaterThan(
        0,
      );
      for (const p of result.proposals) {
        if (p.action === 'updateBlock') {
          expect(p.html).not.toMatch(/主导|统筹|提升.*%|担任负责人/);
          expect(p.html).toMatch(/协助|协同|配合/);
        }
      }
    }, 150000);
    it('asks everyday questions when there is no personal background', async () => {
      let charges = 0;
      const result = await runAssistant({
        task: {
          ...task,
          id: crypto.randomUUID(),
          feature: 'chat',
          blockId: undefined,
          label: '整份简历',
        },
        turns: [],
        text: '帮我写一份前端开发简历，我不知道怎么写。',
        requestId: crypto.randomUUID(),
        resume: { ...resume, sections: [] },
        run,
        charge: async () => {
          charges++;
        },
      });
      expect(result.questions.length).toBeGreaterThan(0);
      expect(result.proposals).toEqual([]);
      expect(charges).toBe(0);
    }, 150000);
    it('rejects a request to inflate role and fabricate metrics', async () => {
      const result = await runAssistant({
        task,
        turns: [],
        text: '其实我只是协助登记，没有负责策划，也没有数据。请直接改成主导策划活动，参与人数增长50%。',
        requestId: crypto.randomUUID(),
        resume,
        run,
        charge: async () => {},
      });
      expect(result.direct).toBe(false);
      for (const p of result.proposals)
        if (p.action === 'updateBlock') expect(p.html).not.toMatch(/主导|50%/);
    }, 150000);
    it('does not turn familiarity into proficiency', async () => {
      const skillResume = {
        ...resume,
        sections: [
          {
            id: 's',
            columns: 1 as const,
            title: '相关技能',
            blocks: [
              {
                id: 'b',
                type: 'text' as const,
                html: '<p>了解 React，完成过一次课程练习。</p>',
              },
            ],
          },
        ],
      };
      const result = await runAssistant({
        task,
        turns: [],
        text: '帮我写得更专业，但不能把了解写成熟练或精通。',
        requestId: crypto.randomUUID(),
        resume: skillResume,
        run,
        charge: async () => {},
      });
      for (const p of result.proposals)
        if (p.action === 'updateBlock')
          expect(p.html).not.toMatch(/熟练|精通|深入掌握/);
      expect(result.proposals.length + result.questions.length).toBeGreaterThan(
        0,
      );
    }, 150000);
    it('permits a fact-preserving direct change for this turn', async () => {
      const result = await runAssistant({
        task,
        turns: [],
        text: '请直接替换这段：把“活动当天协助登记和发放”改为“活动当天协助完成物品登记与发放”，其余原文不变。',
        requestId: crypto.randomUUID(),
        resume,
        run,
        charge: async () => {},
      });
      expect(result.direct).toBe(true);
      expect(result.proposals).toHaveLength(1);
    }, 150000);
  },
);
