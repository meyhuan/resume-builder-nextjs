import type { Metadata } from 'next';
import { Suspense } from 'react';
import ResumeEditor from '@/components/ResumeEditor';

export const metadata: Metadata = {
  title: 'Create New Resume - Blank Resume Editor',
  description: 'Build your professional resume from scratch. Preview and edit without logging in. Supports multiple templates and AI assistance.',
  robots: { index: false, follow: false },
};

/**
 * Guest-friendly editor page — renders ResumeEditor with default (blank)
 * data, no authentication required. Login is prompted only when the user
 * attempts to save.
 */
export default function NewEditorPage(): React.ReactElement {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-50 text-slate-400">Loading editor...</div>}>
      <ResumeEditor />
    </Suspense>
  );
}
