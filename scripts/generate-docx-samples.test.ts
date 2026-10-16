import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ResumeData } from '@/entities/resume/resume-data'
import { exportResumeToDocx } from '@/io/export-docx'

const outputDirectory = resolve(process.cwd(), 'test-artifacts', 'docx')
const sampleAvatarDataUrl = `data:image/jpeg;base64,${readFileSync(resolve(process.cwd(), 'public', 'avatar.jpg')).toString('base64')}`

const sampleResume: ResumeData = {
  id: 'docx-proof-resume',
  name: '林知夏',
  baseInfo: {
    avatarUrl: sampleAvatarDataUrl,
    showAvatar: true,
    title: '高级产品经理',
    phone: '138-0000-1234',
    email: 'linzhixia@example.com',
    location: '上海浦东',
    gender: '女',
    age: 29,
    customFields: [{ label: '作品集', value: 'portfolio.example.com' }],
  },
  jobIntention: {
    position: '高级产品经理',
    city: '上海 / 杭州',
    salary: '35k-45k',
    type: '全职',
    industry: 'AI SaaS / 企业服务',
    currentStatus: '在职，月内到岗',
  },
  jobIntentionVisible: true,
  sections: [
    {
      id: 'work',
      title: '工作经历',
      columns: 1,
      blocks: [
        {
          id: 'work-1', type: 'experience', company: '上海云启智能科技有限公司', position: '高级产品经理 · AI SaaS',
          startDate: '2022.04', endDate: '至今',
          contentHtml: '<ul><li>负责企业知识库产品从 0 到 1 上线，覆盖 120+ 付费客户。</li><li>推动检索链路重构，核心问答命中率从 71% 提升至 86%。</li><li>联合销售和交付团队沉淀行业方案，季度续费率提升 18%。</li></ul>',
        },
        {
          id: 'work-2', type: 'experience', company: '杭州数桥网络有限公司', position: '产品经理 · 数据中台',
          startDate: '2019.07', endDate: '2022.03',
          contentHtml: '<p>主导数据资产目录、权限申请和指标管理模块，服务 6 个大型政企项目。</p>',
        },
      ],
    },
    {
      id: 'project',
      title: '项目经历',
      columns: 1,
      blocks: [{
        id: 'project-1', type: 'project', name: '企业智能问答平台', role: '产品负责人',
        startDate: '2023.01', endDate: '2023.12',
        contentHtml: '<ul><li>设计文档解析、知识切片、权限过滤和答案溯源完整流程。</li><li>上线后客服平均响应时间从 6 分钟下降至 45 秒。</li></ul>',
      }],
    },
    {
      id: 'education',
      title: '教育经历',
      columns: 1,
      blocks: [{
        id: 'education-1', type: 'education', school: '复旦大学', major: '信息管理与信息系统', degree: '本科',
        startDate: '2015.09', endDate: '2019.06',
        courseHtml: '<p>核心课程：数据结构、数据库系统、用户研究、管理信息系统。</p>',
      }],
    },
    {
      id: 'skills',
      title: '相关技能',
      columns: 2,
      blocks: [{
        id: 'skills-1', type: 'list', items: [
          { id: 'skill-1', html: '<p>产品方法：PRD、用户访谈、竞品分析、A/B 测试、增长漏斗。</p>' },
          { id: 'skill-2', html: '<p>工具：Figma、Axure、SQL、Python、飞书多维表格。</p>' },
        ],
      }],
    },
  ],
}

describe('DOCX template proof of concept', () => {
  it.each([
    ['canva-minimal', 'canva-minimal.docx'],
    ['canva-columns', 'canva-columns.docx'],
    ['canva-sidebar', 'canva-sidebar.docx'],
    ['simple', 'single-column.docx'],
    ['jingrui', 'two-column.docx'],
    ['chengyan', 'complex-decorative.docx'],
  ] as const)('generates a valid %s artifact', async (templateId, fileName) => {
    mkdirSync(outputDirectory, { recursive: true })
    const buffer = await exportResumeToDocx(sampleResume, templateId)
    expect(buffer.subarray(0, 2).toString('ascii')).toBe('PK')
    expect(buffer.byteLength).toBeGreaterThan(5000)
    writeFileSync(resolve(outputDirectory, fileName), buffer)
  })

  it('rejects unverified templates instead of silently approximating them', async () => {
    await expect(exportResumeToDocx(sampleResume, 'modern-grid')).rejects.toThrow('verified Word templates only')
  })
})
