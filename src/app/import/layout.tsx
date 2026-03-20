import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'AI Text to Resume - Paste Text to Generate Professional Resume | AI Resume Pass',
  description:
    'Paste any resume text content, AI automatically parses the structure and applies professional templates, one-click free export to high-quality PDF. Supports content from ChatGPT, DeepSeek, Claude, and other AI tools.',
  keywords: [
    'AI resume formatter', 'resume formatting tool', 'text to resume', 'resume formatter',
    'ChatGPT resume', 'DeepSeek resume', 'AI resume to PDF', 'free resume formatter',
    'online resume builder', 'one-click resume',
  ],
};

export default function ImportLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
