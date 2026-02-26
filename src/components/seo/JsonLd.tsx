import React from 'react';
import { FAQ_ITEMS } from '@/lib/faq-data';

const SITE_URL = 'https://aijianli.cn';
const SITE_NAME = '智简简历';

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
      '身份定制化 AI 引导（在校生/应届生/职场人）',
      '岗位针对性 AI 内容生成',
      '模块级 AI 润色与重写',
      'AI 文本转简历（粘贴文本自动排版，支持豆包/ChatGPT/DeepSeek/Kimi/通义千问）',
      '可视化拖拽编辑',
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

  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '如何用智简简历制作一份专业简历',
    description: '使用智简简历的 AI 功能，几分钟即可生成一份专业简历并导出为高清 PDF。',
    totalTime: 'PT5M',
    tool: [{ '@type': 'HowToTool', name: '智简简历 (aijianli.cn)' }],
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: '选择求职身份',
        text: '打开智简简历，选择你的身份（在校生、应届生或职场人），AI 会根据身份自动调整引导问题。',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: '填写基本信息与目标岗位',
        text: '输入姓名、学历、目标岗位等基本信息，AI 会根据目标岗位定制简历内容。',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'AI 自动生成简历',
        text: '点击生成，AI 会自动为你生成包含工作经历、项目经历、教育背景、自我评价等完整简历内容。',
      },
      {
        '@type': 'HowToStep',
        position: 4,
        name: '可视化编辑与排版',
        text: '在可视化编辑器中直接点击编辑内容，拖拽调整模块顺序，切换模板和主题色。',
      },
      {
        '@type': 'HowToStep',
        position: 5,
        name: '导出高清 PDF',
        text: '点击导出按钮，免费生成高清 PDF 简历，无水印、无付费墙。',
      },
    ],
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
    </>
  );
};
