import { describe, it, expect } from 'vitest';
import { resolveModuleKind } from './module-kind';

describe('resolveModuleKind', () => {
  it('classifies full-time experience correctly', () => {
    expect(resolveModuleKind('experience', '工作经历')).toBe('experience');
    expect(resolveModuleKind('experience', '工作背景')).toBe('experience');
    expect(resolveModuleKind('experience', 'Work Experience')).toBe('experience');
  });

  it('classifies internship correctly from title', () => {
    expect(resolveModuleKind('experience', '实习经历')).toBe('internship');
    expect(resolveModuleKind('experience', '日常实习')).toBe('internship');
    expect(resolveModuleKind('experience', 'Internship')).toBe('internship');
  });

  it('classifies project and campus by block type', () => {
    expect(resolveModuleKind('project', '核心项目')).toBe('project');
    expect(resolveModuleKind('campus', '在校实践')).toBe('campus');
  });

  it('classifies self-evaluation / summary by title', () => {
    expect(resolveModuleKind('text', '自我评价')).toBe('self-evaluation');
    expect(resolveModuleKind('text', '个人总结')).toBe('self-evaluation');
    expect(resolveModuleKind('text', '个人优势')).toBe('self-evaluation');
    expect(resolveModuleKind('text', 'Profile / Summary')).toBe('self-evaluation');
  });

  it('classifies skills by title', () => {
    expect(resolveModuleKind('text', '专业技能')).toBe('skills');
    expect(resolveModuleKind('list', 'IT技能')).toBe('skills');
    expect(resolveModuleKind('text', 'Skills & Tools')).toBe('skills');
  });

  it('classifies honors / awards by title', () => {
    expect(resolveModuleKind('text', '荣誉证书')).toBe('honors');
    expect(resolveModuleKind('text', '资质认证')).toBe('honors');
    expect(resolveModuleKind('list', '奖项荣誉')).toBe('honors');
  });

  it('classifies education blocks and titles correctly', () => {
    expect(resolveModuleKind('education', '教育背景')).toBe('education');
    expect(resolveModuleKind('text', '教育经历')).toBe('education');
  });

  it('falls back to generic for unknown custom blocks', () => {
    expect(resolveModuleKind('text', '自定义模块')).toBe('generic');
    expect(resolveModuleKind('text', '兴趣爱好')).toBe('generic');
  });
});
