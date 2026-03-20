import React from 'react';
import { FAQ_ITEMS } from '@/lib/faq-data';

const SITE_URL = 'https://airesumepass.com';
const SITE_NAME = 'AI Resume Pass';

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
    description: 'Free AI resume builder — intelligent generation, visual editing, multi-format export. Built by an indie developer, free forever.',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free forever, all features unlimited',
    },
    featureList: [
      'AI-powered resume generation',
      'Identity-based AI guidance (Student / Graduate / Professional)',
      'Job-targeted AI content generation',
      'Section-level AI polishing and rewriting',
      'AI text-to-resume (paste text for auto-formatting, supports ChatGPT/Claude/DeepSeek)',
      'Visual drag-and-drop editing',
      'JD smart matching',
      'ATS format optimization',
      'Multi-language resume generation',
      'High-quality PDF export',
      'PNG image export',
      'Cross-device data sync',
    ],
    inLanguage: 'en-US',
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
    logo: `${SITE_URL}/logo.png`,
    description: 'AI Resume Pass - Free AI resume builder, built by an indie developer.',
    sameAs: [],
  };

  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to create a professional resume with AI Resume Pass',
    description: 'Use AI Resume Pass to generate a professional resume in minutes and export it as a high-quality PDF.',
    totalTime: 'PT5M',
    tool: [{ '@type': 'HowToTool', name: 'AI Resume Pass (airesumepass.com)' }],
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Choose your career stage',
        text: 'Open AI Resume Pass and select your identity (Student, Graduate, or Professional). The AI will adjust its guidance accordingly.',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Enter basic info and target position',
        text: 'Enter your name, education, target position, and other basic info. The AI will tailor the resume content to your target role.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'AI auto-generates your resume',
        text: 'Click generate and the AI will automatically create a complete resume with work experience, projects, education, and self-evaluation.',
      },
      {
        '@type': 'HowToStep',
        position: 4,
        name: 'Visual editing and formatting',
        text: 'Click to edit content directly in the visual editor, drag to reorder sections, and switch templates and theme colors.',
      },
      {
        '@type': 'HowToStep',
        position: 5,
        name: 'Export high-quality PDF',
        text: 'Click the export button to generate a high-quality PDF resume for free — no watermarks, no paywalls.',
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
