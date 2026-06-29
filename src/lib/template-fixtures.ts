import type { ResumeData } from '@/entities/resume/resume-data'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'

export type TemplateFixtureId = 'full' | 'sparse' | 'long' | 'rich'
export type TemplateLabThemeId = 'base' | 'color' | 'compact' | 'relaxed' | 'one-page' | 'zero-x'

export const TEMPLATE_FIXTURE_IDS: readonly TemplateFixtureId[] = ['full', 'sparse', 'long', 'rich']

export const TEMPLATE_LAB_BASE_THEME: ThemeTokens = {
  primaryColor: '#2563eb',
  textColor: '#111827',
  fontFamily: 'Inter, "Noto Sans SC", system-ui, sans-serif',
  fontSize: 15,
  lineHeight: 1.5,
  spacingScale: 1,
  pagePaddingVertical: 19,
  pagePaddingHorizontal: 15,
  titleScale: 1,
  paragraphIndent: 0,
  onePageFit: false,
}

export function getTemplateLabTheme(id: string | null | undefined): ThemeTokens {
  const themeId = normalizeThemeId(id)
  if (themeId === 'color') {
    return {
      ...TEMPLATE_LAB_BASE_THEME,
      primaryColor: '#db2777',
    }
  }
  if (themeId === 'compact') {
    return {
      ...TEMPLATE_LAB_BASE_THEME,
      fontSize: 13,
      lineHeight: 1.28,
      spacingScale: 0.72,
      pagePaddingVertical: 10,
      pagePaddingHorizontal: 9,
      titleScale: 0.9,
      paragraphIndent: 0,
    }
  }
  if (themeId === 'relaxed') {
    return {
      ...TEMPLATE_LAB_BASE_THEME,
      fontSize: 17,
      lineHeight: 1.8,
      spacingScale: 1.45,
      pagePaddingVertical: 28,
      pagePaddingHorizontal: 22,
      titleScale: 1.35,
      paragraphIndent: 2,
    }
  }
  if (themeId === 'one-page') {
    return {
      ...TEMPLATE_LAB_BASE_THEME,
      fontSize: 14,
      lineHeight: 1.35,
      spacingScale: 0.8,
      pagePaddingVertical: 12,
      pagePaddingHorizontal: 10,
      onePageFit: true,
    }
  }
  if (themeId === 'zero-x') {
    return {
      ...TEMPLATE_LAB_BASE_THEME,
      pagePaddingHorizontal: 0,
    }
  }
  return TEMPLATE_LAB_BASE_THEME
}

export function normalizeFixtureId(id: string | null | undefined): TemplateFixtureId {
  return TEMPLATE_FIXTURE_IDS.includes(id as TemplateFixtureId) ? id as TemplateFixtureId : 'full'
}

export function normalizeThemeId(id: string | null | undefined): TemplateLabThemeId {
  if (id === 'color' || id === 'compact' || id === 'relaxed' || id === 'one-page' || id === 'zero-x') return id
  return 'base'
}

export function getTemplateFixture(id: string | null | undefined): ResumeData {
  const fixtureId = normalizeFixtureId(id)
  if (fixtureId === 'sparse') return sparseFixture
  if (fixtureId === 'long') return longFixture
  if (fixtureId === 'rich') return richFixture
  return fullFixture
}

