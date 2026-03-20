import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'AI Resume Generator - Smart Resume Builder | AI Resume Pass',
  description:
    'Free AI resume generator: Automatically tailor resume content based on your career stage (Student, Graduate, Professional) and target position. Generate professional resumes with zero experience, multiple templates, and one-click PDF export.',
  keywords: [
    'AI resume generator', 'free resume builder', 'student resume', 'graduate resume',
    'professional resume', 'AI resume writer', 'resume builder', 'smart resume',
    'job application resume', 'resume generator', 'free AI resume',
  ],
};

export default function AiLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
