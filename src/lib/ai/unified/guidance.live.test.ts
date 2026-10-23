// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
vi.mock('server-only', () => ({}));
vi.mock('@/templates/template-loader', () => ({ TEMPLATE_REGISTRY: {} }));
import { createJsonRunner, runAssistant } from './engine';
import { toHistory, type AssistantTask, type AssistantTurn } from './types';
import { getDefaultModel } from '@/lib/ai/ai-runtime-config';
import { useAppStore } from '@/state/store';
import { useEditorUiStore } from '@/state/editor-ui-store';
import { applyChecked, undoChecked } from '@/components/ai-chat/unified-changes';
import { updateQuestionReply } from '@/components/ai-chat/unified-question-reply';
import type { ResumeData } from '@/entities/resume/resume-data';

const facts = '我想修改自我评价。我有 Android 客户端开发经验，熟悉 Kotlin、Java、Jetpack 和组件化开发，参与工具类产品功能迭代，做过需求拆解、编码实现、灰度发布和线上问题跟踪。没有会员运营经历，请仅基于这些真实经历写，不添加成果数字。';
const source = '<p>具备 Android 客户端开发经验，熟悉 Kotlin、Java、Jetpack 与组件化开发；参与工具类产品核心功能迭代，熟悉需求拆解、技术方案设计、编码实现、灰度发布与线上问题跟踪。</p><p>关注移动端性能优化、代码可维护性及用户体验，能够与产品、设计、服务端、测试团队协作推进项目交付。</p>';

describe.skipIf(process.env.AI_LIVE_EVAL !== '1')('real guided writing through application', () => {
  for (const scenario of ['empty-module', 'existing-global', 'existing-global-options'] as const) {
    it(`${scenario}: answers produce a checked, applicable edit`, async () => {
      const resume = { id: 'synthetic-guidance', name: '合成验收简历', sections: [{
        id: 'summary', title: '自我评价', columns: 1,
        blocks: [{ id: 'summary-block', type: 'text', html: scenario === 'empty-module' ? '' : source }],
      }] } as ResumeData;
      const task: AssistantTask = {
        id: crypto.randomUUID(), resumeId: resume.id, label: scenario === 'empty-module' ? '自我评价' : '整份简历',
        feature: scenario === 'empty-module' ? 'generate' : 'chat',
        entry: scenario === 'empty-module' ? 'module' : 'assistant',
        ...(scenario === 'empty-module' ? { blockId: 'summary-block' } : {}),
      };
      const realRun = createJsonRunner({ provider: 'dashscope', model: '', apiKey: '', baseURL: '' }, AbortSignal.timeout(180000));
      const calls: { phase: string; elapsedMs: number }[] = [];
      const turns: AssistantTurn[] = [];
      const charges: string[] = [];
      const started = Date.now();
      const report: Record<string, unknown> = { scenario, model: getDefaultModel().name, fixture: 'synthetic; real model; in-memory editor store; no database writes', turns, calls, charges };
      try {
        for (let index = 0; index < 2; index++) {
          let text = '我不知道怎么写，请引导我';
          if (index) {
            text = '';
            for (const question of turns[0].questions) {
              const answer = scenario === 'existing-global-options' ? question.options[0] || facts : facts;
              text = updateQuestionReply(text, question.question, answer, turns[0].questions);
            }
          }
          const turn = await runAssistant({
            task, resume, turns: toHistory(turns), text,
            messageSource: index ? 'user' : 'suggestion', requestId: crypto.randomUUID(), allowDirect: false,
            run: async (...args) => {
              const at = Date.now();
              const result = await realRun(...args);
              calls.push({ phase: args[0].slice(0, 40), elapsedMs: Date.now() - at });
              return result;
            },
            charge: async (feature) => { charges.push(feature); },
          });
          turn.messageSource = index ? 'user' : 'suggestion';
          turns.push(turn);
          if (index === 0 && scenario === 'empty-module') expect(turn.questions.length).toBeGreaterThan(0);
          if (!turn.questions.length) break;
        }
        const final = turns.at(-1)!;
        expect(final.questions).toEqual([]);
        expect(final.proposals.length, 'must produce a modification, not just preserve original').toBeGreaterThan(0);
        expect(final.direct).toBe(false);
        for (const proposal of final.proposals) {
          expect(proposal.action).toBe('updateBlock');
          if (proposal.action === 'updateBlock') {
            expect(proposal.blockId).toBe('summary-block');
            expect(proposal.html).toMatch(/Android/);
            expect(proposal.html).not.toMatch(/会员|拉新|留存率/);
          }
        }
        useAppStore.setState({ resume: structuredClone(resume), readOnly: false, pastStates: [], futureStates: [] });
        useEditorUiStore.setState({ assistantResumeId: resume.id });
        const receipt = applyChecked(final.proposals, resume.id);
        expect(receipt, 'actual editor applyChecked must accept the real output').not.toBeNull();
        expect(receipt!.after).not.toEqual(receipt!.before);
        report.appliedResume = receipt!.after;
        expect(undoChecked(receipt!)).toBe(true);
        expect(useAppStore.getState().resume).toEqual(resume);
        report.passed = true;
      } finally {
        report.elapsedMs = Date.now() - started;
        mkdirSync('test-artifacts/unified-ai-guidance', { recursive: true });
        writeFileSync(`test-artifacts/unified-ai-guidance/${scenario}.json`, JSON.stringify(report, null, 2));
      }
    }, 200000);
  }
});
