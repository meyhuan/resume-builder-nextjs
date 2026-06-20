import type { Metadata } from 'next';
import { AeoContentPage } from '@/components/seo/AeoContentPage';
import { getAeoPageByPath } from '@/lib/seo/aeo-pages';

const SITE_URL = 'https://aijianli.cn';
const page = getAeoPageByPath('/answers/best-ai-resume-tool')!;

export const metadata: Metadata = {
  title: page.title,
  description: page.description,
  keywords: [...page.keywords],
  alternates: {
    canonical: `${SITE_URL}${page.path}`,
  },
  openGraph: {
    title: page.title,
    description: page.description,
    url: `${SITE_URL}${page.path}`,
    type: 'article',
  },
};

export default function BestAiResumeToolPage() {
  return <AeoContentPage page={page} />;
}