const fullFixture: ResumeData = {
  id: 'fixture-full',
  name: '林知夏',
  contactHtml: '<p>138-0000-1234 · linzhixia@example.com · 上海</p>',
  baseInfo: {
    title: '高级产品经理',
    phone: '138-0000-1234',
    email: 'linzhixia@example.com',
    gender: '女',
    age: 29,
    location: '上海',
    currentLocation: '上海浦东',
    workStartTime: '2019-07',
    showAvatar: false,
    customFields: [
      { label: 'LinkedIn', value: 'linkedin.com/in/linzhixia' },
      { label: '作品集', value: 'portfolio.example.com' },
    ],
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
      id: 'section-work',
      title: '工作经历',
      columns: 1,
      blocks: [
        {
          id: 'work-1',
          type: 'experience',
          company: '上海云启智能科技有限公司',
          position: '高级产品经理',
          industry: 'AI SaaS',
          startDate: '2022.04',
          endDate: '至今',
          contentHtml: '<ul><li>负责企业知识库产品从 0 到 1 上线，覆盖 120+ 付费客户。</li><li>推动检索链路重构，核心问答命中率从 71% 提升至 86%。</li><li>联合销售和交付团队沉淀行业方案，季度续费率提升 18%。</li></ul>',
        },
        {
          id: 'work-2',
          type: 'experience',
          company: '杭州数桥网络有限公司',
          position: '产品经理',
          industry: '数据中台',
          startDate: '2019.07',
          endDate: '2022.03',
          contentHtml: '<p>主导数据资产目录、权限申请和指标管理模块，服务 6 个大型政企项目。</p>',
        },
      ],
    },
    {
      id: 'section-project',
      title: '项目经历',
      columns: 1,
      blocks: [
        {
          id: 'project-1',
          type: 'project',
          name: '企业智能问答平台',
          role: '产品负责人',
          startDate: '2023.01',
          endDate: '2023.12',
          contentHtml: '<ul><li>设计文档解析、知识切片、权限过滤和答案溯源完整流程。</li><li>上线后客服平均响应时间从 6 分钟下降至 45 秒。</li></ul>',
        },
      ],
    },
    {
      id: 'section-education',
      title: '教育经历',
      columns: 1,
      blocks: [
        {
          id: 'edu-1',
          type: 'education',
          school: '复旦大学',
          major: '信息管理与信息系统',
          degree: '本科',
          startDate: '2015.09',
          endDate: '2019.06',
          courseHtml: '<p>核心课程：数据结构、数据库系统、用户研究、管理信息系统。</p>',
        },
      ],
    },
    {
      id: 'section-campus',
      title: '在校经历',
      columns: 1,
      blocks: [
        {
          id: 'campus-1',
          type: 'campus',
          organization: '学生创新实践中心',
          position: '项目组长',
          startDate: '2017.09',
          endDate: '2019.06',
          contentHtml: '<p>组织 20 人团队完成校园服务小程序，累计服务 3000+ 学生。</p>',
        },
      ],
    },
    {
      id: 'section-skills',
      title: '相关技能',
      columns: 2,
      blocks: [
        {
          id: 'skill-1',
          type: 'text',
          html: '<p>产品方法：PRD、用户访谈、竞品分析、A/B 测试、增长漏斗。</p>',
        },
        {
          id: 'skill-2',
          type: 'text',
          html: '<p>工具：Figma、Axure、SQL、Python、飞书多维表格。</p>',
        },
      ],
    },
    {
      id: 'section-custom',
      title: '自定义模块',
      columns: 1,
      blocks: [
        {
          id: 'custom-1',
          type: 'text',
          html: '<p>关注 AI 产品落地、知识工程和企业协作效率提升。</p>',
        },
      ],
    },
  ],
}

const sparseFixture: ResumeData = {
  id: 'fixture-sparse',
  name: '陈一',
  baseInfo: {
    email: 'chenyi@example.com',
    showAvatar: false,
  },
  jobIntentionVisible: false,
  sections: [
    {
      id: 'sparse-education',
      title: '教育经历',
      columns: 1,
      blocks: [
        {
          id: 'sparse-edu-1',
          type: 'education',
          school: '浙江大学',
          startDate: '2020.09',
          endDate: '2024.06',
        },
      ],
    },
    {
      id: 'sparse-custom',
      title: '自定义模块',
      columns: 1,
      blocks: [
        {
          id: 'sparse-text-1',
          type: 'text',
          html: '',
        },
      ],
    },
  ],
}

const longText = '负责跨部门协作、需求拆解、方案评审、上线验收和数据复盘，持续推动复杂业务场景下的产品体验优化。'

const longFixture: ResumeData = {
  ...fullFixture,
  id: 'fixture-long',
  name: '欧阳承远',
  baseInfo: {
    ...fullFixture.baseInfo,
    phone: '138-1234-5678',
    email: 'ouyangchengyuan.long.email.address@example-company-domain.com',
    customFields: [
      { label: '超长字段', value: '这是一段用于验证模板头部信息换行、压缩和对齐能力的超长自定义字段内容' },
    ],
  },
  sections: [
    ...fullFixture.sections,
    {
      id: 'long-work-extra',
      title: '实习经历',
      columns: 1,
      blocks: Array.from({ length: 4 }, (_, index) => ({
        id: `long-exp-${index + 1}`,
        type: 'experience' as const,
        company: `一家名称非常非常长的科技创新与数字化转型咨询有限公司第 ${index + 1} 事业部`,
        position: '产品运营实习生',
        industry: '企业服务',
        startDate: `202${index}.01`,
        endDate: `202${index}.12`,
        contentHtml: `<p>${longText}${longText}${longText}</p>`,
      })),
    },
  ],
}

const richFixture: ResumeData = {
  ...fullFixture,
  id: 'fixture-rich',
  name: '周明澈',
  sections: [
    {
      id: 'rich-section',
      title: '富文本验证',
      columns: 1,
      blocks: [
        {
          id: 'rich-text-1',
          type: 'text',
          html: '<p><strong>加粗重点：</strong>主导新版简历编辑器改版，覆盖 PC 与移动端。</p><ul><li>列表项一：支持模块化编辑。</li><li>列表项二：支持富文本换行<br>第二行内容。</li></ul><p><a href="https://example.com">链接文本</a> 与 <em>强调文本</em> 应正常渲染。</p>',
        },
        {
          id: 'rich-project-1',
          type: 'project',
          name: '富文本项目描述',
          role: '前端负责人',
          startDate: '2024.01',
          endDate: '2024.09',
          contentHtml: '<ol><li>完成模板渲染稳定性治理。</li><li>沉淀本地验收工具。</li></ol>',
        },
      ],
    },
  ],
}
