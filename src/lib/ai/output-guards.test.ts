import { describe, it, expect } from 'vitest';
import {
  newTechTerms,
  placeholderCount,
  styleIssues,
  sanitizePolishedHtml,
  extractDataConfirmationItems,
  fillPlaceholderAt,
  removePlaceholderAt,
  ungroundedNumbers,
} from './output-guards';

describe('output-guards', () => {
  it('detects unverified new tech terms and ignores universal ones', () => {
    const source = '负责 Android 端性能分析，解决 ANR 和 OOM';
    const cleanResult =
      '负责 Android 端性能分析与优化，定位并处理 ANR、OOM 问题，完成 UI/UX 适配';
    expect(newTechTerms(source, cleanResult)).toEqual([]);

    const halluResult =
      '依托 LeakCanary 与 Profiler 工具排查内存泄漏，引入 MVVM 架构';
    const detected = newTechTerms(source, halluResult);
    expect(detected).toContain('LeakCanary');
    expect(detected).toContain('Profiler');
    expect(detected).toContain('MVVM');
  });

  it('counts [X] placeholders accurately', () => {
    expect(placeholderCount('<div>无占位符</div>')).toBe(0);
    expect(placeholderCount('<p>覆盖 [X]+ 款机型，ANR率降低 [X]%</p>')).toBe(2);
    expect(placeholderCount('<li>覆盖 [x]+ 款机型</li>')).toBe(1);
  });

  it('detects style issues like placeholder limit and generic endings', () => {
    const experienceHtml =
      '<ul><li><strong>性能优化：</strong>覆盖 [X]+ 款机型，ANR率降低 [X]%，崩溃率降低 [X]%，极大提升用户体验。</li></ul>';
    const issues = styleIssues(experienceHtml, 'experience');
    expect(issues.some((i) => i.includes('占位符数量超标'))).toBe(true);
    expect(issues.some((i) => i.includes('包含万能套话结尾'))).toBe(true);
  });

  it('detects banned clichés in self-evaluation', () => {
    const summaryHtml =
      '<p>本人吃苦耐劳，性格开朗，具有责任心极强的态度。</p>';
    const issues = styleIssues(summaryHtml, 'self-evaluation');
    expect(issues.some((i) => i.includes('吃苦耐劳'))).toBe(true);
    expect(issues.some((i) => i.includes('性格开朗'))).toBe(true);
    expect(issues.some((i) => i.includes('责任心极强'))).toBe(true);
  });

  it('sanitizes ungrounded numbers, invented names, unmentioned tools, and structure', () => {
    const source =
      '2024年暑假在软件公司实习两个月，跟着测试同事跑用例，检查页面展示和按钮。帮忙整理缺陷截图，维护测试账号，参加每天的晨会。';
    const raw =
      '<p><strong>测试执行：</strong>独立负责「智能工单系统」功能测试，覆盖 8+ 个模块，准确率达 100%。</p><ul><li><strong>缺陷管理：</strong>使用 Jira 提交 20+ 条缺陷，响应小于 2 小时。</li></ul>';

    const cleaned = sanitizePolishedHtml(source, raw, 'internship', false);
    expect(cleaned).not.toContain('智能工单系统');
    expect(cleaned).not.toContain('独立负责');
    expect(cleaned).not.toContain('Jira');
    expect(cleaned).toMatch(/^<ul>[\s\S]*<\/ul>$/);
    expect(ungroundedNumbers(source, cleaned)).toEqual([]);
    expect(placeholderCount(cleaned)).toBeLessThanOrEqual(2);
  });

  it('extracts confirmation items and fills or removes placeholders accurately', () => {
    const html =
      '<ul><li><strong>接口联调：</strong>页面视觉还原度达 [X]% 以上，累计闭环 [X] 个缺陷。</li></ul>';
    const items = extractDataConfirmationItems(html);
    expect(items).toHaveLength(2);
    expect(items[0].label).toContain('[X]%');
    expect(items[1].label).toContain('[X]');

    const filled = fillPlaceholderAt(html, 0, '95');
    expect(filled).toContain('95%');
    expect(placeholderCount(filled)).toBe(1);

    const removed = removePlaceholderAt(filled, 0);
    expect(placeholderCount(removed)).toBe(0);
  });
});
