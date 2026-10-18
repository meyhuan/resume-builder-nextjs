import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { taskSystem } from '@/lib/ai/unified/policy';
import { buildPolishSystemPrompt } from '@/lib/ai/section-prompt-builder';
import { newTechTerms, placeholderCount, styleIssues } from '@/lib/ai/output-guards';
import type { SectionModuleType, SectionIdentity } from '@/lib/ai/section-types';

interface EvalCase {
  id: string;
  moduleKind: SectionModuleType;
  identity: SectionIdentity;
  label: string;
  content: string;
  wpsReference?: string;
  mustKeep: string[];
  forbiddenL3: string[];
  forbiddenRoleShift: string[];
  maxPlaceholders: number;
  bulletLen: [number, number];
  genericEndings: string[];
}

const casesPath = path.join(process.cwd(), 'scripts', 'polish-eval', 'cases.json');
const evalConfig = JSON.parse(fs.readFileSync(casesPath, 'utf-8')) as {
  cases: EvalCase[];
};

describe('Polish Prompt Specification & Deterministic Guard Suite', () => {
  it('generates customized system prompts for each module kind in taskSystem', () => {
    for (const testCase of evalConfig.cases) {
      const prompt = taskSystem(
        {
          id: 't1',
          resumeId: 'r1',
          feature: 'polish',
          label: testCase.label,
          entry: 'module',
          blockId: 'b1',
        },
        undefined,
        testCase.moduleKind,
      );

      // Verify that the prompt includes the modular writing spec
      expect(prompt).toContain('信息分级');
      expect(prompt).toContain('通用约束');
      expect(prompt).toContain('missingFacts');

      if (testCase.moduleKind === 'self-evaluation') {
        expect(prompt).toContain('自我评价');
        expect(prompt).toContain('禁用套话');
      } else if (testCase.moduleKind === 'skills') {
        expect(prompt).toContain('专业技能');
        expect(prompt).toContain('绝对禁止新增');
      } else if (testCase.moduleKind === 'internship') {
        expect(prompt).toContain('实习经历');
        expect(prompt).toContain('禁用“主导”');
      }
    }
  });

  it('generates consistent system prompts for drawer entry (buildPolishSystemPrompt)', () => {
    for (const testCase of evalConfig.cases) {
      const prompt = buildPolishSystemPrompt(
        testCase.identity,
        testCase.moduleKind,
        'professional',
        false,
      );

      expect(prompt).toContain('信息分级');
      expect(prompt).toContain('通用约束');
    }
  });

  it('detects hallucinated third-party tool names in WPS reference (Android Case)', () => {
    const androidCase = evalConfig.cases.find((c) => c.id === 'android-lenovo');
    expect(androidCase).toBeDefined();
    if (!androidCase || !androidCase.wpsReference) return;

    // WPS reference hallucinated LeakCanary & Profiler and demoted user to "协助 senior"
    const terms = newTechTerms(androidCase.content, androidCase.wpsReference);
    expect(terms).toContain('LeakCanary');
    expect(terms).toContain('Profiler');
    expect(terms).toContain('senior');

    // Confirm that our guard catches these forbidden items
    for (const forbidden of androidCase.forbiddenL3) {
      if (['LeakCanary', 'Profiler', 'senior'].includes(forbidden)) {
        expect(androidCase.wpsReference).toContain(forbidden);
      }
    }
  });

  it('verifies that clean professional rewrite passes all guard rules', () => {
    const cleanRewrite = `<ul>
<li><strong>核心项目协同：</strong>参与公司级核心项目「超级互联」的多端研发工作，协同跨端团队推进需求落地，保障多端功能体验一致性。</li>
<li><strong>架构与UI实现：</strong>负责 Android 端基础架构搭建与核心 UI/UX 功能开发，落实交互规范，保障操作响应流畅稳定。</li>
<li><strong>性能治理与适配：</strong>负责 Android 端性能专项分析与调优，定位并修复 ANR、OOM 及卡顿问题，完成 [X]+ 款机型兼容性适配，推动核心场景卡顿率降低 [X]%。</li>
<li><strong>多端通信协议：</strong>参与制定跨端通信协议规范与数据结构，输出端侧技术适配方案，支撑多端数据同步与指令互通。</li>
</ul>`;

    const androidCase = evalConfig.cases.find((c) => c.id === 'android-lenovo')!;
    const terms = newTechTerms(androidCase.content, cleanRewrite);
    expect(terms).toEqual([]);

    const pCount = placeholderCount(cleanRewrite);
    expect(pCount).toBeLessThanOrEqual(androidCase.maxPlaceholders);

    const issues = styleIssues(cleanRewrite, 'experience');
    expect(issues).toEqual([]);

    for (const keep of androidCase.mustKeep) {
      expect(cleanRewrite).toContain(keep);
    }
    for (const forbidden of androidCase.forbiddenRoleShift) {
      expect(cleanRewrite).not.toContain(forbidden);
    }
    for (const forbidden of androidCase.forbiddenL3) {
      expect(cleanRewrite).not.toContain(forbidden);
    }
  });
});
