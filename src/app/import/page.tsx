import type { Metadata } from 'next';
import { ImportResumePage } from '@/components/import/import-resume-page';
import { SITE_NAME, SITE_URL } from '@/lib/site-config';

const PAGE_TITLE: string = `AI Text to Resume | ${SITE_NAME}`;
const PAGE_DESCRIPTION: string = 'Turn pasted resume text into a polished, ATS-friendly resume with AI Resume Pass. Import content from ChatGPT, Claude, DeepSeek, and other tools, then export a clean PDF for free.';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: `${SITE_URL}/import`,
  },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: `${SITE_URL}/import`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: ['/og-image.png'],
  },
};

export default function ImportPage(): React.ReactElement {
  return <ImportResumePage />;
}
