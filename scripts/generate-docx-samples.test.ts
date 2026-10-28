import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { afterAll, describe, expect, it } from 'vitest'
import type { ResumeData } from '@/entities/resume/resume-data'
import { exportResumeToDocx } from '@/io/export-docx'
import { getTemplateFixture, getTemplateLabTheme } from '@/lib/template-fixtures'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'

const outputDirectory = resolve(process.env.DOCX_QA_OUTPUT_DIR || resolve(process.cwd(), 'test-artifacts', 'docx'))
const sampleAvatarDataUrl = `data:image/jpeg;base64,${readFileSync(resolve(process.cwd(), 'public', 'avatar.jpg')).toString('base64')}`
const artifacts: { templateId: string; file: string; bytes: number; generationMs: number }[] = []

async function generateArtifact(resume: ResumeData, templateId: string, file: string, theme?: ThemeTokens) {
  const started = performance.now()
  const buffer = await exportResumeToDocx(resume, templateId, theme)
  const generationMs = Math.round((performance.now() - started) * 100) / 100
  expect(buffer.subarray(0, 4).toString('hex')).toBe('504b0304')
  expect(buffer.byteLength).toBeGreaterThan(5000)
  mkdirSync(outputDirectory, { recursive: true })
  writeFileSync(resolve(outputDirectory, file), buffer)
  artifacts.push({ templateId, file, bytes: buffer.byteLength, generationMs })
}

afterAll(() => {
  mkdirSync(outputDirectory, { recursive: true })
  writeFileSync(resolve(outputDirectory, 'manifest.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    runtime: { node: process.version, platform: process.platform, arch: process.arch },
    scope: 'Actual exporter smoke test. Timings cover generation only, not API latency or concurrent throughput. Visual layout and Word compatibility require separate review.',
    artifacts,
  }, null, 2))
})

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
  it.each(['canva-minimal', 'canva-columns', 'canva-sidebar'])('exports an oversized entry for %s pagination QA', async (templateId) => {
    const resume = structuredClone(sampleResume)
    resume.sections = [{ id: 'overflow', title: '超长条目验证', columns: 1, blocks: [{
      id: 'overflow-entry', type: 'experience', company: '跨页完整性验证公司', position: '产品经理',
      startDate: '2020.01', endDate: '至今',
      contentHtml: Array.from({ length: 80 }, (_, i) => `<p>验证段落${String(i + 1).padStart(3, '0')}：负责需求分析、项目协作、方案评审与上线验收，持续跟踪用户反馈并优化产品体验。</p>`).join(''),
    }] }]
    await generateArtifact(resume, templateId, `${templateId}-oversized.docx`)
    const entry = resume.sections[0].blocks[0]
    if (entry.type === 'experience') {
      resume.sections = [{ ...resume.sections[0], blocks: [{ ...entry, contentHtml: entry.contentHtml?.replaceAll('</p><p>', '') }] }]
      await generateArtifact(resume, templateId, `${templateId}-oversized-paragraph.docx`)
    }
  })
  it.each([
    ['canva-minimal', 'canva-minimal.docx'],
    ['canva-columns', 'canva-columns.docx'],
    ['canva-sidebar', 'canva-sidebar.docx'],
  ] as const)('generates a valid %s artifact', async (templateId, fileName) => {
    await generateArtifact(sampleResume, templateId, fileName)
  })

  it.each(['simple', 'jingrui', 'chengyan', 'modern-grid'])('rejects unsupported template %s', async (id) => {
    await expect(exportResumeToDocx(sampleResume, id)).rejects.toThrow('verified Word templates only')
  })

  it.each((['canva-minimal', 'canva-columns', 'canva-sidebar'] as const).flatMap(templateId =>
    (['full', 'sparse', 'long'] as const).map(fixture => ({ templateId, fixture })),
  ))('exports $templateId / $fixture for render QA', async ({ templateId, fixture }) => {
    const resume = structuredClone(getTemplateFixture(fixture))
    resume.baseInfo = { ...resume.baseInfo, avatarUrl: sampleAvatarDataUrl, showAvatar: true }
    const theme = { ...getTemplateLabTheme('base'), primaryColor: { 'canva-minimal': '#27313b', 'canva-columns': '#334155', 'canva-sidebar': '#5279a8' }[templateId] }
    await generateArtifact(resume, templateId, `${templateId}-${fixture}.docx`, theme)
    writeFileSync(resolve(outputDirectory, `${templateId}-${fixture}.input.json`), JSON.stringify({ resume, theme }, null, 2))
  })
})
