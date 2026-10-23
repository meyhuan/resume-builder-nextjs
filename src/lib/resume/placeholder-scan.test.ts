import { describe, it, expect } from 'vitest';
import { scanResumePlaceholders } from './placeholder-scan';
import type { ResumeData } from '@/entities/resume/resume-data';

describe('scanResumePlaceholders', () => {
  it('returns clean result when resume contains no placeholders', () => {
    const resume: ResumeData = {
      id: 'res-1',
      name: '测试简历',
      sections: [
        {
          id: 'sec-1',
          title: '工作经历',
          columns: 1,
          blocks: [
            {
              id: 'exp-1',
              type: 'experience',
              company: '联想',
              position: '研发',
              startDate: '2024.01',
              endDate: '2025.01',
              contentHtml: '<p>负责多端协同与性能调优，ANR率降低 50%。</p>',
            },
          ],
        },
      ],
    };

    const result = scanResumePlaceholders(resume);
    expect(result.hasPlaceholders).toBe(false);
    expect(result.count).toBe(0);
    expect(result.locations).toHaveLength(0);
  });

  it('detects [X]%, [X]+, and [建议补充] placeholders accurately', () => {
    const resume: ResumeData = {
      id: 'res-1',
      name: '测试简历',
      sections: [
        {
          id: 'sec-1',
          title: '工作经历',
          columns: 1,
          blocks: [
            {
              id: 'exp-1',
              type: 'experience',
              company: '联想',
              position: '研发',
              startDate: '2024.01',
              endDate: '2025.01',
              contentHtml:
                '<p>覆盖 [X]+ 款机型，ANR率降低 [X]%，[建议补充：架构方案]。</p>',
            },
          ],
        },
      ],
    };

    const result = scanResumePlaceholders(resume);
    expect(result.hasPlaceholders).toBe(true);
    expect(result.count).toBe(3);
    expect(result.locations).toHaveLength(1);
    expect(result.locations[0].blockId).toBe('exp-1');
  });
});
