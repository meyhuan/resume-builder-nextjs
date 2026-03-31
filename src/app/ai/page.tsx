import type { Metadata } from 'next';
import { ResumeWizard } from "@/components/ai/resume-wizard";
import { SITE_NAME, SITE_URL } from '@/lib/site-config';

const PAGE_TITLE: string = `AI Resume Generator | ${SITE_NAME}`;
const PAGE_DESCRIPTION: string = 'Generate a professional, ATS-friendly resume with AI Resume Pass. Build your resume faster with AI writing help, structured resume sections, and free PDF export.';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: `${SITE_URL}/ai`,
  },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: `${SITE_URL}/ai`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: ['/og-image.png'],
  },
};

export default function AiResumePage() {
  return <ResumeWizard />;
}
