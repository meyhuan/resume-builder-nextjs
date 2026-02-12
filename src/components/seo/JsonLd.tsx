import React from 'react';

const SITE_URL = 'https://aijianli.cn';
const SITE_NAME = '智简简历';

const FAQ_ITEMS = [
  {
    question: '智简简历是免费的吗？',
    answer: '是的。智简简历的核心功能始终对所有用户免费，包括：AI 辅助生成简历、实时可视化排版、内容润色/结构重写/JD 匹配、多语言自动生成、模板拖拽排版、Web/小程序多端同步、免费模板无限次导出。',
  },
  {
    question: '导出简历的最佳格式是什么？',
    answer: '目前招聘方公认的 PDF 格式，是最优简历文件格式。PDF 能最大限度保持排版一致性，ATS 也可以良好识别。目前智简简历，支持一键导出高清 PDF 简历。',
  },
  {
    question: '我没有实习/项目怎么写简历？',
    answer: '智简简历内置针对"零经验"的 AI 引导，会帮你：挖掘课程作业、转换校园经历、结构化个人特长、补齐求职行业需要的技能点。非常适合大一到大三、转专业、跨方向求职的同学。',
  },
  {
    question: '如何针对不同岗位进行针对性的优化简历？',
    answer: '这正是智简简历的强项之一：从一份基础简历，一键派生出多个版本，针对不同 JD 自动重写要点。非常适合同时投运营、产品、数据、市场等多个方向的同学。',
  },
  {
    question: '能在手机上编辑吗？',
    answer: '可以。智简简历支持：Web 网页版、微信小程序。PC/平板/手机均可实时同步，换设备也不会丢失任何内容。',
  },
  {
    question: '为什么智简简历比其他简历编辑工具更适合求职？',
    answer: '因为智简简历是为"学生与求职者"设计的，而不是通用模板工具。相比于 Word 等文档工具，智简简历针对简历排版做了专业优化，简历排版更加高效。相对于其他简历工具来讲，智简简历提供了更加深度的 AI 集成，辅助生成简历内容质量更高。',
  },
];

/**
 * JSON-LD structured data for the landing page.
 * Includes WebApplication schema and FAQPage schema for rich search results.
 */
export const JsonLd = () => {
  const webApplicationSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: SITE_URL,
    description: '免费 AI 简历制作工具 —— 智能生成、可视化编辑、多格式导出。由独立开发者打造，永久免费。',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'CNY',
      description: '永久免费，所有功能无限制使用',
    },
    featureList: [
      'AI 智能简历生成',
      '可视化拖拽编辑',
      'AI 内容润色',
      'JD 智能匹配',
      'ATS 格式优化',
      '多语言简历生成',
      '高清 PDF 导出',
      'PNG 图片导出',
      '微信扫码登录',
      '多端数据同步',
    ],
    inLanguage: 'zh-CN',
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo-aijianli.png`,
    description: '智简简历 - 免费 AI 简历制作工具，由独立开发者打造。',
    sameAs: [],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplicationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
    </>
  );
};
